"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Ban, Check, ChevronDown, Clock3, LoaderCircle, Pencil, Plus, X } from "lucide-react";
import type { Court } from "@/lib/domain";
import { addLocalDays, formatLocalDate, hourText } from "@/lib/time";

type PanelBooking = {
  id: string; court_id: string; data: string; hora_inicio: string; hora_fim: string;
  nome_cliente: string; whatsapp: string; status: "pendente" | "confirmada" | "cancelada" | "bloqueada"; origem: string;
};
type PanelSlot = { id: string; court_id: string; dia_semana: number; hora_inicio: string; hora_fim: string; preco_centavos: number | null };
const weekdays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function localDateLabel(date: string) {
  return formatLocalDate(date, { weekday: "short", day: "2-digit", month: "short" }).replace(".", "");
}

export function AgendaManager({ courts, dates, startDate, bookings, slots }: {
  courts: Court[]; dates: string[]; startDate: string; bookings: PanelBooking[]; slots: PanelSlot[];
}) {
  const router = useRouter();
  const [courtFilter, setCourtFilter] = useState("all");
  const [feedback, setFeedback] = useState("");
  const [busyId, setBusyId] = useState("");
  const [isPending, startTransition] = useTransition();
  const visibleBookings = bookings.filter((booking) => courtFilter === "all" || booking.court_id === courtFilter);
  const visibleSlots = slots.filter((slot) => courtFilter === "all" || slot.court_id === courtFilter);

  function updateBooking(id: string, status: "confirmada" | "cancelada") {
    setBusyId(id);
    setFeedback("");
    startTransition(async () => {
      const response = await fetch("/api/panel/bookings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
      const payload = await response.json().catch(() => null);
      setBusyId("");
      if (!response.ok) { setFeedback(payload?.error?.message ?? "Não foi possível atualizar a reserva."); return; }
      router.refresh();
    });
  }

  return <div className="panel-page">
    <header className="panel-page-heading agenda-heading">
      <div><span className="section-eyebrow">GESTÃO DA ARENA · AGENDA</span><h1>Semana da quadra.</h1><p>Reservas, bloqueios e turnos em um só lugar.</p></div>
      <label className="court-filter"><span>QUADRA</span><select value={courtFilter} onChange={(event) => setCourtFilter(event.target.value)}><option value="all">Todas as quadras</option>{courts.map((court) => <option key={court.id} value={court.id}>{court.nome}</option>)}</select><ChevronDown size={15} /></label>
    </header>
    <nav className="week-nav" aria-label="Navegação semanal"><Link href={`/painel/agenda?semana=${addLocalDays(startDate, -7)}`} aria-label="Semana anterior"><ArrowLeft size={17} /></Link><span>{localDateLabel(dates[0])} — {localDateLabel(dates[6])}</span><Link href={`/painel/agenda?semana=${addLocalDays(startDate, 7)}`} aria-label="Próxima semana"><ArrowRight size={17} /></Link></nav>

    {feedback ? <p className="panel-feedback" role="alert">{feedback}</p> : null}
    <section className="week-board" aria-label="Reservas da semana">
      {dates.map((date) => {
        const dayBookings = visibleBookings.filter((booking) => booking.data === date);
        return <article className="week-day" key={date}>
          <header><span>{localDateLabel(date)}</span><strong>{dayBookings.length}</strong></header>
          {dayBookings.length ? <div className="week-bookings">
            {dayBookings.map((booking) => {
              const court = courts.find((item) => item.id === booking.court_id);
              const blocking = booking.status === "bloqueada";
              return <div className={`week-booking status-${booking.status}`} key={booking.id}>
                <div className="booking-time"><Clock3 size={14} />{hourText(booking.hora_inicio)}–{hourText(booking.hora_fim)}</div>
                <strong>{blocking ? booking.nome_cliente : booking.nome_cliente}</strong>
                <span className="booking-court-label">{court?.nome ?? "Quadra"}</span>
                <span className={`booking-state state-${booking.status}`}>{booking.status === "pendente" ? "Pendente" : blocking ? "Bloqueada" : "Confirmada"}</span>
                {booking.status === "pendente" ? <div className="booking-quick-actions">
                  <button type="button" disabled={isPending && busyId === booking.id} onClick={() => updateBooking(booking.id, "confirmada")} aria-label="Aprovar reserva"><Check size={16} /></button>
                  <button type="button" disabled={isPending && busyId === booking.id} onClick={() => updateBooking(booking.id, "cancelada")} aria-label="Recusar reserva"><X size={16} /></button>
                </div> : null}
                {booking.origem === "publica" && !blocking ? <a className="booking-contact" href={`https://wa.me/${booking.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">WhatsApp</a> : null}
              </div>;
            })}
          </div> : <p className="week-empty">Sem reservas</p>}
        </article>;
      })}
    </section>

    <section className="panel-section agenda-tools">
      <header className="panel-section-heading"><div><span className="section-eyebrow">AÇÕES RÁPIDAS</span><h2>Adicionar à agenda</h2></div></header>
      <div className="agenda-action-grid">
        <details className="panel-tool"><summary><Plus size={17} />Reserva manual<ChevronDown size={15} /></summary>
          <QuickBookingForm courts={courts} kind="manual" />
        </details>
        <details className="panel-tool"><summary><Ban size={17} />Bloquear horário<ChevronDown size={15} /></summary>
          <QuickBookingForm courts={courts} kind="bloqueio" />
        </details>
        <details className="panel-tool"><summary><Clock3 size={17} />Turnos recorrentes<ChevronDown size={15} /></summary>
          <SlotManager courts={courts} slots={visibleSlots} />
        </details>
      </div>
    </section>
  </div>;
}

function QuickBookingForm({ courts, kind }: { courts: Court[]; kind: "manual" | "bloqueio" }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  function submit(formData: FormData) {
    setMessage("");
    const common = { tipo: kind, court_id: formData.get("court_id"), data: formData.get("data"), hora_inicio: formData.get("hora_inicio"), hora_fim: formData.get("hora_fim") };
    const payload = kind === "manual" ? { ...common, nome_cliente: formData.get("nome_cliente"), whatsapp: formData.get("whatsapp") } : { ...common, motivo: formData.get("motivo") };
    startTransition(async () => {
      const response = await fetch("/api/panel/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => null);
      if (!response.ok) { setMessage(result?.error?.message ?? "Não foi possível salvar."); return; }
      setMessage("Salvo na agenda.");
      router.refresh();
    });
  }
  return <form className="panel-form" action={submit}>
    <label>Quadra<select name="court_id" required>{courts.map((court) => <option key={court.id} value={court.id}>{court.nome}</option>)}</select></label>
    <label>Data<input name="data" type="date" required /></label>
    <div className="panel-time-fields"><label>Início<input name="hora_inicio" type="time" required /></label><label>Fim<input name="hora_fim" type="time" required /></label></div>
    {kind === "manual" ? <><label>Nome<input name="nome_cliente" minLength={2} maxLength={100} required /></label><label>WhatsApp<input name="whatsapp" type="tel" inputMode="tel" minLength={10} maxLength={20} required /></label></> : <label>Motivo<input name="motivo" minLength={2} maxLength={100} placeholder="Manutenção, campeonato…" required /></label>}
    {message ? <p className="panel-form-message" aria-live="polite">{message}</p> : null}
    <button type="submit" disabled={pending || !courts.length}>{pending ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}Salvar</button>
  </form>;
}

function SlotManager({ courts, slots }: { courts: Court[]; slots: PanelSlot[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const editing = slots.find((slot) => slot.id === editingId);
  function submit(formData: FormData) {
    setMessage("");
    const price = formData.get("preco");
    const payload = {
      ...(editing ? { id: editing.id } : {}), court_id: formData.get("court_id"), dia_semana: Number(formData.get("dia_semana")),
      hora_inicio: formData.get("hora_inicio"), hora_fim: formData.get("hora_fim"),
      preco_centavos: price ? Math.round(Number(price) * 100) : null, ativo: true,
    };
    startTransition(async () => {
      const response = await fetch("/api/panel/time-slots", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => null);
      if (!response.ok) { setMessage(result?.error?.message ?? "Não foi possível salvar o turno."); return; }
      setEditingId("");
      setMessage("Turno salvo.");
      router.refresh();
    });
  }
  function disable(id: string) {
    startTransition(async () => {
      const response = await fetch(`/api/panel/time-slots?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!response.ok) { setMessage("Não foi possível desativar o turno."); return; }
      router.refresh();
    });
  }
  return <div className="slot-manager">
    <form className="panel-form" action={submit} key={editingId || "new-slot"}>
      <label>Quadra<select name="court_id" defaultValue={editing?.court_id ?? courts[0]?.id} required>{courts.map((court) => <option key={court.id} value={court.id}>{court.nome}</option>)}</select></label>
      <label>Dia da semana<select name="dia_semana" defaultValue={editing?.dia_semana ?? 1}>{weekdays.map((day, index) => <option value={index} key={day}>{day}</option>)}</select></label>
      <div className="panel-time-fields"><label>Início<input name="hora_inicio" type="time" defaultValue={editing?.hora_inicio.slice(0, 5) ?? "17:00"} required /></label><label>Fim<input name="hora_fim" type="time" defaultValue={editing?.hora_fim.slice(0, 5) ?? "18:00"} required /></label></div>
      <label>Preço (R$)<input name="preco" type="number" min="0" step="0.01" defaultValue={editing?.preco_centavos == null ? "" : (editing.preco_centavos / 100).toFixed(2)} /></label>
      {message ? <p className="panel-form-message" aria-live="polite">{message}</p> : null}
      <button type="submit" disabled={pending || !courts.length}>{pending ? <LoaderCircle className="spin" size={16} /> : editing ? <Check size={16} /> : <Plus size={16} />}{editing ? "Salvar alterações" : "Criar turno"}</button>
      {editing ? <button className="quiet-panel-button" type="button" onClick={() => setEditingId("")}>Cancelar edição</button> : null}
    </form>
    <div className="slot-existing-list">
      {slots.map((slot) => <div className="slot-existing" key={slot.id}><span>{courts.find((court) => court.id === slot.court_id)?.nome} · {weekdays[slot.dia_semana]} · {hourText(slot.hora_inicio)}–{hourText(slot.hora_fim)}</span><div><button type="button" onClick={() => setEditingId(slot.id)} title="Editar turno" aria-label="Editar turno"><Pencil size={15} /></button><button type="button" onClick={() => disable(slot.id)} title="Desativar turno" aria-label="Desativar turno"><X size={15} /></button></div></div>)}
      {!slots.length ? <p className="panel-empty">Nenhum turno recorrente cadastrado.</p> : null}
    </div>
  </div>;
}