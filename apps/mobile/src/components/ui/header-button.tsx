import { Pressable, Text } from 'react-native';

/** Botão de texto do cabeçalho ("Editar", "OK", "Cancelar"). */
export function HeaderButton({ title, onPress, bold }: { title: string; onPress: () => void; bold?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={12} className="px-1 active:opacity-50">
      <Text className={`text-body text-tint ${bold ? 'font-semibold' : ''}`}>{title}</Text>
    </Pressable>
  );
}
