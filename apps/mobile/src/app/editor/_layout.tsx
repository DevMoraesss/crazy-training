import { Stack } from 'expo-router';

import { useColors } from '@/theme';

/** Pilha do editor, aberta como modal: programa → treino → exercício. */
export default function EditorLayout() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.tint,
        headerTitleStyle: { color: colors.label },
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
