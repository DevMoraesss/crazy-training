---
name: lambe-lambe
description: Identidade visual do Crazy Training (cartaz lambe-lambe colado no muro). Use ao criar ou mudar qualquer tela, componente, cor, fonte ou texto de interface do app (apps/mobile), inclusive a versão web.
---

# Lambe-lambe

Cada treino é um cartaz de gráfica popular colado num muro de concreto: papel fluorescente, tinta preta, letra condensada gigante, fita adesiva nos cantos. O app é o muro; os treinos são os cartazes.

Esta skill complementa a `frontend-design`. Onde as duas conflitarem, vale esta.

Protótipo aprovado para discussão: https://claude.ai/artifact/XXk7NDE9tDrphYivayLkhg (telas Hoje, Série, Descanso, Revisar importação e Paleta).

## Tokens

Fonte única: `apps/mobile/src/theme/tokens.json`. O Tailwind (`tailwind.config.js`) e o código (`src/theme/index.ts`) leem de lá. Não escreva hex solto em componente.

| Token | Valor | Classe | Papel |
|---|---|---|---|
| wall | #C9C8C2 | `bg-wall` | Fundo de toda tela (muro de concreto) |
| ink | #000000 | `bg-ink` `text-ink` | Texto, botão principal, adesivo |
| xerox | #F4F4F0 | `bg-xerox` | Descanso, formulários, telas calmas |
| paper-yellow | #FFE600 | `bg-paper-yellow` | Treino A, marca-texto |
| paper-pink | #FF3EA5 | `bg-paper-pink` | Treino B, offset de impressão |
| paper-orange | #FF6B1A | `bg-paper-orange` | Treino C |
| paper-blue | #2F4BFF | `bg-paper-blue` | Treino D, corrida, anotações à mão (tinta azul) |
| tape | branco 55% | `bg-tape` | Fita adesiva |

Fontes (uma família por peso, porque React Native não sintetiza peso de fonte customizada):

- `font-poster` (League Gothic): títulos de cartaz e números grandes. Sempre em caixa alta. Nunca em texto corrido.
- `font-body`, `font-body-semibold`, `font-body-bold` (Archivo): todo o resto.
- `font-marker` (Permanent Marker): anotação à mão e adesivo. Frases de até 4 palavras.

`line-height` em React Native é absoluto: sempre informe em px (`leading-[108px]`), nunca relativo.

## Componentes (`apps/mobile/src/components`)

- `Wall`: fundo de toda tela, com a textura pontilhada.
- `Poster` + `Tape`: o cartaz. Use `paperFor(índice)` para a cor de cada treino.
- `InkButton`: a ação principal da tela, com offset rosa e efeito de carimbo ao apertar. `size="large"` na execução do treino.
- `Sticker`: adesivo de vinil com texto de marcador ("feito!", "em breve").
- `TabBar`: abas desenhadas na parede, com marca-texto rosa na ativa.
- Ícones em `icons.tsx`: traço 2,2, cantos redondos, desenhados em 24×24. Ícone novo segue o mesmo traço. Não misture com bibliotecas de ícones.

## Regras

1. **Um cartaz grande por tela.** Ele é o destaque; o resto fica quieto no muro.
2. **Inclinação:** cartazes entre −2° e 2°, adesivos entre 4° e 10°. Nunca incline botão, campo, lista rolável ou texto de instrução.
3. **Fita só em cartaz.** Nunca em botão ou card de lista.
4. **Offset rosa (`risoOffset`)** só em texto de cartaz grande (título, número de repetições ou carga) e no `InkButton`. Em papel rosa, use o offset azul.
5. **Cor do papel identifica o treino:** `paperFor(i)` dá papel e tinta. O papel azul pede tinta branca.
6. **Contraste:** texto abaixo de 24 px precisa de 4,5:1. Preto passa em todos os papéis menos o azul.
7. **Tela de execução do treino:** legível com o celular apoiado no banco. Números com 96 px ou mais, alvos de toque com 48 px ou mais (de preferência 56), ação principal embaixo, no alcance do polegar.
8. **Movimento:** um único momento coreografado, o adesivo "feito!" sendo carimbado ao concluir a série, com haptic. Movimento que responde a um toque é bem-vindo. Nada de fade ou slide de entrada em cada card.
9. **Textos:** pt-BR, com maiúscula só no início da frase e verbo direto ("Começar treino A", "Série feita"). Caixa alta só em `font-poster`. Erro diz o que houve e como resolver, sem pedir desculpa.
10. **Fuja do kit SaaS:** nada de cards arredondados iguais, sombra cinza difusa, gradiente, emoji ou rótulo em caixa alta acima de cada seção.
