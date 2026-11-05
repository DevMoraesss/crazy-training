import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { Platform, View } from 'react-native';

import { palettes, themeVars, useScheme } from '@/theme';

/** Aplica as cores do modo atual (claro ou escuro) às classes do Tailwind e à navegação. */
export function ThemeRoot({ children }: { children: ReactNode }) {
  const scheme = useScheme();
  const colors = palettes[scheme];
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <ThemeProvider
      value={{
        ...base,
        colors: {
          ...base.colors,
          primary: colors.tint,
          background: colors.background,
          card: colors.surface,
          text: colors.label,
          border: colors.separator,
        },
      }}
    >
      <View className="flex-1 bg-background" style={themeVars[scheme]}>
        <View
          className="flex-1"
          style={Platform.OS === 'web' ? { width: '100%', maxWidth: 760, alignSelf: 'center' } : undefined}
        >
          <StatusBar style="auto" />
          {children}
        </View>
      </View>
    </ThemeProvider>
  );
}
