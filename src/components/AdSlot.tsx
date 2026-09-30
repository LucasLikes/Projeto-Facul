import Image from "next/image";
import { ArrowUpRight, Sparkles } from "lucide-react";
import type { Arena } from "@/lib/domain";

export function AdSlot({ arena, placement }: { arena: Arena; placement: "agenda" | "replay" }) {
  if (arena.publicidade_ativa && arena.publicidade_titulo && arena.publicidade_texto) {
    const phone = (arena.publicidade_whatsapp || arena.telefone_whatsapp).replace(/\D/g, "");
    const message = `Olá! Vi o destaque "${arena.publicidade_titulo}" na ${arena.nome}.`;
    return <aside className={`local-promo local-promo-${placement}`} aria-label="Publicidade local">
      <div className="local-promo-copy">
        <span className="local-promo-label"><Sparkles size={14} />PARCEIRO LOCAL</span>
        <h2>{arena.publicidade_titulo}</h2>
        <p>{arena.publicidade_texto}</p>
        {phone ? <a className="local-promo-cta" href={`https://wa.me/${phone}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">Saiba mais <ArrowUpRight size={16} /></a> : null}
      </div>
      {arena.publicidade_imagem_url ? <Image className="local-promo-image" src={arena.publicidade_imagem_url} alt={arena.publicidade_titulo} width={104} height={104} unoptimized /> : null}
    </aside>;
  }

  return <aside className={`ad-slot ad-slot-${placement}`} aria-label="Espaço de publicidade: anuncie aqui">
    <strong>ANUNCIE AQUI</strong>
  </aside>;
}