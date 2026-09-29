import { Stack } from 'expo-router';

import { useColors } from '@/theme';

export default function ImportLayout() {
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
