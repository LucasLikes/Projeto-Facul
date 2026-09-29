import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { authorizeDevice } from "@/lib/ingest-auth";
import { getR2Bucket, getR2Client } from "@/lib/r2";
import { ingestConfirmSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authorization = await authorizeDevice(request);
  if (!authorization.ok) return authorization.response;

  const body = await request.json().catch(() => null);
  const parsed = ingestConfirmSchema.safeParse(body);
  if (!parsed.success) return apiError(400, "invalid_request", "Identificador do replay inválido.");

  const { admin, device } = authorization;
  const { data: replay, error } = await admin
    .from("replays")
    .select("id, video_key, thumb_key, tamanho_bytes, visivel")
    .eq("id", parsed.data.replay_id)
    .eq("device_id", device.id)
    .maybeSingle();

  if (error) return apiError(503, "database_unavailable", "Não foi possível consultar o replay.");
  if (!replay) return apiError(404, "not_found", "Replay não encontrado para este dispositivo.");
  if (replay.visivel) return NextResponse.json({ replay_id: replay.id, visivel: true, idempotent: true });

  const s3 = getR2Client();
  const bucket = getR2Bucket();
  if (!s3 || !bucket) return apiError(503, "storage_unavailable", "Armazenamento de vídeos indisponível.");

  try {
    const [video, thumbnail] = await Promise.all([
      s3.send(new HeadObjectCommand({ Bucket: bucket, Key: replay.video_key })),
      s3.send(new HeadObjectCommand({ Bucket: bucket, Key: replay.thumb_key })),
    ]);
    if (video.ContentLength !== replay.tamanho_bytes || (video.ContentLength ?? 0) <= 0) {
      return apiError(409, "upload_incomplete", "O tamanho do vídeo não corresponde ao informado.");
    }
    if (!thumbnail.ContentLength || thumbnail.ContentLength > 10_000_000) {
      return apiError(409, "invalid_thumbnail", "Thumbnail ausente ou acima do limite permitido.");
    }
  } catch {
    return apiError(409, "upload_incomplete", "Vídeo ou thumbnail ainda não foram enviados.");
  }

  const { error: updateError } = await admin
    .from("replays")
    .update({ visivel: true })
    .eq("id", replay.id)
    .eq("device_id", device.id);
  if (updateError) return apiError(503, "database_unavailable", "O upload foi validado, mas não foi possível publicar o replay.");

  return NextResponse.json({ replay_id: replay.id, visivel: true, idempotent: false });
}