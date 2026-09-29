import { vars } from 'nativewind';
import { useColorScheme } from 'react-native';

import tokens from './tokens.json';

/**
 * Cores do sistema do iOS (as mesmas dos apps da Apple), em claro e escuro.
 * O Tailwind usa estas cores como variáveis CSS (`bg-surface`, `text-label`), e o
 * ThemeRoot troca os valores conforme o ajuste do iPhone. Em JS, use useColors().
 */
export type ColorName = keyof typeof tokens.light;
export type Palette = Record<ColorName, string>;
export type Scheme = 'light' | 'dark';

export const palettes: Record<Scheme, Palette> = tokens;

/** Variáveis CSS de cada modo, aplicadas na raiz do app. */
export const themeVars = {
  light: vars(toCssVars(tokens.light)),
  dark: vars(toCssVars(tokens.dark)),
};

export function useScheme(): Scheme {
  return useColorScheme() === 'dark' ? 'dark' : 'light';
}

/** Cores do modo atual, para onde classe não chega (navegação nativa, ícones). */
export function useColors(): Palette {
  return palettes[useScheme()];
}

function toCssVars(palette: Palette) {
  return Object.fromEntries(Object.entries(palette).map(([name, value]) => [`--color-${name}`, value]));
}
