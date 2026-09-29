import { formatReps, getExercise, parseReps } from '@crazy-training/shared';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';

import { FieldRow } from '@/components/ui/field-row';
import { ListRow } from '@/components/ui/list-row';
import { Section } from '@/components/ui/section';
import { StepperRow } from '@/components/ui/stepper-row';
import { useProgram } from '@/db/queries';
import { notify } from '@/lib/dialogs';
import { formatClock, formatNumber, parseDecimalInput } from '@/lib/format';
import { moveItem, updateExercise, updateWorkout } from '@/lib/program-edit';
import { useColors } from '@/theme';

const REST_STEP = 15;

export default function ExerciseEditorScreen() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams<{ programId: string; workoutIndex: string; exerciseIndex: string }>();
  const programId = params.programId;
  const workoutIndex = Number(params.workoutIndex);
  const exerciseIndex = Number(params.exerciseIndex);
  const { program } = useProgram(programId);
  const workout = program?.data.workouts[workoutIndex];
  const exercise = workout?.exercises[exerciseIndex];
  const savedNotes = exercise?.notes ?? '';
  const [notes, setNotes] = useState(savedNotes);
  const [lastSavedNotes, setLastSavedNotes] = useState(savedNotes);

  // O programa carregou ou mudou o exercício (mover para cima/baixo): o campo acompanha.
  if (savedNotes !== lastSavedNotes) {
    setLastSavedNotes(savedNotes);
    setNotes(savedNotes);
  }

  if (!workout || !exercise) return <View className="flex-1 bg-background" />;

  const catalog = exercise.exerciseId ? getExercise(exercise.exerciseId) : undefined;
  const rest = exercise.restSeconds ?? 60;
  const update = (change: Partial<typeof exercise>) =>
    updateExercise(programId, workoutIndex, exerciseIndex, (current) => ({ ...current, ...change }));

  const move = async (to: number) => {
    await updateWorkout(programId, workoutIndex, (current) => ({
      ...current,
      exercises: moveItem(current.exercises, exerciseIndex, to),
    }));
    router.setParams({ exerciseIndex: String(to) });
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Exercício' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="interactive"
        className="flex-1 bg-background"
        contentContainerClassName="gap-7 pb-10 pt-4">
        <View className="mx-5">
          <Text className="text-title2 font-bold text-label">{exercise.name}</Text>
          <Text className="mt-1 text-subhead text-label-secondary">
            {catalog ? capitalize(catalog.primaryMuscles.join(', ')) : 'Fora da base de exercícios: sem foto nem instruções.'}
          </Text>
        </View>

        <Section>
          <StepperRow
            label="Séries"
            display={String(exercise.sets)}
            onDecrement={() => update({ sets: exercise.sets - 1 })}
            onIncrement={() => update({ sets: exercise.sets + 1 })}
            canDecrement={exercise.sets > 1}
            canIncrement={exercise.sets < 20}
          />
          <FieldRow
            label="Repetições"
            value={formatReps(exercise.reps)}
            onCommit={(text) => {
              const reps = parseReps(text);
              if (!reps || (reps.type === 'range' && reps.max <= reps.min)) {
                notify('Repetições não reconhecidas', 'Use um número (10), uma faixa (8-12), "falha" ou um tempo (30s).');
                return;
              }
              void update({ reps });
            }}
          />
          <FieldRow
            label="Carga"
            value={exercise.loadKg === undefined ? '' : formatNumber(exercise.loadKg)}
            placeholder="Opcional"
            suffix="kg"
            keyboardType="decimal-pad"
            onCommit={(text) => {
              const value = parseDecimalInput(text);
              if (value === undefined) {
                notify('Carga inválida', 'Use só números, como 40 ou 22,5.');
                return;
              }
              void update({ loadKg: value ?? undefined });
            }}
          />
          <StepperRow
            label="Descanso"
            display={formatClock(rest)}
            onDecrement={() => update({ restSeconds: Math.max(0, rest - REST_STEP) })}
            onIncrement={() => update({ restSeconds: Math.min(600, rest + REST_STEP) })}
            canDecrement={rest > 0}
            canIncrement={rest < 600}
          />
        </Section>

        <Section title="Observações">
          <TextInput
            accessibilityLabel="Observações"
            className="min-h-[88px] px-5 py-3 text-body text-label"
            multiline
            textAlignVertical="top"
            value={notes}
            onChangeText={setNotes}
            onBlur={() => {
              if (notes !== (exercise.notes ?? '')) void update({ notes: notes.trim() || undefined });
            }}
            placeholder="Técnica, cadência, ajuste do aparelho..."
            placeholderTextColor={colors['label-tertiary']}
          />
        </Section>

        <Section separatorInset={56}>
          {exerciseIndex > 0 ? (
            <ListRow
              icon={{ ios: 'arrow.up', android: 'arrow_upward', web: 'arrow_upward' }}
              tone="tint"
              title="Mover para cima"
              onPress={() => move(exerciseIndex - 1)}
            />
          ) : null}
          {exerciseIndex < workout.exercises.length - 1 ? (
            <ListRow
              icon={{ ios: 'arrow.down', android: 'arrow_downward', web: 'arrow_downward' }}
              tone="tint"
              title="Mover para baixo"
              onPress={() => move(exerciseIndex + 1)}
            />
          ) : null}
          <ListRow
            icon={{ ios: 'trash', android: 'delete', web: 'delete' }}
            tone="destructive"
            title="Remover do treino"
            onPress={async () => {
              await updateWorkout(programId, workoutIndex, (current) => ({
                ...current,
                exercises: current.exercises.filter((_, index) => index !== exerciseIndex),
              }));
              router.back();
            }}
          />
        </Section>
      </ScrollView>
    </>
  );
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
