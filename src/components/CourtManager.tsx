"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, LoaderCircle, Plus, RotateCw, ShieldCheck, Volleyball } from "lucide-react";
import type { Arena, Court } from "@/lib/domain";
import { QrPrint } from "@/components/QrPrint";

type Device = { id: string; court_id: string; ultimo_ping: string | null; status: string; online: boolean };
type OneTimeToken = { courtId: string; token: string };

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function CourtManager({ arena, courts, devices, appUrl }: { arena: Arena; courts: Court[]; devices: Device[]; appUrl: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [oneTimeToken, setOneTimeToken] = useState<OneTimeToken | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function createCourt(formData: FormData) {
    setMessage("");
    const nome = String(formData.get("nome") ?? "").trim();
    const payload = { action: "create_court", nome, slug: slugify(String(formData.get("slug") || nome)), esporte: formData.get("esporte"), tipo: formData.get("tipo") };
    startTransition(async () => {
      const response = await fetch("/api/panel/courts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => null);
      if (!response.ok) { setMessage(result?.error?.message ?? "Não foi possível criar a quadra."); return; }
      setMessage(`Quadra ${result.nome} cadastrada.`);
      router.refresh();
    });
  }

  function deviceAction(court: Court, action: "create_device" | "rotate_device") {
    setMessage("");
    startTransition(async () => {
      const response = await fetch("/api/panel/courts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, court_id: court.id }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) { setMessage(result?.error?.message ?? "Não foi possível atualizar o dispositivo."); return; }
      setOneTimeToken({ courtId: court.id, token: result.token });
      router.refresh();
    });
  }

  async function copyToken(token: string) {
    await navigator.clipboard.writeText(token);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return <div className="court-manager">
    {message ? <p className="panel-feedback" role="status">{message}</p> : null}
    {oneTimeToken ? <section className="token-reveal" aria-live="polite"><ShieldCheck size={19} /><div><strong>Token exibido uma única vez</strong><p>Copie e configure no dispositivo agora. Ele não será salvo para consulta.</p><code>{oneTimeToken.token}</code></div><button type="button" onClick={() => void copyToken(oneTimeToken.token)} aria-label="Copiar token">{copied ? <Check size={17} /> : <Copy size={17} />}</button><button type="button" onClick={() => setOneTimeToken(null)} aria-label="Fechar token">×</button></section> : null}

    <section className="court-admin-list">
      {courts.map((court) => {
        const device = devices.find((item) => item.court_id === court.id);
        const online = device?.online ?? false;
        const lastSeen = device?.ultimo_ping ? new Date(device.ultimo_ping) : null;
        const url = `${appUrl.replace(/\/$/, "")}/${arena.slug}/${court.slug}`;
        return <article className="court-admin-card" key={court.id}>
          <header><span className="court-admin-icon"><Volleyball size={20} /></span><div><strong>{court.nome}</strong><span>{court.esporte.replaceAll("_", " ")} · {court.tipo === "externa" ? "Externa" : "Interna"}</span></div><span className={`device-status ${online ? "online" : "offline"}`}><i />{online ? "Online" : "Offline"}</span></header>
          <div className="device-detail"><span>DISPOSITIVO</span><strong>{device ? lastSeen ? `Último sinal ${new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" }).format(lastSeen)}` : "Aguardando primeiro sinal" : "Nenhum dispositivo cadastrado"}</strong>{device ? <button type="button" onClick={() => deviceAction(court, "rotate_device")} disabled={pending}><RotateCw size={15} />Rotacionar token</button> : <button type="button" onClick={() => deviceAction(court, "create_device")} disabled={pending}><Plus size={15} />Cadastrar dispositivo</button>}</div>
          <QrPrint arenaName={arena.nome} courtName={court.nome} url={url} brand={arena.cor_primaria} />
        </article>;
      })}
      {!courts.length ? <p className="panel-empty">Nenhuma quadra cadastrada ainda.</p> : null}
    </section>

    <details className="panel-tool create-court-tool"><summary><Plus size={17} />Cadastrar quadra</summary>
      <form className="panel-form court-create-form" action={createCourt}>
        <label>Nome da quadra<input name="nome" minLength={1} maxLength={80} required placeholder="Ex.: Society 3" /></label>
        <label>Endereço QR (opcional)<input name="slug" maxLength={80} placeholder="gerado-a-partir-do-nome" /></label>
        <label>Esporte<select name="esporte"><option value="futebol_society">Futebol society</option><option value="volei">Vôlei</option><option value="futevolei">Futevôlei</option><option value="beach_tennis">Beach tennis</option></select></label>
        <label>Tipo<select name="tipo"><option value="externa">Externa</option><option value="interna">Interna</option></select></label>
        <button type="submit" disabled={pending}>{pending ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />}Criar quadra</button>
      </form>
    </details>
  </div>;
}