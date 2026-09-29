# Crazy Training

App de treino: você abre o app na academia ou na rua e vê o treino do dia, como fazer cada movimento, séries, repetições, carga e descanso, e registra o que fez. iOS primeiro, depois Android; no computador, o mesmo app vira o editor de treinos.

Decisões de produto, stack e roadmap ficam no [CLAUDE.md](CLAUDE.md).

## Estrutura

```
apps/mobile/       App Expo (React Native + TypeScript + NativeWind): iOS, Android e web
apps/api/          API NestJS + Drizzle + Postgres (deploy na Railway via Docker)
packages/shared/   Schema do treino (zod), import/export CSV, duração e calorias
docker-compose.yml Postgres local
railway.json       Configuração do deploy da API
```

## Pré-requisitos

- Node 24 (veja `.nvmrc`) e npm
- Docker Desktop, para o Postgres local
- No iPhone: o app **Expo Go**, da App Store

## Primeiros passos

```bash
npm install
```

### App no iPhone (Expo Go)

```bash
npm run dev:mobile
```

1. O terminal mostra um QR code.
2. Com o iPhone na **mesma rede Wi-Fi** do computador, aponte a câmera para o QR code e toque na notificação: o app abre no Expo Go.
3. Cada vez que você salva um arquivo, o app atualiza na hora (Fast Refresh).

Se o iPhone não conectar (firewall do Windows ou rede com isolamento entre aparelhos), libere o Node.js para redes privadas no firewall ou use o túnel, que é mais lento mas funciona em qualquer rede:

```bash
npm run dev:mobile:tunnel
```

Para ver no navegador, aperte `w` no terminal do Expo.

### API + banco local

```bash
npm run db:up                                # Postgres no Docker
cp apps/api/.env.example apps/api/.env       # só na primeira vez
npm run dev:api                              # http://localhost:3000/health
```

## Testes e verificações

```bash
npm test                                     # testes unitários (shared e api)
npm run typecheck                            # TypeScript em todos os pacotes
npm run test:e2e -w @crazy-training/api      # API contra o Postgres local (precisa do db:up)
npm run lint -w @crazy-training/api
npm run lint -w @crazy-training/mobile
```

## Deploy da API na Railway

O `railway.json` já diz à Railway para construir `apps/api/Dockerfile` e usar `/health` como verificação de saúde. Só redeploya quando algo em `apps/api`, `packages/shared` ou no lockfile muda.

1. Envie o repositório para o GitHub (`git push`).
2. Na Railway: **New Project → Deploy from GitHub repo** e escolha este repositório.
3. No mesmo projeto: **+ New → Database → PostgreSQL**.
4. No serviço da API, em **Variables**, crie `DATABASE_URL` com o valor `${{Postgres.DATABASE_URL}}`. A `PORT` a Railway define sozinha.
5. Em **Settings → Networking → Generate Domain**, gere uma URL pública e abra `https://<sua-url>/health`. A resposta esperada é `{"status":"ok","database":"up"}`.

O app mobile não é hospedado: ele vai para o iPhone pelo Expo Go agora, e pela TestFlight/App Store quando houver a conta Apple Developer (Fase 4).
