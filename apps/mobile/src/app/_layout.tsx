import '../global.css';
// Registra como as notificações do descanso aparecem.
import '@/lib/rest-notification';

import { Stack } from 'expo-router';

import { CloudProvider } from '@/components/cloud-provider';
import { DatabaseGate } from '@/components/database-gate';
import { ThemeRoot } from '@/components/theme-root';
import { useColors } from '@/theme';

/** Pilha raiz: as abas por baixo e, por cima delas, as telas modais. */
export default function RootLayout() {
  const colors = useColors();

  return (
    <ThemeRoot>
      <DatabaseGate>
        <CloudProvider>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
            <Stack.Screen name="(tabs)" />
            {/* Tela cheia e sem gesto de fechar: não dá para sair do treino sem querer. */}
            <Stack.Screen name="session/[id]" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
            <Stack.Screen name="import" options={{ presentation: 'modal' }} />
            <Stack.Screen name="editor" options={{ presentation: 'modal' }} />
            <Stack.Screen name="food" options={{ presentation: 'modal' }} />
            <Stack.Screen name="activity" options={{ presentation: 'modal' }} />
            <Stack.Screen name="coach" options={{ presentation: 'modal' }} />
            <Stack.Screen name="account" options={{ presentation: 'modal' }} />
          </Stack>
        </CloudProvider>
      </DatabaseGate>
    </ThemeRoot>
  );
}
