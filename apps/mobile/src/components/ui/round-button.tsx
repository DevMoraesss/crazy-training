import * as Haptics from 'expo-haptics';
import { Pressable, Text } from 'react-native';

type RoundButtonProps = {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  /** 44 para steppers; 76 para os botões grandes do timer, como no app Relógio. */
  size?: 44 | 76;
  disabled?: boolean;
};

/** Botão circular cinza (stepper de − e +, ajustes do timer). */
export function RoundButton({ label, accessibilityLabel, onPress, size = 44, disabled }: RoundButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      className={`items-center justify-center rounded-full bg-fill-secondary active:opacity-60 ${disabled ? 'opacity-40' : ''} ${
        size === 76 ? 'h-[76px] w-[76px]' : 'h-11 w-11'
      }`}>
      <Text
        className={`text-label ${size === 76 ? 'text-headline font-semibold' : 'text-title2 font-medium'}`}
        style={{ fontVariant: ['tabular-nums'] }}>
        {label}
      </Text>
    </Pressable>
  );
}
