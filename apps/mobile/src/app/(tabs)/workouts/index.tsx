import type { Program } from '@crazy-training/shared';
import { useRouter } from 'expo-router';
import { ScrollView } from 'react-native';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ListRow } from '@/components/ui/list-row';
import { Section } from '@/components/ui/section';
import { usePrograms } from '@/db/queries';
import type { ProgramRow } from '@/db/schema';
import { createBlankProgram } from '@/lib/program-actions';

const IMPORT_ICON = { ios: 'square.and.arrow.down', android: 'download', web: 'download' } as const;
const ADD_ICON = { ios: 'plus', android: 'add', web: 'add' } as const;

export default function WorkoutsScreen() {
  const router = useRouter();
  const programs = usePrograms();

  if (programs.length === 0) {
    return (
      <EmptyState
        symbol={{ ios: 'dumbbell', android: 'fitness_center', web: 'fitness_center' }}
        title="Nenhum treino ainda"
        description="Importe de um PDF ou planilha com a ajuda de uma IA, ou monte o seu do zero.">
        <Button title="Importar treino" icon={IMPORT_ICON} onPress={() => router.push('/import')} />
        <Button title="Criar do zero" variant="gray" onPress={() => createBlankProgram(router)} />
      </EmptyState>
    );
  }

  const active = programs.find((program) => program.active);
  const others = programs.filter((program) => !program.active);
  const open = (row: ProgramRow) => router.push({ pathname: '/workouts/[id]', params: { id: row.id } });

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-background"
      contentContainerClassName="gap-7 pb-10 pt-2">
      {active ? (
        <Section title="Programa ativo" footer="O Hoje sugere os treinos deste programa, em rodízio.">
          <ListRow title={active.data.name} subtitle={workoutNames(active.data)} onPress={() => open(active)} />
        </Section>
      ) : null}

      {others.length > 0 ? (
        <Section title="Outros programas">
          {others.map((row) => (
            <ListRow key={row.id} title={row.data.name} subtitle={workoutNames(row.data)} onPress={() => open(row)} />
          ))}
        </Section>
      ) : null}

      <Section separatorInset={56}>
        <ListRow icon={IMPORT_ICON} tone="tint" title="Importar treino" onPress={() => router.push('/import')} />
        <ListRow icon={ADD_ICON} tone="tint" title="Criar programa" onPress={() => createBlankProgram(router)} />
      </Section>
    </ScrollView>
  );
}

function workoutNames(program: Program): string {
  if (program.workouts.length === 0) return 'Sem treinos';
  return program.workouts.map((workout) => workout.name).join(', ');
}
