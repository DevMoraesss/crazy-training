import { EXERCISE_CATALOG, searchExercises, type CatalogExercise, type WorkoutExercise } from '@crazy-training/shared';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, TextInput, View } from 'react-native';

import { ListRow } from '@/components/ui/list-row';
import { Section } from '@/components/ui/section';
import { updateWorkout } from '@/lib/program-edit';
import { useColors } from '@/theme';

// Ordem dos grupos na lista, de cima para baixo do corpo.
const MUSCLE_ORDER = [
  'peito',
  'costas',
  'ombros',
  'trapézio',
  'bíceps',
  'tríceps',
  'antebraço',
  'abdômen',
  'oblíquos',
  'lombar',
  'glúteos',
  'quadríceps',
  'posterior de coxa',
  'adutores',
  'abdutores',
  'panturrilha',
  'pescoço',
  'corpo inteiro',
];

const GROUPS = groupByMuscle(EXERCISE_CATALOG);

export default function AddExerciseScreen() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams<{ programId: string; workoutIndex: string }>();
  const workoutIndex = Number(params.workoutIndex);
  const [query, setQuery] = useState('');
  const search = query.trim();

  const add = async (exercise: WorkoutExercise) => {
    await updateWorkout(params.programId, workoutIndex, (current) => ({
      ...current,
      exercises: [...current.exercises, exercise],
    }));
    router.back();
  };

  const addFromCatalog = (exercise: CatalogExercise) =>
    add({
      exerciseId: exercise.id,
      name: exercise.name,
      sets: 3,
      reps: exercise.modality === 'mobility' ? { type: 'time', seconds: 30 } : { type: 'fixed', value: 10 },
      restSeconds: 60,
    });

  const row = (exercise: CatalogExercise) => (
    <ListRow
      key={exercise.id}
      title={exercise.name}
      subtitle={exercise.equipment}
      chevron={false}
      onPress={() => addFromCatalog(exercise)}
    />
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Adicionar exercício',
          // Barra de busca nativa do iOS no cabeçalho. Na web, um campo comum logo abaixo.
          headerSearchBarOptions:
            Platform.OS === 'web'
              ? undefined
              : {
                  placeholder: 'Buscar exercício',
                  hideWhenScrolling: false,
                  autoFocus: true,
                  onChangeText: (event) => setQuery(event.nativeEvent.text),
                },
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        className="flex-1 bg-background"
        contentContainerClassName="gap-7 pb-10 pt-4">
        {Platform.OS === 'web' ? (
          <View className="mx-4">
            <TextInput
              accessibilityLabel="Buscar exercício"
              className="h-10 rounded-xl bg-fill-secondary px-3 text-body text-label"
              placeholder="Buscar exercício"
              placeholderTextColor={colors['label-secondary']}
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
          </View>
        ) : null}

        {search ? (
          <Section>
            {searchExercises(search, 40).map(row)}
            <ListRow
              icon={{ ios: 'plus', android: 'add', web: 'add' }}
              tone="tint"
              title={`Adicionar "${search}"`}
              subtitle="Exercício fora da base, sem foto nem instruções"
              onPress={() => add({ name: search, sets: 3, reps: { type: 'fixed', value: 10 }, restSeconds: 60 })}
            />
          </Section>
        ) : (
          GROUPS.map(([muscle, exercises]) => (
            <Section key={muscle} title={capitalize(muscle)}>
              {exercises.map(row)}
            </Section>
          ))
        )}
      </ScrollView>
    </>
  );
}

function groupByMuscle(catalog: readonly CatalogExercise[]): [string, CatalogExercise[]][] {
  const groups = new Map<string, CatalogExercise[]>();
  for (const exercise of catalog) {
    const muscle = exercise.primaryMuscles[0] ?? 'corpo inteiro';
    groups.set(muscle, [...(groups.get(muscle) ?? []), exercise]);
  }
  const rank = (muscle: string) => (MUSCLE_ORDER.includes(muscle) ? MUSCLE_ORDER.indexOf(muscle) : MUSCLE_ORDER.length);
  return [...groups.entries()]
    .sort(([a], [b]) => rank(a) - rank(b))
    .map(([muscle, list]) => [muscle, [...list].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))]);
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
