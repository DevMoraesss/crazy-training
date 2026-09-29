import { Tabs } from 'expo-router/js-tabs';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { useColors } from '@/theme';

// A web não tem tab bar do sistema: abas em JS por enquanto. O editor desktop (Fase 2)
// ganha um layout próprio aqui.
const TABS: { name: string; title: string; icon: SymbolViewProps['name'] }[] = [
  { name: '(today)', title: 'Hoje', icon: { web: 'today' } },
  { name: 'workouts', title: 'Treinos', icon: { web: 'fitness_center' } },
  { name: 'history', title: 'Histórico', icon: { web: 'bar_chart' } },
  { name: 'profile', title: 'Perfil', icon: { web: 'account_circle' } },
];

export default function WebTabsLayout() {
  const colors = useColors();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors['icon-secondary'],
        tabBarStyle: {
          height: 64,
          paddingTop: 6,
          paddingBottom: 8,
          backgroundColor: colors.surface,
          borderTopColor: colors.separator,
        },
      }}>
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, size }) => <SymbolView name={tab.icon} tintColor={color} size={size} />,
          }}
        />
      ))}
    </Tabs>
  );
}
