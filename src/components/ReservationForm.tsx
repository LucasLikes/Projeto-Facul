"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Check, LoaderCircle, MessageCircle } from "lucide-react";
import Link from "next/link";
import type { Arena, BookingDay, Court } from "@/lib/domain";
import { formatLocalDate, hourText } from "@/lib/time";

type BookingResponse = { booking_id: string; status: "pendente"; arena_whatsapp: string; quadra: string };

export function ReservationForm({ arena, court, days, initialDate, initialTime }: {
  arena: Arena;
  court: Court;
  days: BookingDay[];
  initialDate: string;
  initialTime: string;
}) {
  const dateInRange = days.some((day) => day.date === initialDate) ? initialDate : days[0]?.date ?? "";
  const initialSlot = days.find((day) => day.date === dateInRange)?.slots.find((slot) => hourText(slot.hora_inicio) === initialTime && slot.livre);
  const [selectedDate, setSelectedDate] = useState(dateInRange);
  const [selectedTime, setSelectedTime] = useState(initialSlot?.hora_inicio ?? "");
  const [result, setResult] = useState<BookingResponse | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const day = days.find((item) => item.date === selectedDate);
  const selectedSlot = day?.slots.find((slot) => slot.hora_inicio === selectedTime && slot.livre);
  const selectedDateLabel = selectedDate ? formatLocalDate(selectedDate, { weekday: "long", day: "2-digit", month: "long" }) : "";
  const arenaPhone = arena.telefone_whatsapp.replace(/\D/g, "");
  const helpMessage = encodeURIComponent(`Olá! Tenho uma dúvida sobre a quadra ${court.nome} da ${arena.nome}.`);

  function submit(formData: FormData) {
    setError("");
    startTransition(async () => {
      const response = await fetch(`/api/public/bookings?arena=${encodeURIComponent(arena.slug)}&court=${encodeURIComponent(court.slug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          court_id: court.id,
          data: selectedDate,
          hora_inicio: selectedSlot?.hora_inicio.slice(0, 5),
          hora_fim: selectedSlot?.hora_fim.slice(0, 5),
          nome_cliente: formData.get("nome"),
          whatsapp: formData.get("whatsapp"),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.error?.message ?? "Não foi possível enviar sua reserva. Tente de novo.");
        return;
      }
      setResult(payload as BookingResponse);
    });
  }

  if (result) {
    const phone = result.arena_whatsapp.replace(/\D/g, "");
    const message = `Olá! Solicitei uma reserva na ${arena.nome}. Quadra: ${court.nome}. Data: ${selectedDateLabel}. Horário: ${hourText(selectedSlot?.hora_inicio ?? "")}-${hourText(selectedSlot?.hora_fim ?? "")}. Código: ${result.booking_id.slice(0, 8)}.`;
    const whatsappHref = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    return (
      <section className="booking-success" aria-live="polite">
        <span className="success-mark"><Check size={27} /></span>
        <span className="section-eyebrow">PEDIDO ENVIADO</span>
        <h2>Falta só combinar com a arena.</h2>
        <p>Seu horário está aguardando confirmação. Chame a equipe para agilizar.</p>
        <a className="whatsapp-button" href={whatsappHref} target="_blank" rel="noreferrer"><MessageCircle size={19} />Abrir WhatsApp</a>
        <Link className="quiet-link" href={`/${arena.slug}/${court.slug}`}>Voltar para os replays</Link>
      </section>
    );
  }

  return (
    <form className="booking-form" action={submit}>
      <section className="booking-step">
        <div className="step-heading"><span>01</span><div><span className="section-eyebrow">ESCOLHA O DIA</span><h2>Próximos 14 dias</h2></div></div>
        <div className="date-strip">
          {days.map((item, index) => {
            const label = index === 0 ? "Hoje" : formatLocalDate(item.date, { weekday: "short" }).replace(".", "");
            return <button className={`date-choice${selectedDate === item.date ? " is-selected" : ""}`} type="button" key={item.date} onClick={() => { setSelectedDate(item.date); setSelectedTime(""); }}>
              <span>{label}</span><strong>{item.date.slice(8, 10)}</strong><small>{item.date.slice(5, 7)}</small>
            </button>;
          })}
        </div>
      </section>

      <section className="booking-step">
        <div className="step-heading"><span>02</span><div><span className="section-eyebrow">ESCOLHA O TURNO</span><h2>{selectedDateLabel}</h2></div></div>
        {day?.slots.length ? <div className="time-choice-grid">
          {day.slots.map((slot) => <button className={`time-choice${selectedTime === slot.hora_inicio ? " is-selected" : ""}`} type="button" key={slot.hora_inicio} disabled={!slot.livre} onClick={() => setSelectedTime(slot.hora_inicio)}>
            <span>{hourText(slot.hora_inicio)}</span><span>–</span><span>{hourText(slot.hora_fim)}</span>
          </button>)}
        </div> : <p className="empty-slot">Não há turnos disponíveis para este dia.</p>}
      </section>

      <section className="booking-step">
        <div className="step-heading"><span>03</span><div><span className="section-eyebrow">SEUS DADOS</span><h2>Quem vai jogar?</h2></div></div>
        <label className="field-label" htmlFor="nome">Nome</label>
        <input className="form-input" id="nome" name="nome" autoComplete="name" minLength={2} maxLength={100} required />
        <label className="field-label" htmlFor="whatsapp">WhatsApp</label>
        <input className="form-input" id="whatsapp" name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" minLength={10} maxLength={20} placeholder="(11) 99999-9999" required />
      </section>

      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="submit-booking" type="submit" disabled={!selectedSlot || isPending}>
        {isPending ? <LoaderCircle className="spin" size={19} /> : <span>Solicitar reserva</span>}
        {!isPending ? <ArrowRight size={19} /> : null}
      </button>
      {arenaPhone ? <a className="booking-help-whatsapp" href={`https://wa.me/${arenaPhone}?text=${helpMessage}`} target="_blank" rel="noreferrer"><MessageCircle size={18} />Dúvidas? Fale com a arena no WhatsApp</a> : null}
      <p className="booking-note">Sem pagamento online. A reserva fica pendente até a confirmação da arena.</p>
    </form>
  );
}