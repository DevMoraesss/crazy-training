import { Pressable, Text } from 'react-native';

/** Botão de texto do cabeçalho ("Editar", "OK", "Cancelar"). */
export function HeaderButton({
  title,
  onPress,
  bold,
  accessibilityLabel,
  destructive,
}: {
  title: string;
  onPress: () => void;
  bold?: boolean;
  accessibilityLabel?: string;
  destructive?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={12}
      className="px-1 active:opacity-50"
    >
      <Text className={`text-body ${destructive ? 'text-danger' : 'text-tint'} ${bold ? 'font-semibold' : ''}`}>
        {title}
      </Text>
    </Pressable>
  );
}
