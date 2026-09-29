import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowRight, CalendarDays, CircleDot, Clock3, Play } from "lucide-react";
import type { Arena, Court, CourtSlot } from "@/lib/domain";
import { addLocalDays, formatLocalDate, formatReplayTime, hourText, saoPauloDateString } from "@/lib/time";
import { ArenaHeader } from "@/components/ArenaHeader";

function dateHref(arena: Arena, court: Court, date: string, now = false) {
  return `/${arena.slug}/${court.slug}?data=${date}${now ? "&agora=1" : ""}`;
}

function SlotRow({ slot, focused }: { slot: CourtSlot; focused: boolean }) {
  const status = slot.status === "agora" ? "Em andamento" : slot.reservado ? "Reservado" : "Livre";
  const statusClass = slot.status === "agora" ? "slot-status is-live" : slot.reservado ? "slot-status is-booked" : "slot-status is-free";
  return (
    <details className={`slot-row${focused ? " is-focused" : ""}`} open={focused}>
      <summary className="slot-summary">
        <span className="slot-time"><Clock3 size={16} aria-hidden="true" />{hourText(slot.hora_inicio)} <span>–</span> {hourText(slot.hora_fim)}</span>
        <span className={statusClass}><span className="status-dot" />{status}</span>
        <span className="slot-replay-count"><Play size={14} fill="currentColor" aria-hidden="true" />{slot.replays.length}</span>
        <ArrowDown className="slot-chevron" size={17} aria-hidden="true" />
      </summary>
      <div className="slot-content">
        {slot.replays.length ? (
          <div className="replay-grid">
            {slot.replays.map((replay) => (
              <Link className="replay-thumb" key={replay.id} href={`/r/${replay.id}`} aria-label={`Replay das ${formatReplayTime(replay.capturado_em)}`}>
                <Image src={replay.thumb_url} alt="" fill sizes="(max-width: 640px) 45vw, 220px" unoptimized loading="lazy" />
                <span className="thumb-play"><Play size={16} fill="currentColor" aria-hidden="true" /></span>
                <span className="thumb-time">{formatReplayTime(replay.capturado_em)}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="empty-slot">Nenhum replay neste horário ainda.</p>
        )}
      </div>
    </details>
  );
}

export function CourtTimeline({ arena, court, date, slots, agora }: { arena: Arena; court: Court; date: string; slots: CourtSlot[]; agora: boolean }) {
  const today = saoPauloDateString();
  const dateIndex = slots.findIndex((slot) => slot.status === "agora");
  const focusId = agora ? slots[dateIndex >= 0 ? dateIndex : 0]?.id : undefined;
  return (
    <main className="public-shell" style={{ "--brand": arena.cor_primaria } as React.CSSProperties}>
      <ArenaHeader arena={arena} court={court} />
      <section className="court-intro">
        <div className="court-kicker"><span className="court-live-mark" /><span>QUADRA MONITORADA</span></div>
        <h1>{court.nome}</h1>
        <p>{arena.nome}<span aria-hidden="true"> · </span>{arena.cidade}</p>
      </section>

      <section className="replay-disclosure" aria-label="Aviso de privacidade">
        <CircleDot size={15} aria-hidden="true" />
        <p>Esta quadra é monitorada por câmera. Os vídeos ficam disponíveis por {arena.retention_days} dias.</p>
      </section>

      <section className="day-section">
        <div className="day-heading">
          <div><span className="section-eyebrow">AGENDA DA QUADRA</span><h2>{formatLocalDate(date)}</h2></div>
          <CalendarDays size={20} aria-hidden="true" />
        </div>
        <div className="day-controls" aria-label="Navegação por data">
          <Link href={dateHref(arena, court, addLocalDays(date, -1))} aria-label="Dia anterior"><ArrowLeft size={18} /></Link>
          <Link className={date === today ? "selected" : ""} href={dateHref(arena, court, today)}>Hoje</Link>
          <Link className="now-link" href={dateHref(arena, court, today, true)}><span className="now-pulse" />Agora</Link>
          <Link href={dateHref(arena, court, addLocalDays(date, 1))} aria-label="Próximo dia"><ArrowRight size={18} /></Link>
        </div>
        <div className="slot-list">
          {slots.length ? slots.map((slot) => <SlotRow key={slot.id} slot={slot} focused={slot.id === focusId} />) : (
            <div className="empty-day"><span>SEM REPLAYS</span><p>Os lances deste dia vão aparecer aqui.</p></div>
          )}
        </div>
      </section>
      <footer className="court-footer"><span>UM LANCE BOM MERECE SER VISTO DE NOVO.</span><span>FEZ BONITO · {arena.nome.toUpperCase()}</span></footer>
      <Link className="reserve-dock" href={`/${arena.slug}/${court.slug}/reservar`}><span>Reservar horário</span><ArrowRight size={19} aria-hidden="true" /></Link>
    </main>
  );
}