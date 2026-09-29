import { formatReps } from '@crazy-training/shared';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { HeaderButton } from '@/components/ui/header-button';
import { ListRow } from '@/components/ui/list-row';
import { Section } from '@/components/ui/section';
import { deleteProgram, setActiveProgram, useProgram, useUnfinishedSession } from '@/db/queries';
import { confirm } from '@/lib/dialogs';
import { shareProgramCsv, startWorkout } from '@/lib/program-actions';

export default function ProgramScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { program, loaded } = useProgram(id);
  const unfinished = useUnfinishedSession();

  if (!program) {
    return loaded ? (
      <EmptyState
        symbol={{ ios: 'trash', android: 'delete', web: 'delete' }}
        title="Programa apagado"
        description="Este programa não existe mais. Os treinos feitos com ele continuam no Histórico."
      />
    ) : (
      <View className="flex-1 bg-background" />
    );
  }

  const data = program.data;
  const edit = () => router.push({ pathname: '/editor/[programId]', params: { programId: program.id } });

  return (
    <>
      <Stack.Screen
        options={{
          title: data.name,
          headerLargeTitleEnabled: false,
          headerRight: () => <HeaderButton title="Editar" onPress={edit} />,
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        className="flex-1 bg-background"
        contentContainerClassName="gap-7 pb-10 pt-4">
        {!program.active ? (
          <Card>
            <Text className="text-body text-label-secondary">
              O Hoje sugere os treinos do programa ativo. Este programa está guardado.
            </Text>
            <View className="mt-4">
              <Button title="Usar este programa" onPress={() => setActiveProgram(program.id)} />
            </View>
          </Card>
        ) : null}

        {data.workouts.length === 0 ? (
          <Card>
            <Text className="text-body text-label-secondary">Este programa ainda não tem treinos.</Text>
            <View className="mt-4">
              <Button title="Editar programa" variant="gray" onPress={edit} />
            </View>
          </Card>
        ) : null}

        {data.workouts.map((workout, workoutIndex) => (
          <Section key={workoutIndex} title={workout.name} footer={workout.focus}>
            {workout.exercises.map((exercise, index) => (
              <ListRow key={index} title={exercise.name} value={`${exercise.sets} × ${formatReps(exercise.reps)}`} />
            ))}
            <ListRow
              title={`Começar ${workout.name}`}
              tone="tint"
              onPress={() =>
                startWorkout(router, {
                  programId: program.id,
                  program: data,
                  workoutIndex,
                  hasUnfinishedSession: Boolean(unfinished),
                })
              }
            />
          </Section>
        ))}

        <Section separatorInset={56}>
          <ListRow
            icon={{ ios: 'square.and.arrow.up', android: 'share', web: 'share' }}
            tone="tint"
            title="Exportar CSV"
            onPress={() => shareProgramCsv(data)}
          />
          <ListRow
            icon={{ ios: 'trash', android: 'delete', web: 'delete' }}
            tone="destructive"
            title="Apagar programa"
            onPress={async () => {
              const ok = await confirm(
                `Apagar "${data.name}"?`,
                'Os treinos já feitos continuam no Histórico.',
                'Apagar',
                true,
              );
              if (!ok) return;
              await deleteProgram(program.id);
              router.back();
            }}
          />
        </Section>
      </ScrollView>
    </>
  );
}
