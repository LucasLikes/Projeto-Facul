import { GetObjectCommand } from "@aws-sdk/client-s3";
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
  if (!admin || !s3 || !bucket) return apiError(404, "not_found", "Thumbnail indisponível.");
  const { data: replay, error } = await admin.from("replays").select("thumb_key,video_key")
    .eq("id", params.data.id).eq("visivel", true).gt("expira_em", new Date().toISOString()).maybeSingle();
  if (error || !replay) return apiError(404, "not_found", "Replay não encontrado ou expirado.");
  if (replay.video_key.startsWith("demo/")) return NextResponse.redirect(new URL("/thumb-placeholder.svg", request.url));
  try {
    const object = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: replay.thumb_key }));
    if (!object.Body) return apiError(404, "not_found", "Thumbnail indisponível.");
    return new Response(object.Body.transformToWebStream(), {
      headers: {
        "Content-Type": object.ContentType ?? "image/jpeg",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.redirect(new URL("/thumb-placeholder.svg", request.url));
  }
}