import Link from "next/link";
import { notFound } from "next/navigation";
import { CirclePlay, ExternalLink, Flag } from "lucide-react";
import { ReplayModeration } from "@/components/ReplayModeration";
import { getPanelContext } from "@/lib/panel-context";
import { saoPauloDateString } from "@/lib/time";
import { localDateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export default async function ReplaysPage({ searchParams }: { searchParams: Promise<{ quadra?: string; de?: string; ate?: string }> }) {
  const context = await getPanelContext();
  if (!context) notFound();
  const query = await searchParams;
  const fromDate = localDateSchema.safeParse(query.de);
  const toDate = localDateSchema.safeParse(query.ate);
  const defaultDate = saoPauloDateString();
  const startDate = fromDate.success ? fromDate.data : defaultDate;
  const endDate = toDate.success ? toDate.data : defaultDate;
  const courtIds = context.courts.map((court) => court.id);
  const requestedCourt = context.courts.find((court) => court.id === query.quadra);
  let replayRows: { id: string; court_id: string; capturado_em: string; duracao_s: number; visivel: boolean; visualizacoes: number; compartilhamentos: number }[] = [];
  let reportRows: { id: string; replay_id: string; motivo: string; criado_em: string }[] = [];
  let commentRows: { id: string; replay_id: string; apelido: string; texto: string; criado_em: string }[] = [];
  if (courtIds.length && startDate <= endDate) {
    const replayQuery = context.admin.from("replays").select("id,court_id,capturado_em,duracao_s,visivel,visualizacoes,compartilhamentos")
      .in("court_id", requestedCourt ? [requestedCourt.id] : courtIds).gte("capturado_em", `${startDate}T00:00:00-03:00`).lte("capturado_em", `${endDate}T23:59:59-03:00`)
      .order("capturado_em", { ascending: false }).limit(100);
    const replayResult = await replayQuery;
    replayRows = replayResult.data ?? [];
    const replayIds = replayRows.map((replay) => replay.id);
    if (replayIds.length) {
      const [reportResult, commentResult] = await Promise.all([
        context.admin.from("reports").select("id,replay_id,motivo,criado_em").in("replay_id", replayIds).is("resolvido_em", null).order("criado_em", { ascending: false }),
        context.admin.from("replay_comments").select("id,replay_id,apelido,texto,criado_em").in("replay_id", replayIds).order("criado_em", { ascending: false }).limit(200),
      ]);
      reportRows = reportResult.data ?? [];
      commentRows = commentResult.data ?? [];
    }
  }

  return <div className="panel-page">
    <header className="panel-page-heading"><div><span className="section-eyebrow">GESTÃO DA ARENA · MODERAÇÃO</span><h1>Replays publicados.</h1><p>Revise conteúdo e acompanhe denúncias.</p></div><Link className="panel-heading-action" href="/painel/agenda"><CirclePlay size={17} />Agenda</Link></header>
    <section className="moderation-summary"><span><CirclePlay size={16} />{replayRows.length} replays no período</span><span><Flag size={16} />{reportRows.length} denúncias abertas</span></section>
    <form className="replay-filter" method="get">
      <label>Quadra<select name="quadra" defaultValue={requestedCourt?.id ?? "all"}><option value="all">Todas as quadras</option>{context.courts.map((court) => <option value={court.id} key={court.id}>{court.nome}</option>)}</select></label>
      <label>De<input type="date" name="de" defaultValue={startDate} /></label>
      <label>Até<input type="date" name="ate" defaultValue={endDate} /></label>
      <button type="submit">Filtrar</button>
    </form>
    <ReplayModeration replays={replayRows} reports={reportRows} comments={commentRows} courts={context.courts} />
    {!replayRows.length ? <p className="panel-empty">Nenhum replay encontrado neste período.</p> : null}
    <p className="panel-small-note"><ExternalLink size={14} /> A lista mostra até 100 replays; ajuste o período para encontrar itens mais antigos.</p>
  </div>;
}