import * as Haptics from 'expo-haptics';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import type { ComponentType } from 'react';
import { Pressable, Text, View } from 'react-native';

import { CalendarIcon, ChartIcon, DumbbellIcon, MarkerUnderline, PersonIcon, type IconProps } from './icons';

const TABS: Record<string, { label: string; Icon: ComponentType<IconProps> }> = {
  index: { label: 'Hoje', Icon: CalendarIcon },
  workouts: { label: 'Treinos', Icon: DumbbellIcon },
  history: { label: 'Histórico', Icon: ChartIcon },
  profile: { label: 'Perfil', Icon: PersonIcon },
};

/** Barra de abas desenhada na parede: linha de tinta em cima, marca-texto na aba ativa. */
export function TabBar({ state, navigation, insets }: BottomTabBarProps) {
  return (
    <View className="flex-row border-t-2 border-ink bg-wall px-3 pt-2" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
      {state.routes.map((route, index) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const focused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            void Haptics.selectionAsync();
            navigation.navigate(route.name, route.params);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: focused }}
            className="min-h-12 flex-1 items-center gap-0.5 pt-1">
            <tab.Icon />
            <Text className={`text-xs text-ink ${focused ? 'font-body-bold' : 'font-body-semibold'}`}>{tab.label}</Text>
            <MarkerUnderline visible={focused} />
          </Pressable>
        );
      })}
    </View>
  );
}
