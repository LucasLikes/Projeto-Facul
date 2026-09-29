import Image from "next/image";
import Link from "next/link";
import type { Arena, Court } from "@/lib/domain";
import { ThemeToggle } from "@/components/ThemeToggle";

export function ArenaHeader({ arena, court }: { arena: Arena; court: Court }) {
  return (
    <header className="arena-header" style={{ "--brand": arena.cor_primaria } as React.CSSProperties}>
      <Link className="brand-lockup" href={`/${arena.slug}/${court.slug}`} aria-label={`${arena.nome}, início`}>
        <span className="brand-symbol" aria-hidden="true">F</span>
        <span className="brand-name">FEZ BONITO<span>REPLAYS DA QUADRA</span></span>
      </Link>
      <div className="header-actions">
        {arena.logo_url ? <Image className="arena-logo" src={arena.logo_url} alt={`Logo ${arena.nome}`} width={44} height={44} unoptimized /> : null}
        <ThemeToggle />
      </div>
    </header>
  );
}