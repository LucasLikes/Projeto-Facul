import { MessageCircle } from "lucide-react";
import { getEnv } from "@/lib/env";

export function LikesCredit() {
  const phone = getEnv("LIKES_WHATSAPP")?.replace(/\D/g, "");
  const message = encodeURIComponent("Olá! Vi o trabalho da Likes no Fez Bonito e gostaria de conversar.");
  return <aside className="likes-credit" aria-label="Créditos do produto">
    <span className="likes-credit-mark" aria-hidden="true">L</span>
    <span><strong>Engenharia de software por Likes</strong><small>Produto local para quem vive a quadra.</small></span>
    {phone ? <a className="likes-credit-contact" href={`https://wa.me/${phone}?text=${message}`} target="_blank" rel="noreferrer"><MessageCircle size={16} />Falar comigo</a> : null}
  </aside>;
}