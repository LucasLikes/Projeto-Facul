import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api-response";
import { getPanelContext } from "@/lib/panel-context";
import { clockTimeSchema } from "@/lib/validation";

const slotSchema = z.object({
  id: z.string().uuid().optional(),
  court_id: z.string().uuid(),
  dia_semana: z.number().int().min(0).max(6),
  hora_inicio: clockTimeSchema,
  hora_fim: clockTimeSchema,
  preco_centavos: z.number().int().min(0).max(10_000_000).nullable().optional(),
  ativo: z.boolean().default(true),
}).refine((value) => value.hora_inicio < value.hora_fim, { path: ["hora_fim"], message: "Horário final inválido." });

export async function PUT(request: Request) {
  const context = await getPanelContext();
  if (!context) return apiError(401, "unauthorized", "Entre no painel para continuar.");
  const body = slotSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return apiError(400, "invalid_request", "Dados do turno inválidos.");
  if (!context.courts.some((court) => court.id === body.data.court_id)) return apiError(404, "not_found", "Quadra não encontrada nesta arena.");
  const { id, ...fields } = body.data;
  if (id) {
    const { data, error } = await context.admin.from("time_slots").update(fields).eq("id", id).eq("court_id", fields.court_id).select("id").maybeSingle();
    if (error) return apiError(409, "slot_update_failed", "Este turno já existe ou não pôde ser salvo.");
    if (!data) return apiError(404, "not_found", "Turno não encontrado.");
    return NextResponse.json({ id: data.id, atualizado: true });
  }
  const { data, error } = await context.admin.from("time_slots").upsert(fields, { onConflict: "court_id,dia_semana,hora_inicio,hora_fim" }).select("id").single();
  if (error) return apiError(409, "slot_create_failed", "Este turno já existe ou não pôde ser salvo.");
  return NextResponse.json({ id: data.id, atualizado: false }, { status: 201 });
}

export async function DELETE(request: Request) {
  const context = await getPanelContext();
  if (!context) return apiError(401, "unauthorized", "Entre no painel para continuar.");
  const query = z.object({ id: z.string().uuid() }).safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) return apiError(400, "invalid_request", "Identificador do turno inválido.");
  const { data, error } = await context.admin.from("time_slots").update({ ativo: false }).eq("id", query.data.id)
    .in("court_id", context.courts.map((court) => court.id)).select("id").maybeSingle();
  if (error) return apiError(503, "slot_update_failed", "Não foi possível desativar o turno.");
  if (!data) return apiError(404, "not_found", "Turno não encontrado nesta arena.");
  return NextResponse.json({ id: data.id, ativo: false });
}