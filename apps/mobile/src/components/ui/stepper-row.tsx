import { Text, View } from 'react-native';

import { RoundButton } from './round-button';

type StepperRowProps = {
  label: string;
  /** Valor já formatado para exibir ("4", "1:30"). */
  display: string;
  onDecrement: () => void;
  onIncrement: () => void;
  canDecrement?: boolean;
  canIncrement?: boolean;
};

/** Linha com valor e botões − e +, para números pequenos (séries, descanso, dias por semana). */
export function StepperRow({ label, display, onDecrement, onIncrement, canDecrement = true, canIncrement = true }: StepperRowProps) {
  return (
    <View className="min-h-[52px] flex-row items-center gap-3 px-5 py-2">
      <Text className="flex-1 text-body text-label">{label}</Text>
      <Text className="min-w-[44px] text-right text-body text-label" style={{ fontVariant: ['tabular-nums'] }}>
        {display}
      </Text>
      <RoundButton label="−" accessibilityLabel={`Diminuir ${label.toLowerCase()}`} onPress={onDecrement} disabled={!canDecrement} />
      <RoundButton label="+" accessibilityLabel={`Aumentar ${label.toLowerCase()}`} onPress={onIncrement} disabled={!canIncrement} />
    </View>
  );
}
