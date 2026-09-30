# Fez Bonito (Likes)

MVP web mobile-first para replays de quadra, reservas e gestão de arena. Jogadores acessam por QR code, sem cadastro; donos e equipe entram no painel por link mágico.

## Estrutura

- `src/app`: rotas App Router, APIs públicas/privadas, callback do Supabase e manifest PWA.
- `src/components`: experiência pública, agenda e controles do painel.
- `src/lib`: acesso server-side ao Supabase/R2, validações Zod, regras de data e consultas.
- `supabase/migrations`: schema, constraints, RPC de rate limit/contadores e RLS.
- `supabase/seed.sql`: arena de exemplo, quatro quadras, turnos recorrentes e 20 replays fictícios.
- `public/sw.js`: service worker enxuto; faz cache de recursos estáticos, sem guardar vídeos.
- `API.md`: contrato de ingestão usado pelo serviço de borda.

O service-role key nunca é importado por componentes client. As páginas públicas consultam replays pelo servidor e não existe listagem global. Vídeos e thumbnails usam URLs assinadas do R2; o bucket deve permanecer privado.

## Requisitos

- Node.js 20.9 ou superior.
- Projeto Supabase com Auth e Postgres.
- Bucket Cloudflare R2 privado e credenciais S3 com acesso ao bucket.
- Conta Vercel para deploy e Cron de retenção.

## Rodar localmente

1. Instale as dependências e prepare as variáveis:

```bash
npm ci
cp .env.example .env.local
```

No PowerShell, use `Copy-Item .env.example .env.local` no lugar de `cp`.

2. Crie um projeto Supabase. Aplique em ordem todos os arquivos de `supabase/migrations/` no SQL Editor ou com a Supabase CLI. Depois aplique `supabase/seed.sql` para carregar a Arena Teste.

3. Preencha `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` no `.env.local`. O service-role key só deve existir em ambiente server-side.

4. Crie um bucket R2 privado. Configure `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` e `R2_BUCKET_NAME`. Defina `NEXT_PUBLIC_APP_URL` como a origem pública do app. `R2_ENDPOINT` é opcional para endpoints S3 compatíveis alternativos.

5. Inicie a aplicação:

```bash
npm run dev
```

Abra `http://localhost:3000`; a raiz encaminha para a quadra demo. Sem Supabase configurado, as páginas públicas usam dados locais de demonstração. Reservas, painel e ingestão exigem os serviços conectados.

## Criar o primeiro acesso ao painel

1. Em Supabase Auth, crie ou convide o usuário por e-mail. O endpoint de login usa `shouldCreateUser: false`, então não há autocadastro.
2. Associe o `auth.users.id` a uma arena, por exemplo:

```sql
insert into public.users_arena (id, arena_id, papel)
values ('UUID-DO-USUARIO-AUTH', '10000000-0000-4000-8000-000000000001', 'owner');
```

3. Adicione `/auth/callback` às URLs de redirect permitidas no Supabase Auth e acesse `/painel/login`.
4. Na tela Quadras, cadastre/rotacione o token. O token é mostrado uma única vez; somente o hash SHA-256 fica no banco.

## Deploy na Vercel

### Preview visual no celular

O app pode ser publicado primeiro sem conectar Supabase ou R2. Nesse modo, as páginas públicas usam a Arena Teste e thumbnails de demonstração; login do painel, reserva persistida e ingestão ficam indisponíveis.

1. Na Vercel, importe o repositório GitHub `LucasLikes/Projeto-Facul` (ou abra o projeto já conectado) e deixe o **Root Directory** vazio.
2. Use **Next.js** como Framework Preset. Mantenha Install Command, Build Command e Output Directory em **Automatic**; a Vercel detecta `npm ci` e `npm run build` pelo lockfile/framework.
3. Selecione **Node.js 22.x**.
4. A primeira implantação de cada projeto Vercel é sempre **Production**. Se o projeto já tiver uma produção, crie/envie uma branch não configurada como Production Branch (por exemplo, `mobile-preview`) e abra a URL **Preview** gerada para esse commit; não envie o teste diretamente à branch de produção.
5. Se ainda não houver uma primeira implantação e você não quiser tocar no projeto/domínio existente, crie outro projeto Vercel conectado ao mesmo repositório (por exemplo, `projeto-facul-mobile-preview`). A implantação inicial será Production apenas nesse projeto separado; depois, pushes em branches não-production geram Previews nele.
6. Para o teste visual, não cadastre valores fictícios de `.env.example`. Abra a URL HTTPS gerada pela Vercel no celular, inclusive usando rede móvel. `NEXT_PUBLIC_APP_URL` pode ficar vazia no Preview; as rotas detectam a origem atual.

### Serviços reais

1. Em **Project Settings → Environment Variables**, cadastre cada nome/valor real e selecione **Preview** e/ou **Production**. `.env.example` contém placeholders: não cadastre esses valores de exemplo. `vercel env pull` faz o inverso, baixando as variáveis já cadastradas na Vercel para uso local.
2. Obtenha `NEXT_PUBLIC_SUPABASE_URL` e a chave publicável/anon nas configurações da API do projeto Supabase. Mantenha `SUPABASE_SERVICE_ROLE_KEY` privada e nunca use o prefixo `NEXT_PUBLIC_` nela.
3. Obtenha `R2_ACCOUNT_ID` no painel Cloudflare. Crie um token S3 do R2 limitado ao bucket escolhido para leitura/escrita; use a Access Key ID, Secret Access Key e o nome exato do bucket. `R2_ENDPOINT` pode ficar vazio para o endpoint padrão Cloudflare.
4. Gere `CRON_SECRET` localmente com `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"` e cadastre o resultado diretamente na Vercel. Não envie esse valor por chat nem o versione.
5. Defina `NEXT_PUBLIC_APP_URL` como o domínio estável do ambiente; no Preview pode ficar vazia. Configure `LIKES_WHATSAPP` com o número público do engenheiro, incluindo país e DDD, para mostrar o CTA do rodapé. Não inclua service-role key, credenciais R2 ou tokens em variáveis `NEXT_PUBLIC_*`.
6. Em Supabase Auth, configure a URL do site e permita `https://SEU-DOMINIO/auth/callback`. Aplique a migration e o seed no banco.
7. Mantenha o bucket R2 privado. Para reprodução por `<video>` a partir de URL assinada, configure CORS do bucket para permitir `GET` da origem do app. O upload de ingestão ocorre diretamente do serviço de borda para URLs `PUT` assinadas.
8. `vercel.json` agenda `GET /api/cron/retention` diariamente às 06:00 UTC (03:00 em São Paulo). Configure `CRON_SECRET` na Vercel; o Cron envia `Authorization: Bearer <CRON_SECRET>`.
9. Faça novo Deploy depois de alterar variáveis; elas não atualizam deployments existentes. Verifique localmente antes de publicar:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Fuso, agenda e retenção

Datas exibidas e limites diários usam `America/Sao_Paulo`. `time_slots.dia_semana` usa 0 para domingo até 6 para sábado. Slots são recorrentes semanalmente; reservas registram data local e horários. Uma exclusão GiST impede sobreposição entre pedidos pendentes, reservas confirmadas e bloqueios na mesma quadra.

O cron processa até 100 replays expirados por execução, removendo vídeo e thumbnail do R2 antes de apagar o registro. Falhas permanecem para a execução seguinte. A retenção configurada vale para novos uploads; para alterar replays existentes, atualize `expira_em` deles conforme a política da arena.

Em **Configurações → Divulgação local**, o proprietário pode ativar um destaque com título, texto, imagem opcional e WhatsApp do anunciante. O player exibe a assinatura “Replay por Likes” como overlay visual; o arquivo original e o download não são alterados. Gravar uma marca no MP4 exigiria processamento no serviço de vídeo/borda, fora deste MVP.

## Segurança e privacidade

- RLS habilitado em todas as tabelas; membros acessam apenas arenas às quais pertencem.
- Leitura pública de replays somente por rotas server-side para vídeos visíveis e não expirados.
- IDs são UUID v4; não existe feed público global.
- O dispositivo usa Bearer token aleatório, persistido apenas como hash; rate limit atômico no Postgres.
- Reservas públicas coletam somente nome e WhatsApp digitados no formulário.
- Termos e política em `/termos` e `/privacidade` são placeholders; devem ser revisados por profissional antes da publicação.
- Nunca comite `.env.local`, service-role keys, chaves R2 ou tokens dos dispositivos.

## Fora do MVP

- Pagamento online, aplicativo nativo, login do jogador, edição/IA de vídeo e multi-câmera.
- Serviço de borda que corta e envia clipes: projeto separado; este repo fornece somente a API de ingestão.
- Upload de logo pelo painel, alertas externos/notificações push e relatórios exportáveis.
- Rate limiting antifraude de formulários públicos e captcha.
- Fluxo formal de contestação, auditoria administrativa e políticas jurídicas finais.

## Próximos passos

1. Fazer deploy de teste e validar upload/GET assinados com uma câmera real e diferentes redes móveis.
2. Definir papéis/permissões por ação e permitir seleção entre múltiplas arenas por usuário.
3. Adicionar testes de integração para RLS, idempotência, conflitos de reserva, retenção e CORS de mídia.
4. Revisar LGPD/termos, retenção histórica e processo de denúncia com assessoria jurídica.This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
