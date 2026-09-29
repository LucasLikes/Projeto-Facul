import { randomUUID } from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { getRetentionDays } from "@/lib/env";
import { authorizeDevice } from "@/lib/ingest-auth";
import { getR2Bucket, getR2Client } from "@/lib/r2";
import { ingestPresignSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authorization = await authorizeDevice(request);
  if (!authorization.ok) return authorization.response;

  const body = await request.json().catch(() => null);
  const parsed = ingestPresignSchema.safeParse(body);
  if (!parsed.success) return apiError(400, "invalid_request", "Dados do replay inválidos.");

  const s3 = getR2Client();
  const bucket = getR2Bucket();
  if (!s3 || !bucket) return apiError(503, "storage_unavailable", "Armazenamento de vídeos indisponível.");

  const capturedAt = new Date(parsed.data.capturado_em).toISOString();
  const { admin, device } = authorization;
  let { data: replay, error } = await admin
    .from("replays")
    .select("id, video_key, thumb_key, tamanho_bytes, duracao_s, visivel")
    .eq("device_id", device.id)
    .eq("capturado_em", capturedAt)
    .maybeSingle();

  if (error) return apiError(503, "database_unavailable", "Não foi possível consultar o replay.");

  if (replay && (replay.tamanho_bytes !== parsed.data.tamanho_bytes || replay.duracao_s !== parsed.data.duracao_s)) {
    return apiError(409, "idempotency_conflict", "Já existe um replay com este instante e dados diferentes.");
  }

  if (!replay) {
    const { data: court, error: courtError } = await admin.from("courts").select("arenas(retention_days)").eq("id", device.court_id).maybeSingle();
    if (courtError || !court) return apiError(503, "database_unavailable", "Não foi possível consultar a política de retenção da arena.");
    const arena = court.arenas as unknown as { retention_days: number | null } | null;
    const replayId = randomUUID();
    const retentionDays = arena?.retention_days ?? getRetentionDays();
    const row = {
      id: replayId,
      court_id: device.court_id,
      device_id: device.id,
      capturado_em: capturedAt,
      duracao_s: parsed.data.duracao_s,
      video_key: `replays/${device.court_id}/${replayId}.mp4`,
      thumb_key: `thumbnails/${device.court_id}/${replayId}.jpg`,
      tamanho_bytes: parsed.data.tamanho_bytes,
      visivel: false,
      expira_em: new Date(Date.now() + retentionDays * 86_400_000).toISOString(),
    };
    const inserted = await admin.from("replays").insert(row).select("id, video_key, thumb_key, tamanho_bytes, duracao_s, visivel").single();
    replay = inserted.data;
    error = inserted.error;

    if (error) {
      const duplicate = await admin
        .from("replays")
        .select("id, video_key, thumb_key, tamanho_bytes, duracao_s, visivel")
        .eq("device_id", device.id)
        .eq("capturado_em", capturedAt)
        .maybeSingle();
      if (duplicate.error || !duplicate.data) return apiError(503, "database_unavailable", "Não foi possível criar o replay.");
      replay = duplicate.data;
      if (replay.tamanho_bytes !== parsed.data.tamanho_bytes || replay.duracao_s !== parsed.data.duracao_s) {
        return apiError(409, "idempotency_conflict", "Já existe um replay com este instante e dados diferentes.");
      }
    }
  }

  if (!replay) return apiError(500, "replay_creation_failed", "Não foi possível preparar o replay.");
  if (replay.visivel) {
    return NextResponse.json({ replay_id: replay.id, visivel: true, idempotent: true });
  }

  try {
    const [videoUrl, thumbUrl] = await Promise.all([
      getSignedUrl(s3, new PutObjectCommand({
        Bucket: bucket,
        Key: replay.video_key,
        ContentType: parsed.data.video_content_type,
        ContentLength: replay.tamanho_bytes,
      }), { expiresIn: 300 }),
      getSignedUrl(s3, new PutObjectCommand({
        Bucket: bucket,
        Key: replay.thumb_key,
        ContentType: parsed.data.thumb_content_type,
      }), { expiresIn: 300 }),
    ]);
    return NextResponse.json({
      replay_id: replay.id,
      uploads: { video: { url: videoUrl, key: replay.video_key }, thumbnail: { url: thumbUrl, key: replay.thumb_key } },
      expires_in: 300,
    });
  } catch {
    return apiError(503, "storage_unavailable", "Não foi possível gerar as URLs de upload.");
  }
}