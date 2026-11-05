import { localDateKey } from '@crazy-training/shared';
import { Pressable, Text, View } from 'react-native';

import { HeaderButton } from './ui/header-button';

export function ActivityCalendar({
  month,
  selected,
  activeDays,
  onMonth,
  onSelect,
}: {
  month: Date;
  selected: string;
  activeDays: Set<string>;
  onMonth: (date: Date) => void;
  onSelect: (date: string) => void;
}) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const today = localDateKey(new Date());
  return (
    <View className="mx-4 rounded-[26px] bg-surface p-3" style={{ borderCurve: 'continuous' }}>
      <View className="mb-2 min-h-11 flex-row items-center justify-between px-2">
        <HeaderButton
          title="‹"
          accessibilityLabel="Mês anterior"
          onPress={() => onMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
        />
        <Text className="text-headline font-semibold text-label">
          {month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </Text>
        <HeaderButton
          title="›"
          accessibilityLabel="Próximo mês"
          onPress={() => onMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
        />
      </View>
      <View className="flex-row">
        {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((label, i) => (
          <View key={i} style={{ width: '14.2857%' }}>
            <Text className="py-2 text-center text-caption text-label-secondary">{label}</Text>
          </View>
        ))}
      </View>
      <View className="flex-row flex-wrap">
        {Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, index) => {
          const day = index - offset + 1;
          if (day < 1 || day > days) return <View key={index} style={{ width: '14.2857%', minHeight: 48 }} />;
          const date = localDateKey(new Date(month.getFullYear(), month.getMonth(), day));
          const active = activeDays.has(date);
          return (
            <Pressable
              key={index}
              accessibilityRole="button"
              accessibilityState={{ selected: selected === date }}
              accessibilityLabel={`${date}${active ? ', dia ativo' : ''}${date === today ? ', hoje' : ''}`}
              onPress={() => onSelect(date)}
              style={{ width: '14.2857%', minHeight: 48 }}
              className="items-center justify-center active:opacity-50"
            >
              <View
                className={`h-9 w-9 items-center justify-center rounded-full ${selected === date ? 'bg-tint' : 'bg-transparent'}`}
              >
                <Text
                  className={`text-body ${selected === date ? 'text-on-tint' : date === today ? 'font-bold text-tint' : 'text-label'}`}
                >
                  {day}
                </Text>
              </View>
              <View className={`h-1 w-1 rounded-full ${active ? 'bg-success' : 'bg-transparent'}`} />
            </Pressable>
          );
        })}
      </View>
      <Text className="px-2 pt-3 text-footnote text-label-secondary">
        Ponto verde: dia ativo · toque para ver as atividades.
      </Text>
    </View>
  );
}
