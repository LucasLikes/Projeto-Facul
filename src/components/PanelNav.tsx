"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, ChartNoAxesColumn, CirclePlay, LogOut, Settings2, Volleyball } from "lucide-react";

const links = [
  { href: "/painel", label: "Visão geral", icon: ChartNoAxesColumn, exact: true },
  { href: "/painel/agenda", label: "Agenda", icon: CalendarDays, exact: false },
  { href: "/painel/replays", label: "Replays", icon: CirclePlay, exact: false },
  { href: "/painel/quadras", label: "Quadras", icon: Volleyball, exact: false },
  { href: "/painel/configuracoes", label: "Configurações", icon: Settings2, exact: false },
];

export function PanelNav() {
  const pathname = usePathname();
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/painel/login");
    router.refresh();
  }

  return <>
    <nav className="panel-nav" aria-label="Navegação do painel">
      {links.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return <Link href={href} className={active ? "active" : ""} aria-current={active ? "page" : undefined} key={href}><Icon size={19} /><span>{label}</span></Link>;
      })}
    </nav>
    <button className="panel-logout" type="button" onClick={() => void logout()}><LogOut size={17} /><span>Sair</span></button>
  </>;
}