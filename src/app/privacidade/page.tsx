import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <Link className="back-link" href="/">← Voltar</Link>
      <span className="section-eyebrow">FEZ BONITO · DOCUMENTO PARA REVISÃO</span>
      <h1>Privacidade</h1>
      <p className="legal-updated">Texto provisório · revisão jurídica necessária</p>
      <section><h2>Dados informados</h2><p>Jogadores não precisam criar conta. Em reservas, coletamos nome e WhatsApp para contato e gestão pela arena. Nos comentários de replay, coletamos apenas o apelido escolhido e o texto publicado; os comentários ficam visíveis para quem acessa aquele replay e podem ser removidos pela arena.</p></section>
      <section><h2>Vídeos e câmeras</h2><p>As quadras com replay possuem aviso de monitoramento. Vídeos e thumbnails são armazenados pelo período informado pela arena e removidos ao fim da retenção. Uma denúncia pode solicitar revisão e remoção antecipada.</p></section>
      <section><h2>Compartilhamento</h2><p>Quem possui o link pode visualizar um replay enquanto ele estiver ativo. O jogador escolhe se deseja compartilhar ou baixar o vídeo.</p></section>
      <section><h2>Seus direitos</h2><p>Para solicitar acesso, correção ou remoção de dados pessoais, fale com a arena responsável usando os canais de contato publicados.</p></section>
      <section><h2>Proteção contra spam</h2><p>Para limitar envios repetidos de comentários, a aplicação usa um hash temporário derivado do endereço IP por minuto. Esse hash é removido após até 10 minutos e o endereço IP não é armazenado em texto aberto.</p></section>
      <p className="legal-warning">Este conteúdo é um placeholder e deve ser revisado por profissional especializado em LGPD antes da publicação.</p>
    </main>
  );
}