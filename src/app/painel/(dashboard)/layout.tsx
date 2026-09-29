import { redirect } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { PanelNav } from "@/components/PanelNav";
import { getPanelContext } from "@/lib/panel-context";
import "./panel.css";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const context = await getPanelContext();
  if (!context) redirect("/painel/login");
  return (
    <div className="panel-layout">
      <aside className="panel-sidebar">
        <Link className="brand-lockup panel-brand" href="/painel"><span className="brand-symbol">F</span><span className="brand-name">FEZ BONITO<span>GESTÃO DA ARENA</span></span></Link>
        <div className="panel-arena"><span>ARENA ATIVA</span><strong>{context.arena.nome}</strong><small>{context.arena.cidade}</small></div>
        <PanelNav />
        <div className="panel-sidebar-foot"><span className="panel-avatar">{context.user.email?.slice(0, 1).toUpperCase() ?? "A"}</span><span>{context.user.email}</span></div>
      </aside>
      <main className="panel-main">{children}</main>
      <div className="panel-mobile-nav"><PanelNav /></div>
    </div>
  );
}