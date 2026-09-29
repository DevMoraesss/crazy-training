import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { FieldRow } from '@/components/ui/field-row';
import { HeaderButton } from '@/components/ui/header-button';
import { ListRow } from '@/components/ui/list-row';
import { Section } from '@/components/ui/section';
import { deleteProgram, updateProgram, useProgram } from '@/db/queries';
import { confirm } from '@/lib/dialogs';
import { nextWorkoutName } from '@/lib/program-edit';

export default function ProgramEditorScreen() {
  const router = useRouter();
  const { programId } = useLocalSearchParams<{ programId: string }>();
  const { program } = useProgram(programId);

  if (!program) return <View className="flex-1 bg-background" />;
  const data = program.data;

  const openWorkout = (workoutIndex: number) =>
    router.push({ pathname: '/editor/[programId]/[workoutIndex]', params: { programId, workoutIndex: String(workoutIndex) } });

  return (
    <>
      <Stack.Screen
        options={{ title: 'Editar programa', headerRight: () => <HeaderButton title="OK" bold onPress={() => router.back()} /> }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="interactive"
        className="flex-1 bg-background"
        contentContainerClassName="gap-7 pb-10 pt-4">
        <Section footer="As mudanças são salvas na hora.">
          <FieldRow
            label="Nome"
            value={data.name}
            onCommit={(text) => {
              if (text.trim()) void updateProgram(programId, (current) => ({ ...current, name: text.trim() }));
            }}
          />
        </Section>

        <Section title="Treinos" separatorInset={20}>
          {data.workouts.map((workout, index) => (
            <ListRow
              key={index}
              title={workout.name}
              subtitle={workout.focus}
              value={`${workout.exercises.length} exercícios`}
              onPress={() => openWorkout(index)}
            />
          ))}
          <ListRow
            icon={{ ios: 'plus', android: 'add', web: 'add' }}
            tone="tint"
            title="Adicionar treino"
            onPress={async () => {
              const index = data.workouts.length;
              await updateProgram(programId, (current) => ({
                ...current,
                workouts: [...current.workouts, { name: nextWorkoutName(current), modality: 'strength', exercises: [] }],
              }));
              openWorkout(index);
            }}
          />
        </Section>

        <Section>
          <ListRow
            tone="destructive"
            title="Apagar programa"
            onPress={async () => {
              const ok = await confirm(`Apagar "${data.name}"?`, 'Os treinos já feitos continuam no Histórico.', 'Apagar', true);
              if (!ok) return;
              await deleteProgram(programId);
              router.back();
            }}
          />
        </Section>
      </ScrollView>
    </>
  );
}
