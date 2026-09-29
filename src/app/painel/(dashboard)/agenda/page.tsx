import { notFound } from "next/navigation";
import { AgendaManager } from "@/components/AgendaManager";
import { getPanelContext } from "@/lib/panel-context";
import { addLocalDays, saoPauloDateString, weekdayForLocalDate } from "@/lib/time";
import { localDateSchema } from "@/lib/validation";

type AgendaBooking = {
  id: string; court_id: string; data: string; hora_inicio: string; hora_fim: string;
  nome_cliente: string; whatsapp: string; status: "pendente" | "confirmada" | "cancelada" | "bloqueada"; origem: string;
};

function weekStart(date: string) {
  return addLocalDays(date, -((weekdayForLocalDate(date) + 6) % 7));
}

export const dynamic = "force-dynamic";

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ semana?: string }> }) {
  const context = await getPanelContext();
  if (!context) notFound();
  const query = await searchParams;
  const parsedDate = localDateSchema.safeParse(query.semana);
  const startDate = weekStart(parsedDate.success ? parsedDate.data : saoPauloDateString());
  const dates = Array.from({ length: 7 }, (_, index) => addLocalDays(startDate, index));
  const courtIds = context.courts.map((court) => court.id);
  let bookings: AgendaBooking[] = [];
  let slots: { id: string; court_id: string; dia_semana: number; hora_inicio: string; hora_fim: string; preco_centavos: number | null }[] = [];
  if (courtIds.length) {
    const [bookingResult, slotResult] = await Promise.all([
      context.admin.from("bookings").select("id,court_id,data,hora_inicio,hora_fim,nome_cliente,whatsapp,status,origem")
        .in("court_id", courtIds).gte("data", dates[0]).lte("data", dates[6]).neq("status", "cancelada").order("hora_inicio"),
      context.admin.from("time_slots").select("id,court_id,dia_semana,hora_inicio,hora_fim,preco_centavos")
        .in("court_id", courtIds).eq("ativo", true).order("dia_semana").order("hora_inicio"),
    ]);
    bookings = (bookingResult.data ?? []) as unknown as AgendaBooking[];
    slots = slotResult.data ?? [];
  }

  return <AgendaManager courts={context.courts} dates={dates} startDate={startDate} bookings={bookings} slots={slots} />;
}