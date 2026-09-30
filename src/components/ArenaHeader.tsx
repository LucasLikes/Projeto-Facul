import Image from "next/image";
import Link from "next/link";
import { Menu, MessageCircle } from "lucide-react";
import type { Arena, Court } from "@/lib/domain";
import { ThemeToggle } from "@/components/ThemeToggle";

export function ArenaHeader({ arena, court, courts = [court] }: { arena: Arena; court: Court; courts?: Court[] }) {
  const whatsapp = arena.telefone_whatsapp.replace(/\D/g, "");
  return (
    <header className="arena-header" style={{ "--brand": arena.cor_primaria } as React.CSSProperties}>
      <Link className="brand-lockup" href={`/${arena.slug}/${court.slug}`} aria-label={`${arena.nome}, início`}>
        <span className="brand-symbol" aria-hidden="true">F</span>
        <span className="brand-name">FEZ BONITO<span>REPLAYS DA QUADRA</span></span>
      </Link>
      <div className="header-actions">
        {arena.logo_url ? <Image className="arena-logo" src={arena.logo_url} alt={`Logo ${arena.nome}`} width={44} height={44} unoptimized /> : null}
        <details className="arena-menu">
          <summary title="Opções da arena" aria-label="Abrir opções da arena"><Menu size={20} /></summary>
          <div className="arena-menu-panel">
            <span className="section-eyebrow">ESCOLHER QUADRA</span>
            <nav aria-label="Quadras da arena">
              {courts.map((item) => <Link className={item.id === court.id ? "active" : ""} href={`/${arena.slug}/${item.slug}`} key={item.id} aria-current={item.id === court.id ? "page" : undefined}>{item.nome}<span>{item.id === court.id ? "Atual" : "Abrir"}</span></Link>)}
            </nav>
            {whatsapp ? <a className="arena-whatsapp-link" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer"><MessageCircle size={17} />WhatsApp da arena</a> : <span className="arena-menu-hint">WhatsApp ainda não cadastrado</span>}
          </div>
        </details>
        <ThemeToggle />
      </div>
    </header>
  );
}