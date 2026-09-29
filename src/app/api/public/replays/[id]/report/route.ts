import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { reportSchema } from "@/lib/validation";
import { z } from "zod";

const paramsSchema = z.object({ id: z.string().uuid() });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = paramsSchema.safeParse(await context.params);
  const body = await request.json().catch(() => null);
  const parsed = reportSchema.safeParse(body);
  if (!params.success || !parsed.success) return apiError(400, "invalid_request", "Denúncia inválida.");

  const admin = getAdminSupabase();
  if (!admin) return apiError(503, "service_unavailable", "Denúncias indisponíveis enquanto o Supabase não estiver configurado.");
  const { data: replay, error: lookupError } = await admin.from("replays").select("id")
    .eq("id", params.data.id).eq("visivel", true).gt("expira_em", new Date().toISOString()).maybeSingle();
  if (lookupError) return apiError(503, "database_unavailable", "Não foi possível localizar o replay.");
  if (!replay) return apiError(404, "not_found", "Replay não encontrado ou expirado.");

  const { error } = await admin.from("reports").insert({ replay_id: replay.id, motivo: parsed.data.motivo });
  if (error) return apiError(503, "database_unavailable", "Não foi possível registrar a denúncia.");
  return NextResponse.json({ recebido: true }, { status: 201 });
}