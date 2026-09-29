import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ArenaHeader } from "@/components/ArenaHeader";
import { ReservationForm } from "@/components/ReservationForm";
import { getPublicBookingData } from "@/lib/public-data";
import { saoPauloDateString } from "@/lib/time";
import { z } from "zod";

const paramsSchema = z.object({ arena: z.string().regex(/^[a-z0-9-]{1,80}$/), quadra: z.string().regex(/^[a-z0-9-]{1,80}$/) });
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timeSchema = z.string().regex(/^\d{2}:\d{2}$/);

export const dynamic = "force-dynamic";

export default async function ReservationPage({
  params,
  searchParams,
}: {
  params: Promise<{ arena: string; quadra: string }>;
  searchParams: Promise<{ data?: string; hora?: string }>;
}) {
  const route = paramsSchema.safeParse(await params);
  if (!route.success) notFound();
  const query = await searchParams;
  const selectedDate = dateSchema.safeParse(query.data);
  const selectedTime = timeSchema.safeParse(query.hora);
  const booking = await getPublicBookingData(route.data.arena, route.data.quadra);
  if (!booking) notFound();

  return (
    <main className="public-shell booking-shell" style={{ "--brand": booking.arena.cor_primaria } as React.CSSProperties}>
      <ArenaHeader arena={booking.arena} court={booking.court} />
      <Link className="back-link" href={`/${booking.arena.slug}/${booking.court.slug}`}><ArrowLeft size={17} />Voltar para a quadra</Link>
      <section className="booking-intro">
        <span className="section-eyebrow">AGENDA · {booking.court.nome.toUpperCase()}</span>
        <h1>Reserve sua próxima partida.</h1>
        <p>Escolha um turno livre. A arena confirma seu pedido pelo WhatsApp.</p>
      </section>
      <ReservationForm
        arena={booking.arena}
        court={booking.court}
        days={booking.days}
        initialDate={selectedDate.success ? selectedDate.data : saoPauloDateString()}
        initialTime={selectedTime.success ? selectedTime.data : ""}
      />
      <footer className="court-footer"><span>FEZ BONITO · {booking.arena.nome.toUpperCase()}</span></footer>
    </main>
  );
}