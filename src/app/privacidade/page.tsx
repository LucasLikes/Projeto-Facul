import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <Link className="back-link" href="/">← Voltar</Link>
      <span className="section-eyebrow">FEZ BONITO · DOCUMENTO PARA REVISÃO</span>
      <h1>Privacidade</h1>
      <p className="legal-updated">Texto provisório · revisão jurídica necessária</p>
      <section><h2>Dados informados</h2><p>Jogadores não precisam criar conta. Coletamos nome e WhatsApp somente quando esses dados são preenchidos em uma solicitação de reserva. Eles são usados para contato e gestão do pedido pela arena.</p></section>
      <section><h2>Vídeos e câmeras</h2><p>As quadras com replay possuem aviso de monitoramento. Vídeos e thumbnails são armazenados pelo período informado pela arena e removidos ao fim da retenção. Uma denúncia pode solicitar revisão e remoção antecipada.</p></section>
      <section><h2>Compartilhamento</h2><p>Quem possui o link pode visualizar um replay enquanto ele estiver ativo. O jogador escolhe se deseja compartilhar ou baixar o vídeo.</p></section>
      <section><h2>Seus direitos</h2><p>Para solicitar acesso, correção ou remoção de dados pessoais, fale com a arena responsável usando os canais de contato publicados.</p></section>
      <p className="legal-warning">Este conteúdo é um placeholder e deve ser revisado por profissional especializado em LGPD antes da publicação.</p>
    </main>
  );
}