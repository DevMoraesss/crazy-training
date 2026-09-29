import { Text, View } from 'react-native';

type ListRowProps = {
  title: string;
  subtitle?: string;
  /** Valor à direita, em cinza (ex.: "4 × 10"). */
  value?: string;
};

/** Linha de uma Section. */
export function ListRow({ title, subtitle, value }: ListRowProps) {
  return (
    <View className="min-h-[52px] flex-row items-center justify-between gap-3 px-5 py-3">
      <View className="flex-1">
        <Text className="text-body text-label">{title}</Text>
        {subtitle ? <Text className="text-subhead text-label-secondary">{subtitle}</Text> : null}
      </View>
      {value ? (
        <Text className="text-body text-label-secondary" style={{ fontVariant: ['tabular-nums'] }}>
          {value}
        </Text>
      ) : null}
    </View>
  );
}
