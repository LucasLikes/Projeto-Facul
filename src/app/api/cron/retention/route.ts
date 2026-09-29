import { timingSafeEqual } from "node:crypto";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { getEnv } from "@/lib/env";
import { getR2Bucket, getR2Client } from "@/lib/r2";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { z } from "zod";

const cronBodySchema = z.object({}).strict();
const cronQuerySchema = z.object({}).strict();

export const runtime = "nodejs";

async function runRetention(request: Request, validateBody: boolean) {
  const expected = getEnv("CRON_SECRET");
  const received = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected) return apiError(503, "cron_unconfigured", "A rotina de retenção não está configurada.");
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) {
    return apiError(401, "unauthorized", "Credencial inválida.");
  }

  if (validateBody) {
    const body = await request.json().catch(() => null);
    if (!cronBodySchema.safeParse(body).success) return apiError(400, "invalid_request", "Corpo inválido.");
  } else {
    const query = Object.fromEntries(new URL(request.url).searchParams);
    if (!cronQuerySchema.safeParse(query).success) return apiError(400, "invalid_request", "Parâmetros inválidos.");
  }

  const admin = getAdminSupabase();
  const s3 = getR2Client();
  const bucket = getR2Bucket();
  if (!admin || !s3 || !bucket) return apiError(503, "service_unavailable", "Banco ou armazenamento indisponível.");

  const { data: expired, error } = await admin
    .from("replays")
    .select("id, video_key, thumb_key")
    .lte("expira_em", new Date().toISOString())
    .limit(100);
  if (error) return apiError(503, "database_unavailable", "Não foi possível listar os replays expirados.");

  const results = await Promise.all((expired ?? []).map(async (replay) => {
    try {
      await Promise.all([
        s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: replay.video_key })),
        s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: replay.thumb_key })),
      ]);
      return replay.id;
    } catch {
      return null;
    }
  }));
  const deletedIds = results.filter((id): id is string => id !== null);
  if (deletedIds.length) {
    const { error: deleteError } = await admin.from("replays").delete().in("id", deletedIds);
    if (deleteError) return apiError(503, "database_unavailable", "Objetos removidos, mas os registros ainda não puderam ser apagados.");
  }

  return NextResponse.json({ removidos: deletedIds.length, pendentes: (expired?.length ?? 0) - deletedIds.length });
}

export async function GET(request: Request) {
  return runRetention(request, false);
}

export async function POST(request: Request) {
  return runRetention(request, true);
}