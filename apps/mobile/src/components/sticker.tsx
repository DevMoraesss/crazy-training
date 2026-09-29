import { Text, View } from 'react-native';

type StickerProps = {
  label: string;
  /** Adesivo é colado torto de propósito: entre 4 e 10 graus. */
  tilt?: number;
  className?: string;
};

/** Adesivo de vinil com borda branca e letra de marcador. Para confirmações curtas ("feito!"). */
export function Sticker({ label, tilt = 6, className }: StickerProps) {
  return (
    <View className={className} style={{ transform: [{ rotate: `${tilt}deg` }] }}>
      <View className="border-4 border-white bg-ink px-4 pb-1.5 pt-2">
        <Text className="font-marker text-2xl text-paper-yellow">{label}</Text>
      </View>
    </View>
  );
}
