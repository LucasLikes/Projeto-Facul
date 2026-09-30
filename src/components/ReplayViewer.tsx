"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Check, Copy, Download, Flag, LoaderCircle, MessageCircle, MessageSquareText, Share2, X } from "lucide-react";
import type { Arena, Court, ReplayComment, ReplayView } from "@/lib/domain";
import { formatReplayTime } from "@/lib/time";
import { AdSlot } from "@/components/AdSlot";

export function ReplayViewer({ replay, arena, court, comments: initialComments, commentsEnabled }: { replay: ReplayView; arena: Arena; court: Court; comments: ReplayComment[]; commentsEnabled: boolean }) {
  const [copied, setCopied] = useState(false);
  const [comments, setComments] = useState(initialComments);
  const [commentMessage, setCommentMessage] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentFormKey, setCommentFormKey] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportStatus, setReportStatus] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    void fetch(`/api/public/replays/${replay.id}/metric`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "view" }),
    }).catch(() => undefined);
  }, [replay.id]);

  async function share() {
    const url = window.location.href;
    void fetch(`/api/public/replays/${replay.id}/metric`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "share" }),
    }).catch(() => undefined);
    if (navigator.share) {
      try {
        await navigator.share({ title: `${court.nome} · ${arena.nome}`, text: "Olha esse lance!", url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`Olha esse lance! ${url}`)}`, "_blank", "noopener,noreferrer");
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function submitReport(formData: FormData) {
    setReportBusy(true);
    setReportStatus("");
    try {
      const response = await fetch(`/api/public/replays/${replay.id}/report`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ motivo: formData.get("motivo") }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message ?? "Não foi possível enviar a denúncia.");
      setReportStatus("Recebemos sua denúncia. A equipe da arena vai analisar o vídeo.");
    } catch (error) {
      setReportStatus(error instanceof Error ? error.message : "Não foi possível enviar a denúncia.");
    } finally {
      setReportBusy(false);
    }
  }

  async function submitComment(formData: FormData) {
    setCommentBusy(true);
    setCommentMessage("");
    try {
      const response = await fetch(`/api/public/replays/${replay.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apelido: formData.get("apelido"), texto: formData.get("texto") }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message ?? "Não foi possível publicar o comentário.");
      setComments((current) => [payload.comment as ReplayComment, ...current].slice(0, 50));
      setCommentFormKey((current) => current + 1);
      setCommentMessage("Comentário publicado.");
    } catch (error) {
      setCommentMessage(error instanceof Error ? error.message : "Não foi possível publicar o comentário.");
    } finally {
      setCommentBusy(false);
    }
  }

  return (
    <>
      <div className="replay-player">
        {replay.video_url && !videoFailed ? (
          <video
            src={replay.video_url}
            poster={replay.thumb_url}
            autoPlay
            muted
            loop
            playsInline
            controls
            preload="metadata"
            onError={() => setVideoFailed(true)}
            aria-label={`Replay capturado às ${formatReplayTime(replay.capturado_em)}`}
          />
        ) : (
          <div className="replay-poster">
            <Image src={replay.thumb_url} alt="" fill sizes="(max-width: 720px) 100vw, 720px" unoptimized priority />
            <span className="poster-play"><Share2 size={22} aria-hidden="true" /></span>
            {replay.demo ? <span className="demo-video-label">REPLAY DE DEMONSTRAÇÃO</span> : <span className="demo-video-label">VÍDEO INDISPONÍVEL</span>}
          </div>
        )}
        <div className="likes-video-watermark" aria-label="Fez Bonito por Likes">
          <span className="likes-watermark-mark">L</span>
          <span className="likes-watermark-copy"><small>REPLAY POR</small><strong>LIKES</strong></span>
        </div>
      </div>

      <AdSlot arena={arena} placement="replay" />

      <section className="replay-details">
        <div><span className="section-eyebrow">{court.nome.toUpperCase()} · {arena.nome.toUpperCase()}</span><h1>Esse lance foi seu.</h1></div>
        <p>Capturado às <strong>{formatReplayTime(replay.capturado_em)}</strong><span> · </span>{replay.duracao_s} segundos</p>
      </section>
      <div className="replay-actions">
        <button className="share-action" type="button" onClick={() => void share()}><Share2 size={19} />Compartilhar</button>
        {replay.demo ? <button className="secondary-action" type="button" disabled aria-label="Download disponível com mídia real"><Download size={19} />Baixar</button> : <a className="secondary-action" href={`/api/public/replays/${replay.id}/download`}><Download size={19} />Baixar</a>}
        <button className="icon-action" type="button" onClick={() => void copyLink()} title={copied ? "Link copiado" : "Copiar link"} aria-label={copied ? "Link copiado" : "Copiar link"}>{copied ? <Check size={19} /> : <Copy size={19} />}</button>
      </div>
      <section className="comments-section" aria-labelledby="comments-title">
        <header className="comments-heading"><div><span className="section-eyebrow">CONVERSA DA QUADRA</span><h2 id="comments-title"><MessageSquareText size={20} />Comentários <span>{comments.length}</span></h2></div></header>
        {comments.length ? <div className="comments-list">
          {comments.map((comment) => <article className="public-comment" key={comment.id}>
            <div className="comment-avatar" aria-hidden="true">{comment.apelido.slice(0, 1).toUpperCase()}</div>
            <div><header><strong>{comment.apelido}</strong><time dateTime={comment.criado_em}>{new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(comment.criado_em))}</time>{comment.demo ? <span className="comment-demo-label">DEMO</span> : null}</header><p>{comment.texto}</p></div>
          </article>)}
        </div> : <p className="comments-empty">Seja a primeira pessoa a comentar esse lance.</p>}
        {commentsEnabled ? <form className="comment-form" action={submitComment} key={commentFormKey}>
          <label htmlFor="comment-apelido">Como quer aparecer?</label>
          <input id="comment-apelido" name="apelido" minLength={2} maxLength={32} required placeholder="Seu apelido" />
          <label htmlFor="comment-texto">Seu comentário</label>
          <textarea id="comment-texto" name="texto" minLength={2} maxLength={500} rows={3} required placeholder="Conta pra galera o que achou do lance…" />
          {commentMessage ? <p className="comment-status" aria-live="polite">{commentMessage}</p> : null}
          <button type="submit" disabled={commentBusy}>{commentBusy ? <LoaderCircle className="spin" size={16} /> : <MessageSquareText size={16} />}{commentBusy ? "Publicando…" : "Comentar"}</button>
        </form> : <p className="comments-disabled">Os comentários estarão disponíveis quando a arena conectar o sistema de reservas.</p>}
        <p className="comment-guidance">Use um apelido. Não inclua telefone ou dados pessoais. A arena pode remover comentários inadequados.</p>
      </section>
      <div className="report-area">
        <button className="report-trigger" type="button" onClick={() => { setReportOpen((value) => !value); setReportStatus(""); }}>
          {reportOpen ? <X size={15} /> : <Flag size={15} />} {reportOpen ? "Fechar" : "Denunciar / remover este vídeo"}
        </button>
        {reportOpen ? <form className="report-form" action={submitReport}>
          <label className="field-label" htmlFor="motivo">Conte o que aconteceu</label>
          <textarea className="form-input report-input" id="motivo" name="motivo" minLength={5} maxLength={500} required placeholder="Descreva o motivo da denúncia" />
          {reportStatus ? <p className="report-status" aria-live="polite">{reportStatus}</p> : null}
          <button className="report-submit" type="submit" disabled={reportBusy}>{reportBusy ? <LoaderCircle className="spin" size={17} /> : "Enviar denúncia"}</button>
        </form> : null}
      </div>
      <footer className="replay-footer"><span className="brand-symbol" aria-hidden="true">F</span><div><strong>{arena.nome}</strong><span>O próximo lance inesquecível começa na quadra.</span></div><a href={`https://wa.me/${arena.telefone_whatsapp.replace(/\D/g, "")}`} aria-label={`Falar com ${arena.nome} pelo WhatsApp`}><MessageCircle size={19} /></a></footer>
    </>
  );
}