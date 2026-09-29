import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { ScrollView, Text } from 'react-native';

import { useColors } from '@/theme';

type EmptyStateProps = {
  symbol: SymbolViewProps['name'];
  title: string;
  description: string;
};

/** Tela vazia no padrão do iOS (ContentUnavailableView): símbolo, título e o que fazer. */
export function EmptyState({ symbol, title, description }: EmptyStateProps) {
  const colors = useColors();

  return (
    // ScrollView como primeiro filho: é o que faz o título grande encolher ao rolar.
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-background"
      contentContainerClassName="flex-grow items-center justify-center px-10 pb-24">
      <SymbolView name={symbol} size={48} tintColor={colors['icon-secondary']} />
      <Text className="mt-4 text-center text-title2 font-bold text-label">{title}</Text>
      <Text className="mt-2 text-center text-body text-label-secondary">{description}</Text>
    </ScrollView>
  );
}
