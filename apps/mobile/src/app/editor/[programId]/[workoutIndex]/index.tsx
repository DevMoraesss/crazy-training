import { formatReps } from '@crazy-training/shared';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { FieldRow } from '@/components/ui/field-row';
import { ListRow } from '@/components/ui/list-row';
import { Section } from '@/components/ui/section';
import { updateProgram, useProgram } from '@/db/queries';
import { confirm } from '@/lib/dialogs';
import { updateWorkout } from '@/lib/program-edit';

export default function WorkoutEditorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ programId: string; workoutIndex: string }>();
  const programId = params.programId;
  const workoutIndex = Number(params.workoutIndex);
  const { program } = useProgram(programId);
  const workout = program?.data.workouts[workoutIndex];

  if (!workout) return <View className="flex-1 bg-background" />;

  return (
    <>
      <Stack.Screen options={{ title: workout.name }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="interactive"
        className="flex-1 bg-background"
        contentContainerClassName="gap-7 pb-10 pt-4">
        <Section>
          <FieldRow
            label="Nome"
            value={workout.name}
            onCommit={(text) => {
              if (text.trim()) void updateWorkout(programId, workoutIndex, (current) => ({ ...current, name: text.trim() }));
            }}
          />
          <FieldRow
            label="Foco"
            value={workout.focus ?? ''}
            placeholder="Ex.: peito e tríceps"
            onCommit={(text) =>
              updateWorkout(programId, workoutIndex, (current) => ({ ...current, focus: text.trim() || undefined }))
            }
          />
        </Section>

        <Section title="Exercícios">
          {workout.exercises.map((exercise, index) => (
            <ListRow
              key={index}
              title={exercise.name}
              value={`${exercise.sets} × ${formatReps(exercise.reps)}`}
              onPress={() =>
                router.push({
                  pathname: '/editor/[programId]/[workoutIndex]/[exerciseIndex]',
                  params: { programId, workoutIndex: String(workoutIndex), exerciseIndex: String(index) },
                })
              }
            />
          ))}
          <ListRow
            icon={{ ios: 'plus', android: 'add', web: 'add' }}
            tone="tint"
            title="Adicionar exercício"
            onPress={() =>
              router.push({
                pathname: '/editor/[programId]/[workoutIndex]/add',
                params: { programId, workoutIndex: String(workoutIndex) },
              })
            }
          />
        </Section>

        <Section>
          <ListRow
            tone="destructive"
            title="Apagar treino"
            onPress={async () => {
              const ok = await confirm(`Apagar ${workout.name}?`, 'Os exercícios deste treino saem do programa.', 'Apagar', true);
              if (!ok) return;
              await updateProgram(programId, (current) => ({
                ...current,
                workouts: current.workouts.filter((_, index) => index !== workoutIndex),
              }));
              router.back();
            }}
          />
        </Section>
      </ScrollView>
    </>
  );
}
