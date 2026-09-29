import { estimateWorkoutMinutes, formatReps } from '@crazy-training/shared';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InkButton } from '@/components/ink-button';
import { Poster } from '@/components/poster';
import { Wall } from '@/components/wall';
import { sampleProgram } from '@/data/sample-program';
import { formatDayHeading } from '@/lib/dates';
import { paperFor, risoOffset } from '@/theme';

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const [today, ...upcoming] = sampleProgram.workouts;
  if (!today) return null;

  return (
    <Wall>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32 }}>
        <View className="flex-row items-center justify-between px-5">
          <View className="bg-ink px-3 pb-0.5 pt-1.5" style={{ transform: [{ rotate: '-3deg' }] }}>
            <Text className="font-poster text-[30px] leading-[32px] text-white">CRAZY TRAINING</Text>
          </View>
          <Text className="font-body-semibold text-[15px] text-ink">{formatDayHeading(new Date())}</Text>
        </View>

        <Poster paper={paperFor(0).paper} tilt={-1.2} className="mx-[18px] mt-7">
          <Text className="font-body-semibold text-sm text-ink">
            {today.exercises.length} exercícios, cerca de {estimateWorkoutMinutes(today)} min
          </Text>
          <Text className="mt-1 font-poster text-[112px] leading-[108px] text-ink" style={risoOffset}>
            {today.name.toUpperCase()}
          </Text>
          {today.focus ? <Text className="font-body-bold text-[21px] text-ink">{today.focus}</Text> : null}
          <View className="mt-3.5 gap-1">
            {today.exercises.map((exercise) => (
              <View key={exercise.name} className="flex-row items-center justify-between gap-3">
                <Text className="flex-1 font-body text-base text-ink">{exercise.name}</Text>
                <Text className="font-poster text-[25px] text-ink">
                  {exercise.sets}×{formatReps(exercise.reps)}
                </Text>
              </View>
            ))}
          </View>
        </Poster>

        <View className="mx-5 mt-6">
          <InkButton
            label={`Começar ${today.name}`}
            onPress={() => Alert.alert('Quase lá', 'A tela de execução do treino é a próxima etapa do app.')}
          />
        </View>

        {upcoming.length > 0 ? (
          <>
            <Text className="mx-5 mt-7 font-body-semibold text-sm text-ink">Nos próximos dias</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 14, gap: 14 }}>
              {upcoming.map((workout, index) => {
                const { paper, ink } = paperFor(index + 1);
                return (
                  <View
                    key={workout.name}
                    className="w-[150px] p-3"
                    style={{ backgroundColor: paper, transform: [{ rotate: index % 2 === 0 ? '2deg' : '-2.5deg' }] }}>
                    <Text className="font-poster text-[40px] leading-[40px]" style={{ color: ink }}>
                      {workout.name.toUpperCase()}
                    </Text>
                    {workout.focus ? (
                      <Text className="mt-1 font-body-bold text-sm" style={{ color: ink }}>
                        {workout.focus}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </ScrollView>
          </>
        ) : null}
      </ScrollView>
    </Wall>
  );
}
