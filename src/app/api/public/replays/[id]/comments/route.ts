import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api-response";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { replayCommentSchema } from "@/lib/validation";

const paramsSchema = z.object({ id: z.string().uuid() });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = paramsSchema.safeParse(await context.params);
  const body = replayCommentSchema.safeParse(await request.json().catch(() => null));
  if (!params.success || !body.success) return apiError(400, "invalid_request", "Confira o apelido e o comentário.");

  const admin = getAdminSupabase();
  if (!admin) return apiError(503, "comments_unavailable", "Comentários persistentes precisam do Supabase conectado.");
  const { data: replay, error: replayError } = await admin.from("replays").select("id")
    .eq("id", params.data.id).eq("visivel", true).gt("expira_em", new Date().toISOString()).maybeSingle();
  if (replayError) return apiError(503, "database_unavailable", "Não foi possível verificar este replay.");
  if (!replay) return apiError(404, "not_found", "Replay não encontrado ou expirado.");

  const forwardedFor = request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-forwarded-for") ?? "unknown";
  const clientIp = forwardedFor.split(",")[0].trim().slice(0, 64) || "unknown";
  const minute = Math.floor(Date.now() / 60_000);
  const windowHash = createHash("sha256").update(`${clientIp}:${minute}`).digest("hex");
  const { data: allowed, error: limitError } = await admin.rpc("consume_replay_comment_rate_limit", {
    p_janela_hash: windowHash,
    p_limit: 5,
  });
  if (limitError) return apiError(503, "rate_limit_unavailable", "Não foi possível validar o limite de comentários.");
  if (allowed !== true) return apiError(429, "rate_limited", "Aguarde um minuto antes de comentar novamente.");

  const { data: comment, error } = await admin.from("replay_comments").insert({
    replay_id: replay.id,
    apelido: body.data.apelido,
    texto: body.data.texto,
  }).select("id,replay_id,apelido,texto,criado_em").single();
  if (error) return apiError(503, "comment_create_failed", "Não foi possível publicar o comentário.");
  return NextResponse.json({ comment }, { status: 201 });
}