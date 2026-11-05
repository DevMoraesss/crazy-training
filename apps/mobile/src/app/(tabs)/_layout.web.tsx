import { Tabs } from 'expo-router/js-tabs';
import { useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, Text, View } from 'react-native';

import { useColors } from '@/theme';

// A navegação web usa os mesmos tokens e alvos de toque das abas nativas.
const TABS: {
  name: string;
  title: string;
  href: '/' | '/workouts' | '/history' | '/nutrition' | '/profile';
  icon: SymbolViewProps['name'];
}[] = [
  { name: '(today)', title: 'Hoje', href: '/', icon: { web: 'today' } },
  { name: 'workouts', title: 'Treinos', href: '/workouts', icon: { web: 'fitness_center' } },
  { name: 'history', title: 'Calendário', href: '/history', icon: { web: 'calendar_month' } },
  { name: 'nutrition', title: 'Alimentação', href: '/nutrition', icon: { web: 'restaurant' } },
  { name: 'profile', title: 'Perfil', href: '/profile', icon: { web: 'account_circle' } },
];

export default function WebTabsLayout() {
  const colors = useColors();
  const router = useRouter();

  return (
    <Tabs
      tabBar={({ state }) => (
        <View
          accessibilityRole="tablist"
          className="mx-3 mb-2.5 flex-row rounded-[30px] bg-surface px-1 py-2"
          style={{ borderWidth: 0.5, borderColor: colors.separator }}
        >
          {TABS.map((tab) => {
            const selected = state.routes[state.index]?.name === tab.name;
            const color = selected ? colors.tint : colors['icon-secondary'];
            return (
              <Pressable
                key={tab.name}
                accessibilityRole="tab"
                accessibilityLabel={tab.title}
                accessibilityState={{ selected }}
                onPress={() => router.navigate(tab.href)}
                className="min-h-[52px] flex-1 items-center justify-center gap-1 rounded-full active:bg-fill-secondary"
              >
                <SymbolView name={tab.icon} tintColor={color} size={22} />
                <Text numberOfLines={1} style={{ color, fontSize: 10, fontWeight: '600', letterSpacing: -0.3 }}>
                  {tab.title}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
      screenOptions={{
        headerShown: false,
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
          }}
        />
      ))}
    </Tabs>
  );
}
