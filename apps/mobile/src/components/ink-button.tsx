import * as Haptics from 'expo-haptics';
import { Pressable, Text, View } from 'react-native';

type InkButtonProps = {
  label: string;
  onPress?: () => void;
  /** 64 px na maioria das telas; 72 px na execução do treino (mão suada, luva). */
  size?: 'default' | 'large';
};

/**
 * Ação principal da tela: tinta preta com o offset rosa atrás. Ao apertar, o botão
 * desce sobre o offset, como um carimbo. Um por tela, no alcance do polegar.
 */
export function InkButton({ label, onPress, size = 'default' }: InkButtonProps) {
  const height = size === 'large' ? 'h-[72px]' : 'h-16';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress?.();
      }}>
      {({ pressed }) => (
        <View>
          <View className="absolute inset-0 bg-paper-pink" style={{ transform: [{ translateX: 5 }, { translateY: 5 }] }} />
          <View
            className={`${height} items-center justify-center bg-ink`}
            style={pressed ? { transform: [{ translateX: 3 }, { translateY: 3 }] } : undefined}>
            <Text className={`font-body-bold text-white ${size === 'large' ? 'text-[22px]' : 'text-xl'}`}>{label}</Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}
