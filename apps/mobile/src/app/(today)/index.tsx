import { estimateWorkoutMinutes, formatReps } from '@crazy-training/shared';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Alert, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ListRow } from '@/components/ui/list-row';
import { Section } from '@/components/ui/section';
import { sampleProgram } from '@/data/sample-program';
import { formatDayHeading } from '@/lib/dates';
import { useColors } from '@/theme';

export default function TodayScreen() {
  const [today, ...upcoming] = sampleProgram.workouts;
  if (!today) return null;

  return (
    // ScrollView como primeiro filho: é o que faz o título grande encolher ao rolar.
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-background"
      contentContainerClassName="gap-7 pb-10">
      <View>
        <Text className="mx-5 text-subhead text-label-secondary">{formatDayHeading(new Date())}</Text>

        <View className="mx-4 mt-4 rounded-[26px] bg-surface p-5" style={{ borderCurve: 'continuous' }}>
          <Text className="text-subhead font-semibold text-tint">Próximo treino</Text>
          <Text className="mt-1 text-title1 font-bold text-label">{today.name}</Text>
          {today.focus ? <Text className="text-body text-label-secondary">{today.focus}</Text> : null}
          <View className="mt-3.5 flex-row gap-5">
            <Stat
              symbol={{ ios: 'list.bullet', android: 'format_list_bulleted', web: 'format_list_bulleted' }}
              label={`${today.exercises.length} exercícios`}
            />
            <Stat
              symbol={{ ios: 'clock', android: 'schedule', web: 'schedule' }}
              label={`cerca de ${estimateWorkoutMinutes(today)} min`}
            />
          </View>
          <View className="mt-5">
            <Button
              title="Começar treino"
              icon={{ ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' }}
              onPress={() => Alert.alert('Quase lá', 'A tela de execução do treino é a próxima etapa do app.')}
            />
          </View>
        </View>
      </View>

      <Section title="Exercícios">
        {today.exercises.map((exercise) => (
          <ListRow key={exercise.name} title={exercise.name} value={`${exercise.sets} × ${formatReps(exercise.reps)}`} />
        ))}
      </Section>

      {upcoming.length > 0 ? (
        <Section title="Próximos treinos">
          {upcoming.map((workout) => (
            <ListRow
              key={workout.name}
              title={workout.name}
              subtitle={workout.focus}
              value={`${workout.exercises.length} exercícios`}
            />
          ))}
        </Section>
      ) : null}
    </ScrollView>
  );
}

function Stat({ symbol, label }: { symbol: SymbolViewProps['name']; label: string }) {
  const colors = useColors();
  return (
    <View className="flex-row items-center gap-1.5">
      <SymbolView name={symbol} size={15} tintColor={colors['icon-secondary']} />
      <Text className="text-subhead text-label-secondary">{label}</Text>
    </View>
  );
}
