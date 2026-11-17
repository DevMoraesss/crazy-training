# Crazy Training

Aplicativo web para usar no navegador do iPhone, Android e computador. Você vê o treino do dia, como fazer cada movimento, séries, repetições, carga e descanso, e registra o que fez. A aba Alimentação reúne seu plano e diário alimentar. O assistente tem questionário inicial, revisão e aplicação de sugestões; a geração real depende de configurar o provedor no servidor.

A prioridade é validar localmente antes de publicar a interface na Vercel e a API com Postgres na Railway. A implementação reaproveita Expo para web, sem precisar instalar Expo Go ou gerar um aplicativo nativo.

Decisões de produto, stack e roadmap ficam no [CLAUDE.md](CLAUDE.md).

## O que já funciona

- **Hoje:** o próximo treino do rodízio (A → B → C → A), com os exercícios e o tempo estimado. Um treino interrompido aparece para continuar.
- **Execução:** foto do movimento (as duas posições se alternando), "Como fazer" e link para vídeo; repetições e carga pré-preenchidas com o que você fez na última vez; timer de descanso (no app nativo, avisa também com a tela bloqueada; na web, o aviso só aparece com a página aberta); desfazer série, pular exercício e resumo no fim (duração, volume e calorias).
- **Treinos:** vários programas, um ativo. Editor completo (treinos, exercícios, séries, repetições, carga, descanso e ordem) com busca na base de exercícios em português. Exporta CSV.
- **Importar:** o app dá um prompt pronto. Você cola no ChatGPT, Gemini ou Claude junto com o seu treino (PDF, foto ou planilha) e cola de volta o CSV da resposta, ou abre o arquivo. Antes de salvar, você revisa o que foi reconhecido.
- **Calendário:** atividades por data, frequência semanal por dias únicos e detalhes das sessões. Corrida, caminhada, ciclismo, natação e musculação manual contam como dia ativo. Duas atividades no mesmo dia contam uma vez. Registros manuais não avançam o rodízio do programa. Atividades concluídas podem ser registradas em datas anteriores; não há agendamento futuro ou sincronização com relógios.
- **Perfil:** peso, altura, objetivo, nível, onde treina e dias por semana. O peso alimenta a estimativa de calorias.
- **Alimentação:** refeições reutilizáveis do plano, diário por data, descrição de alimentos e porções, calorias/macronutrientes opcionais e metas manuais. Valores não informados são sinalizados como parciais. Editar o plano não muda o diário já registrado. Ainda não há reconhecimento de alimentos por foto, cálculo por banco de alimentos ou sincronização.

- **Meu plano:** questionário em carrossel, com perguntas curtas, progresso, navegação de voltar/continuar e revisão final com corpo, objetivo, rotina, preferências e restrições. Preenche o perfil, pede consentimento antes de enviar respostas à IA e permite revisar a sugestão antes de atualizar metas, adicionar refeições e ativar um programa. Histórico, diário e planos anteriores são preservados. A aplicação é transacional e só ocorre uma vez por sugestão.

O banco aplica migrações novas ao abrir, sem apagar treinos existentes. Na web, uma conexão é compartilhada durante o Fast Refresh e apenas uma aba por origem pode usar o SQLite; a segunda aba orienta fechar a primeira e permite tentar novamente. Isso evita o conflito de `createSyncAccessHandle`. Um patch aplicado automaticamente na instalação corrige o timeout prematuro das operações web do SQLite 58: a espera passa a ter um limite real de 15 segundos. O teste `npm run test:sqlite-web` verifica respostas atrasadas e workers sem resposta. O layout web usa título grande, navegação inferior e largura limitada no desktop, mantendo as cores clara/escura do projeto.

## Estrutura

```
apps/mobile/       App Expo (React Native + TypeScript + NativeWind): iOS, Android e web
apps/api/          API NestJS + Drizzle + Postgres (deploy na Railway via Docker)
packages/shared/   Schema do treino (zod), import/export CSV, duração e calorias
PostgreSQL nativo  Banco local (sem Docker)
railway.json       Configuração do deploy da API
```

## Pré-requisitos

- Node 24 (veja `.nvmrc`) e npm
- PostgreSQL instalado diretamente na máquina, com usuário e banco próprios para o projeto (sem Docker)
- Navegador atualizado para testar a versão web

## Primeiros passos

```bash
npm install
```

### Web local (fluxo principal)

```bash
npm run dev:web
```

O comando gera o build e serve uma prévia em **http://localhost:8081** no computador, com os cabeçalhos exigidos pelo SQLite. O servidor precisa continuar rodando durante o teste local. Editor, perfil, importação CSV, execução e histórico usam o banco do navegador: não é necessário subir API ou Postgres para esses fluxos.

Essa prévia não tem atualização automática ao editar o código. Depois de alterar o app, execute `npm run build:web` e recarregue a página. Para servir um build já gerado, use `npm run preview:web`. O comando `dev:web` verifica a porta antes do build e interrompe se ela estiver ocupada. Encerre o processo que ocupa a porta com `Ctrl+C` antes de iniciar a prévia. Para manter seus dados existentes na origem `http://localhost:8083`, use:

```bash
WEB_PORT=8083 npm run dev:web
```

Abra **http://localhost:8083** diretamente em uma aba. Não execute `expo start --port 8083` nesse fluxo: o HTML servido diretamente pelo Expo pode não enviar os cabeçalhos de isolamento, mesmo que a URL seja a mesma. Se a página já estava aberta com esse erro, use **Recarregar página** depois de iniciar a prévia. Os cabeçalhos só passam a valer numa nova navegação; repetir a abertura do banco na página antiga não resolve. Não é preciso apagar dados nem alterar a senha do PostgreSQL.

### Web com atualização automática

Use dois terminais, mantendo a prévia da porta 8081 se desejar:

```bash
# Terminal 1: Metro e Expo Go na porta 8082
npm run dev:expo

# Terminal 2: acesso web com os cabeçalhos necessários ao SQLite
npm run dev:web:proxy
```

Abra **http://localhost:8083** no navegador. O proxy preserva os arquivos e WebSockets do Metro e adiciona COOP/COEP também à resposta HTML. No modo SPA, o Expo pode responder ao HTML antes do `enhanceMiddleware` do Metro: abrir diretamente `http://localhost:8082` pode causar `SharedArrayBuffer is not defined`, encapsulado pelo Drizzle como falha ao criar `__drizzle_migrations`.

Não é necessário apagar o banco para resolver esse problema. O proxy atende somente o computador local; acesso por celular via rede continua exigindo HTTPS confiável. Cada porta é uma origem diferente e tem seus próprios dados locais: a 8083 não compartilha automaticamente o banco da 8081/8082. Encerre os processos de prévia, Metro e proxy que iniciou ao terminar os testes.

Os dados ficam separados por navegador e endereço. Sem entrar na conta, PC e celular não sincronizam; limpar os dados do site pode apagar os registros. Exportar CSV preserva apenas o programa, não o histórico ou perfil.

Para verificar também a geração da versão de produção:

```bash
npm run build:web
```

O resultado fica em `apps/mobile/dist/`. O servidor `scripts/serve-web.mjs` inclui fallback de rotas para `index.html`, MIME de WASM e os cabeçalhos COOP/COEP usados pelo SQLite. Essas configurações também serão necessárias na hospedagem futura.

### Teste no celular pela rede local

O celular e o computador precisam estar na mesma rede, com a porta do servidor liberada no firewall. **Acessar somente `http://IP-DO-PC:8081` não é suficiente para o banco web atual**: o SQLite usa `SharedArrayBuffer`, que exige um contexto seguro e isolamento entre origens.

Para esse teste, configure um proxy HTTPS local com certificado para o IP ou hostname do computador e confie na autoridade certificadora no aparelho. O proxy deve encaminhar para a porta 8081 e preservar os cabeçalhos `Cross-Origin-Opener-Policy: same-origin` e `Cross-Origin-Embedder-Policy: require-corp`. Não basta ignorar o aviso de certificado. Veja o [guia de HTTPS local do Expo](https://docs.expo.dev/guides/local-https-development/).

PWA, abertura offline e notificações web ainda precisam ser implementadas e validadas; manter dados locais não garante que a página abra sem o servidor. No código atual, as notificações de descanso estão desativadas na web.

### Alternativa nativa de desenvolvimento (fora do fluxo principal)

O projeto usa **Expo SDK 58**. O Expo Go do aparelho precisa suportar esse SDK. No iPhone físico, não é possível instalar versões antigas do Expo Go para executar SDKs anteriores.

Para testar no Expo Go sem interromper a prévia web na porta 8081, abra **outro terminal**:

```bash
npm run dev:expo
```

Esse comando usa a porta **8082**. Com o celular e o PC na mesma rede Wi-Fi, abra o QR code no Expo Go. Depois de atualizar o SDK ou as dependências, encerre apenas o Metro antigo com Ctrl+C e reinicie com cache limpo:

```bash
npm run start -w @crazy-training/mobile -- --port 8082 --clear
```

O Metro precisa continuar rodando para esse teste de desenvolvimento. Os dados do Expo Go ficam no aparelho, separados dos dados da versão web. A prévia web serve arquivos de `apps/mobile/dist/`: atualizar dependências ou iniciar Metro não substitui esse build. Valide novos builds em outra pasta antes de substituir uma prévia em uso.

Os comandos abaixo também permanecem disponíveis para desenvolvimento nativo. Expo Go não é requisito para usar a versão web.

```bash
npm run dev:mobile
```

O terminal mostra as opções de abertura e o QR code para clientes nativos compatíveis. Cada vez que você salva um arquivo, o app atualiza na hora (Fast Refresh).

Se o iPhone não conectar (firewall do Windows ou rede com isolamento entre aparelhos), libere o Node.js para redes privadas no firewall ou use o túnel, que é mais lento mas funciona em qualquer rede:

```bash
npm run dev:mobile:tunnel
```

Para ver no navegador, aperte `w` no terminal do Expo.

### API + banco local

```bash
npm run db:status                            # verifica o PostgreSQL nativo
# Configure DATABASE_URL em apps/api/.env e aplique as migrações:
npm run db:migrate
npm run dev:api                              # http://localhost:3000/health
```

## Testes e verificações

```bash
npm test                                     # testes unitários (shared e api)
npm run typecheck                            # TypeScript em todos os pacotes
npm run test:e2e -w @crazy-training/api      # API contra o Postgres local (banco nativo isolado, com migrações aplicadas)
npm run lint -w @crazy-training/api
npm run lint -w @crazy-training/mobile
```

## Publicar: API na Railway e interface na Vercel

As duas plataformas publicam sozinhas a partir da branch `main` do GitHub. A ordem importa: primeiro a API (a Vercel precisa da URL dela).

### 1. API e banco na Railway

O `railway.json` manda construir `apps/api/Dockerfile` e usar `/health` como verificação de saúde. Ao subir, o container aplica as migrações novas do banco (`dist/migrate.js`) e só então inicia a API; se a migração falhar, a versão anterior continua no ar.

1. Na Railway: **New Project → Deploy from GitHub repo** e escolha este repositório (branch `main`).
2. No mesmo projeto: **+ New → Database → PostgreSQL**.
3. No serviço da API, em **Variables**:

   | Variável            | Valor                                                                        |
   | ------------------- | ---------------------------------------------------------------------------- |
   | `DATABASE_URL`      | `${{Postgres.DATABASE_URL}}`                                                 |
   | `ACCOUNT_EMAIL`     | seu e-mail de login no app                                                   |
   | `ACCOUNT_PASSWORD`  | senha do app, com 12 caracteres ou mais                                      |
   | `WEB_ORIGINS`       | a URL da Vercel, por exemplo `https://crazy-training.vercel.app` (sem `/` no fim) |
   | `ANTHROPIC_API_KEY` | sua chave da API do Claude (opcional; sem ela o app funciona sem IA)         |

   A `PORT` a Railway define sozinha, e o `NODE_ENV=production` vem do Dockerfile.
4. Em **Settings → Networking → Generate Domain**, gere a URL pública e abra `https://<url-da-api>/health`. A resposta esperada é `{"status":"ok","database":"up"}`.

### 2. Interface na Vercel

O `vercel.json` já define o build (`npm run build:web`), a pasta publicada (`apps/mobile/dist`), os cabeçalhos que o banco do navegador exige e o proxy `/api`.

1. Na Vercel: **Add New → Project**, importe este repositório e deixe **Root Directory** na raiz do repositório. Framework: **Other**.
2. Em **Environment Variables**, crie `API_PROXY_URL` com a URL HTTPS da API na Railway (por exemplo `https://crazy-training-api.up.railway.app`).
3. Faça o deploy e copie a URL final. Se ela for diferente do que você colocou em `WEB_ORIGINS` na Railway, corrija lá e reinicie a API.
4. Abra a URL no Safari do iPhone, entre em **Perfil → Entrar na minha conta** e use **Compartilhar → Adicionar à Tela de Início**. Instalado na tela inicial, o Safari não apaga os dados locais por falta de uso.

O banco do navegador exige `Cross-Origin-Embedder-Policy: require-corp`. O valor `credentialless` não funciona no Safari (nem no iPhone) e deixaria o app sem banco. As fotos dos exercícios vêm do GitHub, que já envia `Cross-Origin-Resource-Policy: cross-origin`.

## Assistente de planejamento (teste local)

Abra **Configurar meu plano** na tela inicial, em Perfil ou em Alimentação. O carrossel mantém as respostas ao voltar entre etapas, permite ajustar os campos pelo resumo final e respeita movimento reduzido. O questionário funciona sem API e salva as respostas e o perfil ao concluir. Corrida e outras atividades são registradas em **Calendário → Registrar atividade**.

A geração usa a API do Claude pelo servidor, com saída estruturada e validação Zod; a chave nunca vai para o navegador. O plano é gerado em segundo plano (`POST /coach/plan` devolve um pedido e o app consulta `GET /coach/plan/:id`), porque leva alguns minutos e não pode depender da tela do celular ficar aberta. Não existe plano fictício de reserva: sem chave configurada, o app mantém suas respostas e explica que não conseguiu gerar a sugestão.

1. Configure `apps/api/.env` com a conexão PostgreSQL nativa, sem publicar esse arquivo.
2. Configure `ANTHROPIC_API_KEY` **somente no servidor** (o modelo padrão é `claude-opus-5-5`; `AI_MODEL` troca). Não coloque a chave em variável `EXPO_PUBLIC`.
3. Inicie a API com `npm run dev:api`. A configuração de Postgres continua sendo necessária para a API; o assistente não grava os questionários no Postgres.
4. Mantenha `npm run dev:expo` (8082) e `npm run dev:web:proxy` (8083) abertos. Use `http://localhost:8083`. A URL padrão da API é `http://localhost:3000`; pode ser alterada com `EXPO_PUBLIC_API_URL` (reinicie o Expo após alterar).
5. Conclua o questionário, gere e revise a sugestão. Somente **Aplicar plano** atualiza as metas, adiciona as refeições ao plano e ativa o programa. Nenhuma refeição é lançada automaticamente no diário.

As respostas incluem medidas e restrições e só são enviadas após confirmação. O fluxo automático é para adultos e direciona perfis que declaram necessidade de acompanhamento para um profissional. A IA pode errar e as metas são estimativas editáveis. Uma nova sugestão não altera registros de refeições ou treinos já realizados.

**Limites atuais:** os testes automáticos usam respostas simuladas, sem chamadas pagas; a qualidade do modelo real só é conferida com a chave configurada. Não há chat contínuo, análise de foto ou ajustes automáticos de metas. O calendário registra atividades realizadas; não planeja a semana futura. Em produção, as rotas `/coach` exigem sessão autenticada e origem permitida. Em desenvolvimento, o teste de IA sem conta continua limitado a loopback. A IA mantém o limite de uma geração por vez por conta. Pedidos em segundo plano ficam na memória da API por 30 minutos; se ela reiniciar, o app pede para enviar de novo.

## Conta, sincronização e acesso pelo celular

A aba **Perfil → Entrar na minha conta** abre o login. A primeira versão é para uso pessoal: não há cadastro público. Configure, somente em `apps/api/.env`, `DATABASE_URL`, `ACCOUNT_EMAIL` e `ACCOUNT_PASSWORD` (mínimo de 12 caracteres). A conta é criada na primeira inicialização após aplicar as migrações; trocar a variável depois não altera automaticamente a senha já gravada.

Use PostgreSQL **nativo da máquina**, sem Docker. Crie um banco dedicado ao projeto e outro terminado em `_test` para integração. Depois configure a URL local e execute `npm run db:migrate` antes de iniciar `npm run dev:api`. A preferência está registrada em `AGENTS.md`.

- O servidor guarda somente hashes de senha e dos tokens de sessão. O cookie é HttpOnly, SameSite=Lax e Secure em produção; logout revoga a sessão.
- Ao entrar com dados já existentes no navegador, confirme **Conectar dados deste aparelho**. Um aparelho vazio pode baixar os dados da conta automaticamente.
- O app verifica alterações locais e remotas. Cada envio informa a revisão anterior; concorrência retorna conflito, sem sobrescrita automática.
- Para resolver um conflito, **Guardar cópia e usar dados da conta** preserva uma cópia local antes de baixar. A opção de recuperação restaura a última cópia. As últimas três cópias por conta são mantidas neste navegador, fora do snapshot enviado ao servidor.
- Sem rede, os dados continuam locais. A sincronização tenta novamente quando o navegador recupera conexão/foco e periodicamente. Sair da conta não apaga os dados deste navegador.
- Esta primeira versão sincroniza o conjunto completo dos dados, sem mesclar campos de alterações simultâneas. Conflitos exigem uma escolha explícita. Contas diferentes devem usar perfis distintos do navegador.

### Proxy na mesma origem

A web usa `/api` por padrão. Reinicie `npm run dev:web:proxy` ou `npm run preview:web` após atualizar os scripts: eles encaminham `/api` para a API local na porta 3000 (`API_PORT` pode alterar a porta). Não é necessário configurar `EXPO_PUBLIC_API_URL` para a web normal. Isso evita depender de cookies de terceiros entre Vercel e Railway no Safari.

Foi adicionado `vercel.json`, sem realizar deploy. Configure o projeto Vercel com a raiz do repositório e `API_PROXY_URL` com a URL HTTPS da API hospedada. Configure na API `WEB_ORIGINS` com as origens web permitidas, separadas por vírgula, e `NODE_ENV=production`. A chave da IA permanece somente na API. A API precisa estar com as migrações aplicadas e a conta provisionada antes do primeiro login. O proxy permite apenas as rotas conhecidas de conta, sincronização e assistente.

### Testes contra PostgreSQL nativo

Configure `TEST_DATABASE_URL` apontando para localhost e um banco de testes terminado em `_test`. Os testes recusam outros destinos antes de aplicar migrações e não usam `DATABASE_URL` como substituto. Sem `TEST_DATABASE_URL`, os testes de integração são explicitamente pulados. A suíte cria contas fictícias isoladas e remove apenas suas próprias contas ao terminar.

```bash
npm run test:e2e -w @crazy-training/api
```

Estado da validação: 152 testes unitários, 10 regressões de SQLite/feedback/servidores web e 8 testes de integração no PostgreSQL nativo isolado passaram. Cenários no Chromium cobrem revisão por texto e imagem, confirmação de registros, persistência e fechamento do dia. Não foi usado Docker. A IA continua testada apenas com respostas controladas; nenhuma chamada real foi validada.

### Preparar PostgreSQL nativo manualmente

O script abaixo cria o usuário `crazy` e os bancos `crazy_training` e `crazy_training_test` somente se ainda não existirem. Ele pede a senha de forma interativa, não contém credenciais e não apaga bancos ou registros. O comando exige a autenticação administrativa local do seu sistema:

```bash
sudo -u postgres psql -X -d postgres -f scripts/setup-native-postgres.sql
```

Depois ajuste as URLs privadas em `apps/api/.env` com essa senha e execute `npm run db:migrate`. A senha de `ACCOUNT_PASSWORD` é do app e não precisa ser igual à senha do PostgreSQL. Para testar a conexão sem colocar a senha no comando, use `psql -h localhost -U crazy -d crazy_training -W`.

## Encerrar os servidores após testar

Encerre com `Ctrl+C` os processos iniciados para validação. Não deixe instâncias temporárias de Metro, prévia ou proxy em segundo plano. Essa preferência está registrada no `AGENTS.md`.

Para usar a web local na porta 8083 sem iniciar Expo/Metro em outra porta, execute `WEB_PORT=8083 npm run dev:web` e abra `http://localhost:8083` diretamente em uma aba. O comando gera o build e serve os cabeçalhos necessários ao SQLite. A porta 8082 do Expo não é o acesso web adequado para esse banco. Mantenha o mesmo hostname e porta que já usava para acessar os mesmos dados locais do navegador.

## Assistente de alimentação e balanço diário

As decisões do produto estão em [docs/food-assistant.md](docs/food-assistant.md), incluindo áudio como evolução opcional. Em **Alimentação → Analisar refeição com IA**, envie uma descrição e/ou imagem JPEG, PNG ou WebP de até 2 MB. É necessário entrar na conta e configurar o provedor no servidor. O resultado identifica alimentos, porções, premissas e perguntas; o usuário pode corrigir todos os itens antes de confirmar o registro. Alterar alimento ou porção limpa os nutrientes anteriores para não reaproveitar uma estimativa incompatível. Campos desconhecidos permanecem em branco. Fotos não são guardadas no PostgreSQL nem no diário.

O registro conserva a identificação de estimativa por IA e evita duplicação por reenvio da mesma proposta. Os totais e a projeção em relação à meta são calculados pelo aplicativo. A IA não grava registros diretamente nem afirma quanto de gordura foi perdido ou ganho.

Em **Revisar fechamento do dia**, informe opcionalmente o gasto total diário estimado (incluindo atividades) e a pesagem. Confirme a alimentação completa somente após registrar tudo. O saldo só aparece com confirmação, calorias em todas as refeições e gasto informado; atividades não são somadas novamente. Adicionar ou remover refeições reabre a confirmação. Sem esses dados, o resumo informa o que falta em vez de inventar um déficit ou superávit.

O SQLite recebe uma migração aditiva para `nutrition_days`. A sincronização passa para o formato v2, que preserva fechamentos e metadados de estimativa. Cópias v1 continuam legíveis, mas clientes antigos não podem enviar dados e apagar os campos novos. Atualize a API e a interface juntas; se solicitado, recarregue a página antes de sincronizar.

Configuração privada em `apps/api/.env` (ou nas variáveis da Railway): `ANTHROPIC_API_KEY` e, opcionalmente, `AI_MODEL` (padrão `claude-opus-5-5`). A chamada usa o SDK oficial `@anthropic-ai/sdk` com saída estruturada e, se o modelo recusar por engano, o reenvio automático para um modelo alternativo (`fallbacks: 'default'`). Não há resposta de demonstração em produção. Chaves ficam no servidor; o envio ocorre após consentimento. O cadastro manual e o resumo local funcionam sem IA configurada.

Até a configuração e uma chamada real serem validadas, testes com respostas controladas verificam apenas a integração e os fluxos do aplicativo, sem comprovar a precisão nutricional de um modelo real.

## Funcionamento dos avisos

Na web, `lib/dialogs.ts` usa `FeedbackHost` e `feedback-store`, sem `window.alert` ou `window.confirm`. Confirmações são diálogos com cancelar, ação explícita e destaque destrutivo; escolhas múltiplas aparecem juntas. Escape cancela, o foco fica no diálogo e retorna ao botão de origem. Mensagens longas de exercícios usam `showInfo` com conteúdo rolável.

Avisos de erro permanecem até serem dispensados. Sucessos aparecem sem bloquear e somem após seis segundos; o tempo pausa ao passar o mouse, focar a notificação ou abrir um diálogo. Avisos iguais são deduplicados e no máximo três ficam visíveis por vez. Isso é feedback dentro do app, sem solicitar permissão de notificações do navegador e sem notificações de sistema em segundo plano. iOS/Android mantêm os alertas nativos.
