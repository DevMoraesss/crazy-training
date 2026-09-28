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
| Monorepo | pnpm workspaces |
| App (`apps/mobile`) | Expo + React Native + TypeScript, expo-router, NativeWind (Tailwind). O mesmo código gera a versão web do editor desktop. |
| Dados no aparelho | expo-sqlite + Drizzle ORM. **Offline-first**: o app funciona 100% sem internet. |
| API (`apps/api`) | NestJS + PostgreSQL + Drizzle. Deploy via Dockerfile na Railway. |
| Local | `docker-compose.yml` sobe o Postgres |
| Compartilhado (`packages/shared`) | Schemas zod (Treino, Exercício, Sessão), formato de import/export (JSON e CSV), cálculos (MET/calorias) |
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

- Direção: **"Crazy / zine de rua"**: energético e ousado, com choque de cores, tipografia pesada, cara de adesivo e de cultura de rua. Assume o "Crazy" do nome.
- Use a skill `frontend-design` (`.claude/skills/frontend-design`) ao criar ou mudar UI. Evite o "kit SaaS": cards idênticos com o mesmo arredondamento, sombra cinza genérica, gradiente decorativo e rótulos em CAPS em cima de tudo.
- A ousadia fica na identidade (cores, tipografia, momentos de destaque). A **tela de execução do treino** precisa ser legível a um braço de distância, com alvos de toque grandes (mão suada, luva) e a ação principal ao alcance do polegar.
- Tokens de design (cores, tipografia, espaçamento): a definir na Fase 0.

## Convenções

- Código, nomes de arquivos e identificadores em inglês. Textos da interface em pt-BR, centralizados para permitir i18n depois.
- Unidades: kg, km, minutos.
- O schema zod em `packages/shared` é a fonte da verdade do formato de treino: app, API, CSV e saída da IA validam contra ele.

## Roadmap

- **Fase 0 — Fundação:** monorepo; app rodando no iPhone via Expo Go; tokens de design e componentes base; API + Postgres local (Docker) e na Railway.
- **Fase 1 — Musculação offline (uso pessoal):** perfil; base de exercícios pt-BR; editor manual; execução com timer e registro; histórico; import manual (prompt + CSV) e export.
- **Fase 2 — IA + conta:** import integrado; geração pelo perfil; biblioteca de modelos; login Apple/Google e sync; editor desktop (web); compartilhamento por link.
- **Fase 3 — Outras modalidades:** timers de HIIT/funcional; mobilidade; calorias (MET); corrida/caminhada com GPS em primeiro plano.
- **Fase 4 — Nativo (exige conta Apple):** development build; GPS em segundo plano; Apple Saúde/Watch; TestFlight e App Store; Play Store.
