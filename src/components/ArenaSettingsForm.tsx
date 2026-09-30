"use client";

import { useState, useTransition } from "react";
import { Check, LoaderCircle, Save } from "lucide-react";
import type { Arena } from "@/lib/domain";

export function ArenaSettingsForm({ arena, editable }: { arena: Arena; editable: boolean }) {
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  function submit(formData: FormData) {
    setMessage("");
    const payload = {
      telefone_whatsapp: formData.get("telefone_whatsapp"),
      logo_url: formData.get("logo_url"),
      cor_primaria: formData.get("cor_primaria"),
      retention_days: Number(formData.get("retention_days")),
      publicidade_ativa: formData.get("publicidade_ativa") === "on",
      publicidade_titulo: formData.get("publicidade_titulo"),
      publicidade_texto: formData.get("publicidade_texto"),
      publicidade_imagem_url: formData.get("publicidade_imagem_url"),
      publicidade_whatsapp: formData.get("publicidade_whatsapp"),
    };
    startTransition(async () => {
      const response = await fetch("/api/panel/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => null);
      if (!response.ok) { setMessage(result?.error?.message ?? "Não foi possível salvar as configurações."); return; }
      setMessage("Configurações salvas.");
    });
  }

  return <form className="settings-form" action={submit}>
    <section className="settings-section"><span className="section-eyebrow">IDENTIDADE DA ARENA</span><div className="settings-field"><label htmlFor="telefone_whatsapp">WhatsApp da arena</label><input id="telefone_whatsapp" name="telefone_whatsapp" type="tel" inputMode="tel" defaultValue={arena.telefone_whatsapp} maxLength={20} placeholder="5511999999999" disabled={!editable} /><small>Use o código do país e DDD para os links wa.me.</small></div>
      <div className="settings-field"><label htmlFor="logo_url">URL do logo</label><input id="logo_url" name="logo_url" type="url" defaultValue={arena.logo_url ?? ""} maxLength={2048} placeholder="https://..." disabled={!editable} /><small>Hospede a imagem em um serviço confiável e informe uma URL HTTPS.</small></div>
      <div className="settings-field color-setting"><label htmlFor="cor_primaria">Cor primária</label><div><input id="cor_primaria" name="cor_primaria" type="color" defaultValue={arena.cor_primaria} disabled={!editable} /><code>{arena.cor_primaria}</code></div></div>
    </section>
    <section className="settings-section"><span className="section-eyebrow">PRIVACIDADE E RETENÇÃO</span><div className="settings-field"><label htmlFor="retention_days">Dias de disponibilidade dos vídeos</label><input id="retention_days" name="retention_days" type="number" min={1} max={365} defaultValue={arena.retention_days} disabled={!editable} /><small>Novos vídeos serão removidos após este prazo. O cron roda diariamente.</small></div></section>
    <section className="settings-section"><span className="section-eyebrow">DIVULGAÇÃO LOCAL</span>
      <label className="marketing-toggle"><input name="publicidade_ativa" type="checkbox" defaultChecked={arena.publicidade_ativa} disabled={!editable} /><span><strong>Exibir destaque nas páginas de replay</strong><small>Divulgue um parceiro, serviço ou evento da região abaixo do vídeo.</small></span></label>
      <div className="settings-field"><label htmlFor="publicidade_titulo">Título do destaque</label><input id="publicidade_titulo" name="publicidade_titulo" defaultValue={arena.publicidade_titulo ?? ""} maxLength={80} placeholder="Ex.: Conheça o parceiro da rodada" disabled={!editable} /></div>
      <div className="settings-field"><label htmlFor="publicidade_texto">Descrição</label><textarea id="publicidade_texto" name="publicidade_texto" defaultValue={arena.publicidade_texto ?? ""} maxLength={240} rows={3} placeholder="Apresente o serviço, promoção ou evento local." disabled={!editable} /><small>Até 240 caracteres.</small></div>
      <div className="settings-field"><label htmlFor="publicidade_imagem_url">Imagem do destaque (opcional)</label><input id="publicidade_imagem_url" name="publicidade_imagem_url" type="url" defaultValue={arena.publicidade_imagem_url ?? ""} maxLength={2048} placeholder="https://..." disabled={!editable} /><small>Use uma imagem HTTPS autorizada pelo anunciante.</small></div>
      <div className="settings-field"><label htmlFor="publicidade_whatsapp">WhatsApp do anunciante (opcional)</label><input id="publicidade_whatsapp" name="publicidade_whatsapp" type="tel" inputMode="tel" defaultValue={arena.publicidade_whatsapp} maxLength={20} placeholder="Vazio usa o WhatsApp da arena" disabled={!editable} /></div>
    </section>
    {!editable ? <p className="panel-feedback">Somente o proprietário da arena pode alterar estas configurações.</p> : null}
    {message ? <p className="settings-message" aria-live="polite">{message}</p> : null}
    {editable ? <button className="settings-submit" type="submit" disabled={pending}>{pending ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}{pending ? "Salvando…" : "Salvar configurações"}{!pending ? <Check size={17} /> : null}</button> : null}
  </form>;
}