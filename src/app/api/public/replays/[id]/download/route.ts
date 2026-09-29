import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getR2Bucket, getR2Client } from "@/lib/r2";
import { z } from "zod";

const paramsSchema = z.object({ id: z.string().uuid() });

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = paramsSchema.safeParse(await context.params);
  if (!params.success) return apiError(400, "invalid_request", "Replay inválido.");
  const admin = getAdminSupabase();
  const s3 = getR2Client();
  const bucket = getR2Bucket();
  if (!admin || !s3 || !bucket) return apiError(503, "service_unavailable", "Download indisponível.");
  const { data: replay, error } = await admin.from("replays").select("video_key")
    .eq("id", params.data.id).eq("visivel", true).gt("expira_em", new Date().toISOString()).maybeSingle();
  if (error || !replay) return apiError(404, "not_found", "Replay não encontrado ou expirado.");
  try {
    const url = await getSignedUrl(s3, new GetObjectCommand({
      Bucket: bucket,
      Key: replay.video_key,
      ResponseContentDisposition: `attachment; filename="fez-bonito-${params.data.id}.mp4"`,
    }), { expiresIn: 300 });
    return NextResponse.redirect(url, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return apiError(503, "storage_unavailable", "Não foi possível preparar o download.");
  }
}