import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { addLocalDays, isFutureLocalSlot, saoPauloDateString, weekdayForLocalDate } from "@/lib/time";
import { bookingSchema } from "@/lib/validation";
import { z } from "zod";

const querySchema = z.object({ arena: z.string().regex(/^[a-z0-9-]{1,80}$/), court: z.string().regex(/^[a-z0-9-]{1,80}$/) });

export async function POST(request: Request) {
  const query = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  const body = await request.json().catch(() => null);
  const parsed = bookingSchema.safeParse(body);
  if (!query.success || !parsed.success) return apiError(400, "invalid_request", "Dados da reserva inválidos.");

  const today = saoPauloDateString();
  const lastDate = addLocalDays(today, 13);
  if (parsed.data.data < today || parsed.data.data > lastDate) return apiError(400, "invalid_date", "Escolha uma data entre hoje e os próximos 13 dias.");
  if (!isFutureLocalSlot(parsed.data.data, parsed.data.hora_inicio, today)) return apiError(409, "slot_unavailable", "Este horário já começou ou passou.");
  const admin = getAdminSupabase();
  if (!admin) return apiError(503, "service_unavailable", "Reservas indisponíveis enquanto o Supabase não estiver configurado.");

  const { data: arena } = await admin.from("arenas").select("id,telefone_whatsapp").eq("slug", query.data.arena).maybeSingle();
  if (!arena) return apiError(404, "not_found", "Arena não encontrada.");
  const { data: court } = await admin.from("courts").select("id,nome").eq("arena_id", arena.id).eq("slug", query.data.court).eq("ativa", true).maybeSingle();
  if (!court || court.id !== parsed.data.court_id) return apiError(404, "not_found", "Quadra não encontrada.");

  const { data: slot } = await admin.from("time_slots")
    .select("id")
    .eq("court_id", court.id)
    .eq("dia_semana", weekdayForLocalDate(parsed.data.data))
    .eq("hora_inicio", parsed.data.hora_inicio)
    .eq("hora_fim", parsed.data.hora_fim)
    .eq("ativo", true)
    .maybeSingle();
  if (!slot) return apiError(409, "slot_unavailable", "Este turno não está mais disponível.");

  const { data: existing, error: existingError } = await admin.from("bookings")
    .select("id")
    .eq("court_id", court.id)
    .eq("data", parsed.data.data)
    .neq("status", "cancelada")
    .lt("hora_inicio", parsed.data.hora_fim)
    .gt("hora_fim", parsed.data.hora_inicio)
    .limit(1);
  if (existingError) return apiError(503, "database_unavailable", "Não foi possível verificar a disponibilidade.");
  if (existing?.length) return apiError(409, "slot_unavailable", "Este turno já recebeu uma solicitação ou reserva.");

  const { data: booking, error } = await admin.from("bookings").insert({
    ...parsed.data,
    status: "pendente",
    origem: "publica",
  }).select("id").single();
  if (error) return apiError(error.code === "23P01" ? 409 : 503, "booking_failed", "Não foi possível registrar esta reserva.");

  return NextResponse.json({
    booking_id: booking.id,
    status: "pendente",
    arena_whatsapp: arena.telefone_whatsapp,
    quadra: court.nome,
  }, { status: 201 });
}