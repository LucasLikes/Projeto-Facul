import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="legal-page">
      <Link className="back-link" href="/">← Voltar</Link>
      <span className="section-eyebrow">FEZ BONITO · DOCUMENTO PARA REVISÃO</span>
      <h1>Termos de uso</h1>
      <p className="legal-updated">Texto provisório · revisão jurídica necessária</p>
      <section><h2>Uso do serviço</h2><p>A plataforma permite visualizar, compartilhar e baixar vídeos capturados nas quadras participantes, além de enviar solicitações de reserva. O uso deve respeitar as pessoas presentes no espaço e as regras da arena.</p></section>
      <section><h2>Captura e disponibilidade</h2><p>As quadras participantes são monitoradas por câmeras. Os vídeos ficam disponíveis pelo período informado na página da quadra e podem ser removidos antes desse prazo após análise de uma denúncia.</p></section>
      <section><h2>Reservas</h2><p>Uma solicitação enviada pelo site permanece pendente até confirmação da arena. O envio não representa pagamento nem confirmação automática do horário.</p></section>
      <section><h2>Contato</h2><p>Dúvidas e pedidos de remoção podem ser encaminhados à arena pelos canais indicados no próprio espaço.</p></section>
      <p className="legal-warning">Este conteúdo é um placeholder e não substitui análise por profissional jurídico.</p>
    </main>
  );
}