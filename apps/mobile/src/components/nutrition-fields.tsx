import { Text, TextInput, View } from 'react-native';

import { useColors } from '@/theme';

export const NUTRIENT_FIELDS = [
  { key: 'calories', label: 'Calorias', unit: 'kcal' },
  { key: 'proteinG', label: 'Proteínas', unit: 'g' },
  { key: 'carbsG', label: 'Carboidratos', unit: 'g' },
  { key: 'fatG', label: 'Gorduras', unit: 'g' },
] as const;

/** Campo controlado: o botão Salvar lê também o último valor digitado, sem depender do blur. */
export function NutritionField({
  label,
  value,
  onChange,
  unit,
  placeholder,
  multiline,
  numeric,
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
  unit?: string;
  placeholder?: string;
  multiline?: boolean;
  numeric?: boolean;
}) {
  const colors = useColors();
  return (
    <View className={`px-5 py-3 ${multiline ? 'gap-2' : 'min-h-[56px] flex-row items-center gap-3'}`}>
      <Text className="text-body text-label">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        keyboardType={numeric ? 'decimal-pad' : 'default'}
        className={multiline ? 'min-h-[100px] text-body text-label' : 'flex-1 text-right text-body text-label'}
        placeholder={placeholder ?? 'Opcional'}
        placeholderTextColor={colors['label-tertiary']}
        style={multiline ? { textAlignVertical: 'top' } : undefined}
      />
      {unit ? <Text className="text-footnote text-label-secondary">{unit}</Text> : null}
    </View>
  );
}
