import Link from "next/link";
import { ArrowRight, CalendarDays, CirclePlay, Clock3, TrendingUp } from "lucide-react";
import { getPanelContext } from "@/lib/panel-context";
import { addLocalDays, localDayRange, saoPauloDateString, weekdayForLocalDate } from "@/lib/time";

const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const heatHours = Array.from({ length: 7 }, (_, index) => index + 17);

function weekBounds(date: string) {
  const day = weekdayForLocalDate(date);
  const start = addLocalDays(date, -((day + 6) % 7));
  const end = addLocalDays(start, 6);
  return { start, end };
}

function monthBounds(date: string) {
  const start = `${date.slice(0, 7)}-01`;
  const nextMonth = new Date(`${start}T12:00:00-03:00`);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  const end = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(nextMonth.getTime() - 86_400_000));
  return { start, end };
}

export default async function PanelOverviewPage() {
  const context = await getPanelContext();
  if (!context) return null;
  const today = saoPauloDateString();
  const week = weekBounds(today);
  const month = monthBounds(today);
  const todayRange = localDayRange(today);
  const weekRange = { start: localDayRange(week.start).start, end: localDayRange(week.end).end };
  const monthRange = { start: localDayRange(month.start).start, end: localDayRange(month.end).end };
  const courtIds = context.courts.map((court) => court.id);
  const admin = context.admin;

  const [replaysToday, replaysWeek, replaysMonth, bookingsMonth, weekBookingsResult, weekSlotsResult] = await Promise.all([
    admin.from("replays").select("id", { count: "exact", head: true }).in("court_id", courtIds).eq("visivel", true).gt("expira_em", new Date().toISOString()).gte("capturado_em", todayRange.start).lt("capturado_em", todayRange.end),
    admin.from("replays").select("id", { count: "exact", head: true }).in("court_id", courtIds).eq("visivel", true).gt("expira_em", new Date().toISOString()).gte("capturado_em", weekRange.start).lt("capturado_em", weekRange.end),
    admin.from("replays").select("id", { count: "exact", head: true }).in("court_id", courtIds).eq("visivel", true).gt("expira_em", new Date().toISOString()).gte("capturado_em", monthRange.start).lt("capturado_em", monthRange.end),
    admin.from("bookings").select("id", { count: "exact", head: true }).in("court_id", courtIds).neq("status", "cancelada").gte("data", month.start).lte("data", month.end),
    admin.from("bookings").select("court_id,data,hora_inicio,status").in("court_id", courtIds).neq("status", "cancelada").gte("data", week.start).lte("data", week.end),
    admin.from("time_slots").select("court_id,dia_semana").in("court_id", courtIds).eq("ativo", true),
  ]);

  const weekBookings = weekBookingsResult.data ?? [];
  const activeBookings = weekBookings.filter((booking) => booking.status !== "cancelada");
  const heatCounts = new Map<string, number>();
  for (const booking of activeBookings) {
    const weekday = weekdayForLocalDate(booking.data);
    const hour = Number(booking.hora_inicio.slice(0, 2));
    const key = `${weekday}-${hour}`;
    heatCounts.set(key, (heatCounts.get(key) ?? 0) + 1);
  }
  const maxHeat = Math.max(1, ...heatCounts.values());
  const activeSlots = weekSlotsResult.data ?? [];
  const currentDay = weekdayForLocalDate(today);
  const todayBookingsCount = activeBookings.filter((booking) => booking.data === today).length;
  const pendingCount = activeBookings.filter((booking) => booking.status === "pendente").length;

  return (
    <div className="panel-page">
      <header className="panel-page-heading">
        <div><span className="section-eyebrow">PAINEL DA ARENA · VISÃO GERAL</span><h1>Bom jogo, {context.arena.nome}.</h1><p>O movimento de hoje, em um só lugar.</p></div>
        <Link className="panel-heading-action" href="/painel/agenda"><CalendarDays size={17} />Abrir agenda</Link>
      </header>

      <section className="metric-strip" aria-label="Indicadores de atividade">
        <article className="metric-cell"><span><CirclePlay size={16} />REPLAYS HOJE</span><strong>{replaysToday.count ?? 0}</strong><small>Lances publicados</small></article>
        <article className="metric-cell"><span><TrendingUp size={16} />REPLAYS NA SEMANA</span><strong>{replaysWeek.count ?? 0}</strong><small>Desde segunda-feira</small></article>
        <article className="metric-cell"><span><CirclePlay size={16} />REPLAYS NO MÊS</span><strong>{replaysMonth.count ?? 0}</strong><small>Vídeos disponíveis</small></article>
        <article className="metric-cell"><span><CalendarDays size={16} />RESERVAS HOJE</span><strong>{todayBookingsCount}</strong><small>{pendingCount} aguardando confirmação</small></article>
      </section>

      <section className="panel-section">
        <header className="panel-section-heading"><div><span className="section-eyebrow">SEG–DOM · 17H–23H</span><h2>Horários mais movimentados</h2></div><span className="heat-legend"><i />Mais reservas</span></header>
        <div className="heatmap-wrap">
          <div className="heatmap" role="table" aria-label="Mapa de reservas por dia da semana e hora">
            <div className="heat-corner" role="columnheader">DIA / HORA</div>
            {heatHours.map((hour) => <div className="heat-hour" role="columnheader" key={hour}>{hour}:00</div>)}
            {Array.from({ length: 7 }, (_, offset) => {
              const weekday = (offset + 1) % 7;
              return <div className="heat-row" role="row" key={weekday}>
                <span className="heat-day" role="rowheader">{dayNames[weekday]}</span>
                {heatHours.map((hour) => {
                  const count = heatCounts.get(`${weekday}-${hour}`) ?? 0;
                  const intensity = count ? Math.max(0.14, count / maxHeat) : 0;
                  return <span className="heat-cell" role="cell" key={hour} title={`${dayNames[weekday]} ${hour}:00 · ${count} reserva${count === 1 ? "" : "s"}`} style={{ "--intensity": intensity } as React.CSSProperties}>{count || ""}</span>;
                })}
              </div>;
            })}
          </div>
        </div>
      </section>

      <section className="panel-section occupancy-section">
        <header className="panel-section-heading"><div><span className="section-eyebrow">SEMANA ATUAL</span><h2>Ocupação por quadra</h2></div><Link href="/painel/agenda" className="panel-text-link">Ver agenda <ArrowRight size={15} /></Link></header>
        <div className="occupancy-list">
          {context.courts.map((court) => {
            const availableCount = activeSlots.filter((slot) => slot.court_id === court.id).length;
            const occupied = activeBookings.filter((booking) => booking.court_id === court.id && booking.status !== "cancelada").length;
            const percentage = availableCount ? Math.min(100, Math.round((occupied / availableCount) * 100)) : 0;
            return <div className="occupancy-row" key={court.id}>
              <div className="occupancy-name"><strong>{court.nome}</strong><span>{court.esporte.replaceAll("_", " ")}</span></div>
              <div className="occupancy-bar" role="progressbar" aria-label={`Ocupação de ${court.nome}`} aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${percentage}%` }} /></div>
              <strong className="occupancy-value">{percentage}%</strong>
              <span className="occupancy-count"><Clock3 size={14} />{occupied}/{availableCount}</span>
            </div>;
          })}
          {!context.courts.length ? <p className="panel-empty">Cadastre uma quadra para começar a acompanhar a ocupação.</p> : null}
        </div>
      </section>

      <section className="panel-bottom-line"><span>{context.arena.nome}</span><span>{bookingsMonth.count ?? 0} reservas no mês · dia {currentDay === 0 ? "domingo" : dayNames[currentDay].toLowerCase()}</span></section>
    </div>
  );
}