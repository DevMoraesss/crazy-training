import type { TextStyle } from 'react-native';

import tokens from './tokens.json';

/** Mesmos valores das classes do Tailwind. Use quando precisar da cor em JS (SVG, sombras). */
export const colors = tokens.colors;
export const fonts = tokens.fonts;

export type Paper = { paper: string; ink: string };

/** Papel de cada treino, na ordem A, B, C, D (e recomeça). */
const PAPERS: readonly Paper[] = [
  { paper: colors['paper-yellow'], ink: colors.ink },
  { paper: colors['paper-pink'], ink: colors.ink },
  { paper: colors['paper-orange'], ink: colors.ink },
  // Azul pede tinta branca: preto sobre ele não passa de 4,5:1 em texto pequeno.
  { paper: colors['paper-blue'], ink: '#FFFFFF' },
];

export function paperFor(index: number): Paper {
  return PAPERS[((index % PAPERS.length) + PAPERS.length) % PAPERS.length]!;
}

/**
 * "Offset de impressão": a cópia rosa deslocada atrás do texto, como uma risografia
 * fora de registro. Só em texto de cartaz grande (títulos e números).
 * Raio mínimo maior que zero porque o Android não desenha sombra com raio 0.
 */
export const risoOffset: TextStyle = {
  textShadowColor: colors['paper-pink'],
  textShadowOffset: { width: 4, height: 3 },
  textShadowRadius: 0.01,
};
