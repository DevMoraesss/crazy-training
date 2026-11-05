import { Stack } from 'expo-router';
import { Platform, Text } from 'react-native';

import { useColors } from '@/theme';

// No iOS 26 o próprio sistema desfoca o conteúdo sob o cabeçalho (scroll edge effect);
// antes dele, o desfoque vem do headerBlurEffect.
const IS_IOS = Platform.OS === 'ios';
const IS_IOS_26 = IS_IOS && Number.parseInt(String(Platform.Version), 10) >= 26;

/** Pilha de navegação de uma aba, com o título grande do iOS que encolhe ao rolar. */
export function TabStack({ title }: { title: string }) {
  const colors = useColors();

  return (
    <Stack
      screenOptions={{
        headerLargeTitleEnabled: IS_IOS,
        headerTransparent: IS_IOS,
        headerBlurEffect: IS_IOS && !IS_IOS_26 ? 'systemChromeMaterial' : undefined,
        headerLargeStyle: { backgroundColor: 'transparent' },
        headerLargeTitleShadowVisible: false,
        headerStyle: IS_IOS ? undefined : { backgroundColor: colors.background },
        headerTintColor: colors.tint,
        headerTitleStyle: { color: colors.label },
        headerLargeTitleStyle: { color: colors.label },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title,
          headerShadowVisible: Platform.OS === 'web' ? false : undefined,
          headerTitleAlign: Platform.OS === 'web' ? 'left' : undefined,
          headerTitle:
            Platform.OS === 'web'
              ? () => (
                  <Text
                    accessibilityRole="header"
                    style={{ color: colors.label, fontSize: 34, fontWeight: '700', letterSpacing: -0.8 }}
                  >
                    {title}
                  </Text>
                )
              : undefined,
        }}
      />
    </Stack>
  );
}
