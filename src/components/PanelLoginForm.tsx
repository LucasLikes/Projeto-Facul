"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Check, LoaderCircle, Mail } from "lucide-react";

export function PanelLoginForm({ configured, initialError }: { configured: boolean; initialError: string }) {
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState(initialError);
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setMessage("");
    startTransition(async () => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.get("email") }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(payload?.error?.message ?? "Não foi possível enviar o link.");
        return;
      }
      setSent(true);
    });
  }

  if (sent) return <div className="login-sent" aria-live="polite"><span><Check size={21} /></span><strong>Confira seu e-mail.</strong><p>Enviamos um link de acesso. Ele expira em breve.</p></div>;

  return <form className="login-form" action={submit}>
    <label htmlFor="email">E-mail da arena</label>
    <input id="email" name="email" type="email" autoComplete="email" maxLength={254} required placeholder="voce@arena.com.br" />
    {message ? <p className="login-error" role="alert">{message}</p> : null}
    <button type="submit" disabled={!configured || isPending}>
      {isPending ? <LoaderCircle className="spin" size={18} /> : <Mail size={18} />}
      <span>{configured ? "Enviar link de acesso" : "Supabase não configurado"}</span>
      {!isPending && configured ? <ArrowRight size={18} /> : null}
    </button>
    {!configured ? <p className="login-hint">Adicione as variáveis do Supabase para ativar o login.</p> : null}
  </form>;
}