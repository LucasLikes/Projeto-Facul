import { notFound } from "next/navigation";
import { ArenaSettingsForm } from "@/components/ArenaSettingsForm";
import { getPanelContext } from "@/lib/panel-context";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const context = await getPanelContext();
  if (!context) notFound();
  return <div className="panel-page">
    <header className="panel-page-heading"><div><span className="section-eyebrow">GESTÃO DA ARENA · PREFERÊNCIAS</span><h1>Configurações.</h1><p>Identidade, contato e retenção de mídia.</p></div></header>
    <ArenaSettingsForm arena={context.arena} editable={context.role === "owner"} />
    <p className="panel-small-note">Para alterar a retenção de vídeos já publicados, atualize também a coluna <code>expira_em</code> dos respectivos replays.</p>
  </div>;
}