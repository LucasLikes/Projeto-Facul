# API de ingestao

As rotas de ingestao sao usadas somente pelo servico de borda. Todas exigem HTTPS e o token do dispositivo no cabecalho `Authorization: Bearer <token>`. O banco armazena apenas SHA-256 do token. Gere tokens aleatorios com pelo menos 32 caracteres; nunca os envie ao navegador.

O limite padrao e 30 requisicoes por dispositivo por minuto (`INGEST_RATE_LIMIT_PER_MINUTE`). A janela e mantida no Postgres para funcionar entre instancias serverless. Limites excedidos retornam `429`.

## 1. Solicitar URLs de upload

`POST /api/ingest/presign` cria um replay invisivel e retorna URLs S3 assinadas, validas por cinco minutos. Grave `replay_id` para a confirmacao.

```bash
curl -X POST "$APP_URL/api/ingest/presign" \
  -H "Authorization: Bearer $DEVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "capturado_em": "2026-09-28T21:15:30-03:00",
    "duracao_s": 35,
    "tamanho_bytes": 24000000,
    "video_content_type": "video/mp4",
    "thumb_content_type": "image/jpeg"
  }'
```

O timestamp e normalizado para UTC. Repetir a solicitacao com o mesmo dispositivo e `capturado_em` retorna o mesmo replay e as mesmas chaves; dados diferentes para a mesma chave retornam `409`. Um replay ja publicado retorna `visivel: true` sem URLs para nao permitir sobrescrita.

## 2. Enviar os arquivos

Envie o conteudo binario diretamente para cada URL, sem passar pela aplicacao. Use exatamente os tipos de conteudo informados ao solicitar as URLs. O tamanho do video precisa corresponder a `tamanho_bytes`; a thumbnail pode ter no maximo 10 MB.

```bash
curl -X PUT "$VIDEO_URL" \
  -H "Content-Type: video/mp4" \
  -H "Content-Length: $(wc -c < lance.mp4 | tr -d ' ')" \
  --data-binary @lance.mp4

curl -X PUT "$THUMB_URL" \
  -H "Content-Type: image/jpeg" \
  --data-binary @thumbnail.jpg
```

As URLs sao credenciais temporarias: nao as registre em logs publicos nem as compartilhe.

## 3. Confirmar o upload

`POST /api/ingest/confirm` verifica a presenca e o tamanho dos dois objetos com `HEAD` no R2. O replay so fica visivel depois dessa validacao. A confirmacao pode ser repetida com seguranca.

```bash
curl -X POST "$APP_URL/api/ingest/confirm" \
  -H "Authorization: Bearer $DEVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"replay_id":"00000000-0000-4000-8000-000000000001"}'
```

## 4. Heartbeat

Envie periodicamente (por exemplo, a cada minuto) para atualizar `ultimo_ping` e marcar o dispositivo como online.

```bash
curl -X POST "$APP_URL/api/ingest/heartbeat" \
  -H "Authorization: Bearer $DEVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Respostas e operacao

- `400`: corpo invalido; detalhes internos de validacao nao sao retornados.
- `401`: token ausente, invalido ou revogado.
- `409`: conflito de idempotencia, upload incompleto ou arquivo fora do tamanho esperado.
- `429`: limite do dispositivo excedido.
- `503`: banco ou R2 indisponivel; repetir com backoff exponencial.
- `GET /api/cron/retention`: rota agendada, autenticada por `Authorization: Bearer $CRON_SECRET`; remove ate 100 replays expirados por execucao. Objetos com falha permanecem para uma tentativa posterior.

O identificador de replay e UUID aleatorio v4. Listagem publica global nao existe; replays sao encontrados por quadra e horario. URLs de leitura sao temporarias e emitidas pelas rotas publicas do servidor.