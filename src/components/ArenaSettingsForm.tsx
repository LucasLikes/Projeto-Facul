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
    {!editable ? <p className="panel-feedback">Somente o proprietário da arena pode alterar estas configurações.</p> : null}
    {message ? <p className="settings-message" aria-live="polite">{message}</p> : null}
    {editable ? <button className="settings-submit" type="submit" disabled={pending}>{pending ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}{pending ? "Salvando…" : "Salvar configurações"}{!pending ? <Check size={17} /> : null}</button> : null}
  </form>;
}