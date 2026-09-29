import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { z } from "zod";

const paramsSchema = z.object({ id: z.string().uuid() });
const bodySchema = z.object({ action: z.enum(["view", "share"]) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = paramsSchema.safeParse(await context.params);
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!params.success || !body.success) return apiError(400, "invalid_request", "Métrica inválida.");
  const admin = getAdminSupabase();
  if (!admin) return NextResponse.json({ registrado: false });
  const { error } = await admin.rpc("increment_replay_counter", { p_replay_id: params.data.id, p_counter: body.data.action });
  if (error) return apiError(503, "database_unavailable", "Não foi possível registrar a métrica.");
  return NextResponse.json({ registrado: true });
}