import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { Text, View } from 'react-native';

import { useScheme } from '@/theme';

type SegmentedRowProps<T extends string> = {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
};

/** Escolha entre poucas opções com o controle segmentado nativo do iOS (UISegmentedControl). */
export function SegmentedRow<T extends string>({ label, options, value, onChange }: SegmentedRowProps<T>) {
  const scheme = useScheme();
  return (
    <View className="gap-2.5 px-5 py-3">
      <Text className="text-body text-label">{label}</Text>
      <SegmentedControl
        accessibilityLabel={label}
        values={options.map((option) => option.label)}
        selectedIndex={options.findIndex((option) => option.value === value)}
        onChange={(event) => {
          const option = options[event.nativeEvent.selectedSegmentIndex];
          if (option) onChange(option.value);
        }}
        appearance={scheme}
      />
    </View>
  );
}
