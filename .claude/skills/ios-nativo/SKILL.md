---
name: ios-nativo
description: Identidade visual do Crazy Training - minimalista, com cara de app nativo do iPhone (iOS 26). Use ao criar ou mudar qualquer tela, componente, cor, ícone ou texto de interface do app (apps/mobile), inclusive a versão web.
---

# iOS nativo

O Crazy Training deve parecer um app que a Apple poderia ter feito: minimalista, com os componentes e as cores do próprio iOS. A única cor que é nossa é a de destaque (`tint`). Quando o sistema já tem um componente, use o do sistema em vez de imitar.

Protótipo: https://claude.ai/artifact/XXk7NDE9tDrphYivayLkhg (telas Hoje, Série, Descanso, Série no modo escuro, Revisar importação e Sistema visual).

## O que já é nativo (não recriar)

- **Tab bar:** `NativeTabs` (`expo-router/unstable-native-tabs`) em `src/app/_layout.tsx`. No iOS 26 ela tem o vidro (Liquid Glass) e encolhe ao rolar. Máximo de 5 abas.
- **Título grande:** cada aba é uma pasta com `_layout.tsx` usando `TabStack`. A tela precisa ter um `ScrollView` com `contentInsetAdjustmentBehavior="automatic"` como **primeiro filho**, senão o título não encolhe.
- **Ícones:** `SymbolView` do `expo-symbols`, com SF Symbols no iOS e Material Symbols no Android e na web. Sempre passe os três nomes: `name={{ ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' }}`. Os nomes de SF Symbols são tipados: o `tsc` acusa nome inexistente.
- **Web:** `src/app/_layout.web.tsx` usa abas em JS, porque a web não tem tab bar do sistema.

## Cores (`src/theme/tokens.json`)

Cores do sistema do iOS, em claro e escuro. O modo segue o ajuste do iPhone; o `ThemeRoot` troca as variáveis. Use as classes; em JS (ícones, navegação), use `useColors()`.

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| background | #F2F2F7 | #000000 | Fundo das telas |
| surface | #FFFFFF | #1C1C1E | Cartões e listas agrupadas |
| surface-raised | #E5E5EA | #2C2C2E | Mídia e placeholders dentro de cartões |
| label | #000000 | #FFFFFF | Texto principal |
| label-secondary | 60% | 60% | Texto de apoio, valores à direita |
| icon-secondary | #8E8E93 | #8E8E93 | Ícones secundários (opaco de propósito: ícone com alfa fica apagado na web) |
| separator | fio | fio | Divisórias de lista |
| fill / fill-secondary | cinza translúcido | cinza translúcido | Botões secundários, stepper, segmented |
| tint | #007AFF | #0A84FF | Destaque: ação principal, progresso, seleção, links |
| success / warning / danger | verde / laranja / vermelho do sistema | | Estados |

Nunca escreva hex solto em componente.

## Tipografia

Fonte do sistema (SF Pro no iOS), com os estilos de texto da Apple em classes: `text-large-title` (34), `text-title1` (28), `text-title2` (22), `text-title3` (20), `text-headline`/`text-body` (17), `text-callout` (16), `text-subhead` (15), `text-footnote` (13), `text-caption` (12). Peso com `font-semibold`/`font-bold`.

Números de treino (repetições, carga, timer) usam `font-rounded text-metric` (SF Pro Rounded 64, como no app Fitness) com `fontVariant: ['tabular-nums']`, para os dígitos não pularem.

## Componentes (`src/components`)

- `ui/Section` + `ui/ListRow`: lista agrupada (inset grouped), com cartão arredondado e divisórias recuadas. A `ListRow` com `onPress` ganha seta; `tone="tint"` é ação, `tone="destructive"` apaga, `checked` é escolha única, `icon` põe um símbolo à esquerda (use `separatorInset={56}` na Section).
- `ui/Card`: bloco solto (resumo, destaque "Próximo treino").
- `ui/FieldRow`: campo de formulário (rótulo à esquerda, valor à direita). Salva ao sair do campo.
- `ui/SegmentedRow`: controle segmentado nativo, para 2 a 4 opções curtas.
- `ui/StepperRow` e `ui/RoundButton`: − e + circulares. `RoundButton size={76}` são os botões grandes do timer.
- `ui/RestRing`: anel do timer de descanso.
- `ui/HeaderButton`: botão de texto no cabeçalho ("Editar", "OK").
- `ui/Button`: cápsula. `filled` para a ação principal (uma por tela), `gray` para secundária, `plain` para texto em destaque. `size="xlarge"` (56) na execução do treino.
- `ui/EmptyState`: tela vazia no padrão ContentUnavailableView, com símbolo, título e botões do que fazer.
- `SessionStats` e `SessionExercises` (`session-report.tsx`): resumo de uma sessão, usados no fim do treino e no Histórico.
- `TabStack`: pilha de uma aba com título grande.
- `ThemeRoot`: aplica claro ou escuro. Já está nos layouts raiz.

## Regras

1. **Minimalismo:** fundo cinza-claro, conteúdo em cartões brancos, uma cor de destaque. Sem gradiente, sem sombra decorativa em cartão, sem emoji, sem textura.
2. **Cantos contínuos:** cartões e listas com `rounded-[26px]` e `style={{ borderCurve: 'continuous' }}` (o "squircle" da Apple). Botões são cápsulas (`rounded-full`).
3. **Uma ação principal por tela**, com `Button` `filled`, de preferência embaixo, no alcance do polegar.
4. **Tela de execução do treino:** números `text-metric` arredondados, alvos de toque de 44 pt ou mais (56 no botão principal) e haptic nas ações.
5. **Texto:** pt-BR, com maiúscula só no início da frase, e verbo direto ("Começar treino", "Concluir série"). Sem caixa alta em rótulos. Erro diz o que houve e como resolver.
6. **Movimento:** o do sistema (título que encolhe, tab bar que minimiza, transições da pilha). Animação própria só quando responde a um toque.
7. **Acessibilidade:** respeitar o Dynamic Type quando possível, contraste do sistema, e `accessibilityLabel` em botão só com ícone.
