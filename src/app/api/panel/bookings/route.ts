import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api-response";
import { getPanelContext } from "@/lib/panel-context";
import { saoPauloDateString } from "@/lib/time";
import { clockTimeSchema, localDateSchema } from "@/lib/validation";

const createSchema = z.discriminatedUnion("tipo", [
  z.object({
    tipo: z.literal("manual"), court_id: z.string().uuid(), data: localDateSchema,
    hora_inicio: clockTimeSchema, hora_fim: clockTimeSchema, nome_cliente: z.string().trim().min(2).max(100),
    whatsapp: z.string().trim().min(10).max(20).regex(/^[+\d\s()-]+$/),
  }),
  z.object({
    tipo: z.literal("bloqueio"), court_id: z.string().uuid(), data: localDateSchema,
    hora_inicio: clockTimeSchema, hora_fim: clockTimeSchema, motivo: z.string().trim().min(2).max(100),
  }),
]).refine((value) => value.hora_inicio < value.hora_fim, { path: ["hora_fim"], message: "Horário final inválido." });
const updateSchema = z.object({
  id: z.string().uuid(), status: z.enum(["confirmada", "cancelada"]),
});

export async function POST(request: Request) {
  const context = await getPanelContext();
  if (!context) return apiError(401, "unauthorized", "Entre no painel para continuar.");
  const body = createSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return apiError(400, "invalid_request", "Dados do horário inválidos.");
  if (body.data.data < saoPauloDateString()) return apiError(400, "invalid_date", "Não é possível criar um horário no passado.");
  const court = context.courts.find((item) => item.id === body.data.court_id && item.ativa);
  if (!court) return apiError(404, "not_found", "Quadra não encontrada nesta arena.");

  const row = body.data.tipo === "manual" ? {
    court_id: body.data.court_id, data: body.data.data, hora_inicio: body.data.hora_inicio,
    hora_fim: body.data.hora_fim, nome_cliente: body.data.nome_cliente, whatsapp: body.data.whatsapp,
    status: "confirmada", origem: "painel",
  } : {
    court_id: body.data.court_id, data: body.data.data, hora_inicio: body.data.hora_inicio,
    hora_fim: body.data.hora_fim, nome_cliente: `Bloqueio · ${body.data.motivo}`, whatsapp: "",
    status: "bloqueada", origem: "painel",
  };
  const { data, error } = await context.admin.from("bookings").insert(row).select("id").single();
  if (error) return apiError(error.code === "23P01" ? 409 : 503, "booking_conflict", "O horário já está ocupado ou não pôde ser salvo.");
  return NextResponse.json({ id: data.id }, { status: 201 });
}

export async function PATCH(request: Request) {
  const context = await getPanelContext();
  if (!context) return apiError(401, "unauthorized", "Entre no painel para continuar.");
  const body = updateSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return apiError(400, "invalid_request", "Atualização inválida.");
  const { data, error } = await context.admin.from("bookings").update({ status: body.data.status })
    .eq("id", body.data.id).in("court_id", context.courts.map((court) => court.id))
    .in("status", ["pendente", "confirmada"]).select("id").maybeSingle();
  if (error) return apiError(error.code === "23P01" ? 409 : 503, "booking_update_failed", "Não foi possível atualizar a reserva.");
  if (!data) return apiError(404, "not_found", "Reserva não encontrada nesta arena.");
  return NextResponse.json({ id: data.id, status: body.data.status });
}