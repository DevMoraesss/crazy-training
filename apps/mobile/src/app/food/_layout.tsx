import { Stack } from 'expo-router';

import { useColors } from '@/theme';

export default function FoodLayout() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.tint,
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.label },
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
