# Crazy Training

App de treino que funciona como um hub completo. A pessoa chega na academia (ou sai pra treinar na rua), abre o app e vê rápido o treino do dia: o exercício, a demonstração do movimento, séries, repetições, carga e descanso. Durante o treino ela registra o que realmente fez.

Prioridade de plataforma: **iOS primeiro**, depois Android. O desktop (web) é o **editor** de treinos: no computador a pessoa monta, edita e importa; no celular ela executa.

## Ambiente de desenvolvimento

- Windows, sem Mac. Há um iPhone e um Android para teste.
- Ainda não há conta Apple Developer (US$ 99/ano). Por isso, até a Fase 4, use **apenas módulos compatíveis com o Expo Go**. Tudo que exige development build (HealthKit, GPS em segundo plano, Live Activities, módulos nativos próprios) fica para a Fase 4.
- O build de iOS é feito na nuvem com o EAS Build, sem Xcode local.
- Este é o primeiro app mobile do dono do projeto, que já domina Angular, Node, C# e Tailwind. Sempre que aparecer um conceito específico de mobile (ciclo de vida do app, permissões, builds, regras da App Store), explique brevemente.

## Stack

| Camada | Escolha |
|---|---|
| Monorepo | npm workspaces (o Expo configura o Metro para o monorepo sozinho) |
| App (`apps/mobile`) | Expo SDK 57 + React Native + TypeScript, expo-router (tab bar nativa `expo-router/unstable-native-tabs`, abas em JS só na web), expo-symbols, NativeWind 4 (Tailwind 3). O mesmo código gera a versão web do editor desktop. |
| Dados no aparelho | expo-sqlite + Drizzle ORM. **Offline-first**: o app funciona 100% sem internet. |
| API (`apps/api`) | NestJS 12 (ESM) + PostgreSQL + Drizzle, testes com Vitest, lint com oxlint. Deploy via `apps/api/Dockerfile` na Railway (`railway.json`). |
| Local | `docker-compose.yml` sobe o Postgres |
| Compartilhado (`packages/shared`) | Schemas zod do formato de treino, import/export CSV, duração estimada e calorias (MET) |
| IA | API do Claude, **somente no backend**. A chave nunca vai para o app. |
| Exercícios | [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (domínio público) traduzido para pt-BR, com link opcional de YouTube por exercício |

## Decisões de produto

- **Público:** primeiro uso pessoal via TestFlight; depois App Store.
- **Modalidades:** musculação; corrida/caminhada com GPS; funcional/HIIT (EMOM, AMRAP, Tabata, circuito); mobilidade/alongamento.
- **Durante o treino:** timer de descanso automático com notificação local; registro de carga e reps feitas; histórico e progressão ("semana passada: 40 kg × 10"); estimativa de calorias (MET × peso × duração); Apple Saúde/Watch na Fase 4.
- **Perfil:** peso, altura, idade, objetivo, nível, dias disponíveis e equipamento (academia, casa ou rua). O perfil alimenta as calorias e a geração de treino.
- **Conta:** login opcional (Apple + Google). Sem login tudo fica no aparelho; com login, os dados sincronizam com a nuvem e com o desktop.
- **De onde vêm os treinos:**
  1. Importação por IA integrada: PDF, print, planilha ou texto vai pro backend, que manda pro Claude e devolve o treino validado pelo schema.
  2. Importação manual: o app mostra um prompt pronto, a pessoa cola no ChatGPT/Gemini/Claude e cola de volta o CSV.
  3. Geração por IA a partir do perfil.
  4. Biblioteca de modelos (ABC, Push/Pull/Legs, Full Body, 5x5, planilhas de corrida, circuitos).
  5. Editor manual.
  6. Compartilhamento entre usuários (link ou arquivo).
- **Toda importação ou geração por IA passa por uma tela de revisão antes de salvar.** A IA erra, e o usuário confirma.
- Treinos de terceiros (ex.: de youtubers) podem ser importados para uso pessoal, mas não entram na biblioteca pública sem autorização.

## Design

- Direção **iOS nativo e minimalista**: o app deve parecer feito pela Apple (iOS 26). Tab bar nativa com Liquid Glass, títulos grandes, listas agrupadas, botões em cápsula, SF Symbols, modo claro e escuro. A única cor nossa é a de destaque. (A primeira direção, "lambe-lambe", foi descartada pelo dono do projeto por parecer jogo.)
- Ao criar ou mudar UI, use a skill `ios-nativo` (`.claude/skills/ios-nativo`), que tem tokens, componentes e regras. A `frontend-design` vale para o processo, mas o visual é o do iOS.
- Tokens em `apps/mobile/src/theme/tokens.json` (claro e escuro), lidos pelo Tailwind e pelo código. Componentes base em `apps/mobile/src/components`.
- A **tela de execução do treino** precisa ser legível a um braço de distância, com alvos de toque grandes (mão suada, luva) e a ação principal ao alcance do polegar.

## Convenções

- Código, nomes de arquivos e identificadores em inglês. Textos da interface em pt-BR, centralizados para permitir i18n depois.
- Unidades: kg, km, minutos.
- O schema zod em `packages/shared` é a fonte da verdade do formato de treino: app, API, CSV e saída da IA validam contra ele.
- `packages/shared` sem extensão nos imports relativos. O app lê o código-fonte direto (condição `react-native`/`browser` no `exports`); a API usa o build (`dist/`, gerado com tsdown). Mudou o shared? `npm run dev:api` já refaz o build.
- API em ESM: imports relativos com `.js` (`./health.controller.js`), como o Nest 12 gera.
- No app, siga também `apps/mobile/AGENTS.md` (regras do Expo): instale pacotes com `npx expo install`, consulte a doc da versão do SDK e só use módulos que existem no Expo Go.

## Comandos (na raiz)

```bash
npm run dev:mobile        # Expo; QR code para o Expo Go no iPhone (dev:mobile:tunnel se a rede bloquear)
npm run db:up             # Postgres local no Docker
npm run dev:api           # build do shared + API em watch (precisa de apps/api/.env)
npm test                  # unitários (shared e api)
npm run typecheck         # todos os pacotes
npm run test:e2e -w @crazy-training/api
npm run lint -w @crazy-training/api && npm run lint -w @crazy-training/mobile
```

Antes de dar uma tarefa como pronta: typecheck, testes e lint do pacote que mudou.

## Roadmap

- **Fase 0 — Fundação:** monorepo; app rodando no iPhone via Expo Go; tokens de design e componentes base; API + Postgres local (Docker) e na Railway. *Feita, exceto o primeiro deploy na Railway, que depende da conta do dono do projeto (passo a passo no README).*
- **Fase 1 — Musculação offline (uso pessoal):** perfil; base de exercícios pt-BR; editor manual; execução com timer e registro; histórico; import manual (prompt + CSV) e export.
- **Fase 2 — IA + conta:** import integrado; geração pelo perfil; biblioteca de modelos; login Apple/Google e sync; editor desktop (web); compartilhamento por link.
- **Fase 3 — Outras modalidades:** timers de HIIT/funcional; mobilidade; calorias (MET); corrida/caminhada com GPS em primeiro plano.
- **Fase 4 — Nativo (exige conta Apple):** development build; GPS em segundo plano; Apple Saúde/Watch; TestFlight e App Store; Play Store.
