import * as Haptics from 'expo-haptics';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, Text } from 'react-native';

import { useColors } from '@/theme';

type ButtonProps = {
  title: string;
  onPress?: () => void;
  /** filled: ação principal da tela (uma só). gray: secundária. plain: texto na cor de destaque. */
  variant?: 'filled' | 'gray' | 'plain';
  /** large (52 px) para a ação principal; xlarge (56 px) na execução do treino, com a mão suada. */
  size?: 'xlarge' | 'large' | 'medium';
  /** Símbolo por plataforma: SF Symbol no iOS, Material Symbol no Android e na web. */
  icon?: SymbolViewProps['name'];
};

const CONTAINER = { filled: 'bg-tint', gray: 'bg-fill-secondary', plain: '' } as const;
const HEIGHT = { xlarge: 'h-14', large: 'h-[52px]', medium: 'h-11' } as const;
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
      className={`flex-row items-center justify-center gap-2 rounded-full px-6 active:opacity-70 ${HEIGHT[size]} ${CONTAINER[variant]}`}>
      {icon ? <SymbolView name={icon} size={15} tintColor={iconColor} /> : null}
      <Text className={`text-headline font-semibold ${LABEL[variant]}`}>{title}</Text>
    </Pressable>
  );
}
