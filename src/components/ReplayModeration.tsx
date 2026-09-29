"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Eye, EyeOff, Flag, Trash2 } from "lucide-react";
import type { Court } from "@/lib/domain";
import { formatReplayTime } from "@/lib/time";

type ReplayRow = { id: string; court_id: string; capturado_em: string; duracao_s: number; visivel: boolean; visualizacoes: number; compartilhamentos: number };
type ReportRow = { id: string; replay_id: string; motivo: string; criado_em: string };

export function ReplayModeration({ replays, reports, courts }: { replays: ReplayRow[]; reports: ReportRow[]; courts: Court[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  function act(payload: { action: "hide" | "show" | "delete"; replay_id: string } | { action: "resolve_report"; report_id: string }) {
    setMessage("");
    startTransition(async () => {
      const response = await fetch("/api/panel/replays", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => null);
      if (!response.ok) { setMessage(result?.error?.message ?? "Não foi possível concluir esta ação."); return; }
      router.refresh();
    });
  }
  return <>
    {message ? <p className="panel-feedback" role="alert">{message}</p> : null}
    <div className="replay-admin-list">
      {replays.map((replay) => {
        const court = courts.find((item) => item.id === replay.court_id);
        const replayReports = reports.filter((report) => report.replay_id === replay.id);
        return <article className="replay-admin-row" key={replay.id}>
          <div className="replay-admin-main"><span className={`replay-visibility ${replay.visivel ? "visible" : "hidden"}`}>{replay.visivel ? "Visível" : "Oculto"}</span><strong>{court?.nome ?? "Quadra"}</strong><span>{new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "short", year: "numeric" }).format(new Date(replay.capturado_em))} · {formatReplayTime(replay.capturado_em)} · {replay.duracao_s}s</span><small>{replay.visualizacoes} views · {replay.compartilhamentos} compartilhamentos</small></div>
          <div className="replay-admin-actions">
            {replay.visivel ? <Link href={`/r/${replay.id}`} target="_blank" rel="noreferrer" title="Abrir replay" aria-label="Abrir replay"><Eye size={17} /></Link> : null}
            <button type="button" disabled={pending} onClick={() => act({ action: replay.visivel ? "hide" : "show", replay_id: replay.id })} title={replay.visivel ? "Ocultar replay" : "Publicar replay"} aria-label={replay.visivel ? "Ocultar replay" : "Publicar replay"}>{replay.visivel ? <EyeOff size={17} /> : <Eye size={17} />}</button>
            <button type="button" disabled={pending} onClick={() => { if (window.confirm("Apagar este vídeo e seus arquivos definitivamente?")) act({ action: "delete", replay_id: replay.id }); }} title="Apagar replay" aria-label="Apagar replay"><Trash2 size={17} /></button>
          </div>
          {replayReports.length ? <div className="report-list"><span className="report-list-title"><Flag size={15} />{replayReports.length} denúncia{replayReports.length === 1 ? "" : "s"}</span>{replayReports.map((report) => <div className="report-item" key={report.id}><p>{report.motivo}</p><button type="button" disabled={pending} onClick={() => act({ action: "resolve_report", report_id: report.id })}><Check size={14} />Resolver</button></div>)}</div> : null}
        </article>;
      })}
    </div>
  </>;
}