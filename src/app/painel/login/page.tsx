import Link from "next/link";
import { getEnv } from "@/lib/env";
import { PanelLoginForm } from "@/components/PanelLoginForm";
import { z } from "zod";

const errorSchema = z.enum(["link-invalido", "indisponivel"]);

export default async function PanelLoginPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const query = await searchParams;
  const parsedError = errorSchema.safeParse(query.erro);
  const initialError = parsedError.success
    ? parsedError.data === "indisponivel" ? "O serviço de autenticação está indisponível." : "Este link expirou ou já foi usado. Solicite outro."
    : "";
  const configured = Boolean(getEnv("NEXT_PUBLIC_SUPABASE_URL") && getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
  return (
    <main className="login-page">
      <div className="login-topline"><Link className="brand-lockup" href="/"><span className="brand-symbol">F</span><span className="brand-name">FEZ BONITO<span>PAINEL DA ARENA</span></span></Link><Link href="/" className="login-back">Ver quadra ↗</Link></div>
      <section className="login-content">
        <span className="section-eyebrow">ÁREA DA ARENA</span>
        <h1>O jogo também acontece fora da quadra.</h1>
        <p>Entre para acompanhar reservas, replays e o movimento da sua arena.</p>
        <PanelLoginForm configured={configured} initialError={initialError} />
        <span className="login-privacy">Acesso exclusivo para equipes cadastradas.</span>
      </section>
    </main>
  );
}