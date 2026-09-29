import * as Haptics from 'expo-haptics';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, Text } from 'react-native';

import { useColors } from '@/theme';

type ButtonProps = {
  title: string;
  onPress?: () => void;
  /** filled: ação principal da tela (uma só). gray: secundária. plain: texto na cor de destaque. */
  variant?: 'filled' | 'gray' | 'plain';
  /** large (52 px) para a ação principal; na execução do treino use 56 com className. */
  size?: 'large' | 'medium';
  /** Símbolo por plataforma: SF Symbol no iOS, Material Symbol no Android e na web. */
  icon?: SymbolViewProps['name'];
};

const CONTAINER = { filled: 'bg-tint', gray: 'bg-fill-secondary', plain: '' } as const;
const LABEL = { filled: 'text-on-tint', gray: 'text-label', plain: 'text-tint' } as const;

/** Botão em cápsula, como os do iOS 26. */
export function Button({ title, onPress, variant = 'filled', size = 'large', icon }: ButtonProps) {
  const colors = useColors();
  const iconColor = { filled: colors['on-tint'], gray: colors.label, plain: colors.tint }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      className={`flex-row items-center justify-center gap-2 rounded-full px-6 active:opacity-70 ${
        size === 'large' ? 'h-[52px]' : 'h-11'
      } ${CONTAINER[variant]}`}>
      {icon ? <SymbolView name={icon} size={15} tintColor={iconColor} /> : null}
      <Text className={`text-headline font-semibold ${LABEL[variant]}`}>{title}</Text>
    </Pressable>
  );
}
