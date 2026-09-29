import { estimateWorkoutMinutes, formatReps, nextWorkoutIndex, type Workout } from '@crazy-training/shared';
import { useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ListRow } from '@/components/ui/list-row';
import { Section } from '@/components/ui/section';
import { sampleProgram } from '@/data/sample-program';
import {
  createProgram,
  deleteSession,
  useActiveProgram,
  useLastFinishedSession,
  useUnfinishedSession,
} from '@/db/queries';
import type { SessionRow } from '@/db/schema';
import { confirm } from '@/lib/dialogs';
import { formatDayHeading, formatTime } from '@/lib/format';
import { createBlankProgram, startWorkout } from '@/lib/program-actions';
import { linkToCatalog } from '@/lib/program-edit';
import { useColors } from '@/theme';

const PLAY = { ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' } as const;

export default function TodayScreen() {
  const router = useRouter();
  const program = useActiveProgram();
  const unfinished = useUnfinishedSession();
  const lastSession = useLastFinishedSession(program?.id);

  if (!program) return <NoProgram />;

  const workouts = program.data.workouts;
  const nextIndex = nextWorkoutIndex(program.data, lastSession?.workoutIndex ?? null);
  const next = workouts[nextIndex];

  const start = (workoutIndex: number) =>
    startWorkout(router, {
      programId: program.id,
      program: program.data,
      workoutIndex,
      hasUnfinishedSession: Boolean(unfinished),
    });

  return (
    // ScrollView como primeiro filho: é o que faz o título grande encolher ao rolar.
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-background"
      contentContainerClassName="gap-7 pb-10">
      <View>
        <Text className="mx-5 text-subhead text-label-secondary">{formatDayHeading(new Date())}</Text>
        {unfinished ? (
          <ResumeCard session={unfinished} />
        ) : next ? (
          <NextWorkoutCard workout={next} onStart={() => start(nextIndex)} />
        ) : null}
      </View>

      {next && !unfinished ? (
        <Section title="Exercícios">
          {next.exercises.map((exercise, index) => (
            <ListRow key={index} title={exercise.name} value={`${exercise.sets} × ${formatReps(exercise.reps)}`} />
          ))}
        </Section>
      ) : null}

      {workouts.length > 1 ? (
        <Section title="Outros treinos" footer={`Programa: ${program.data.name}`}>
          {workouts.map((workout, index) =>
            index === nextIndex && !unfinished ? null : (
              <ListRow
                key={index}
                title={workout.name}
                subtitle={workout.focus}
                value={`${workout.exercises.length} exercícios`}
                onPress={async () => {
                  const ok = await confirm(
                    `Começar ${workout.name}?`,
                    'O rodízio segue a partir deste treino.',
                    'Começar',
                  );
                  if (ok) await start(index);
                }}
              />
            ),
          )}
        </Section>
      ) : null}
    </ScrollView>
  );
}

function NextWorkoutCard({ workout, onStart }: { workout: Workout; onStart: () => void }) {
  return (
    <Card className="mt-4">
      <Text className="text-subhead font-semibold text-tint">Próximo treino</Text>
      <Text className="mt-1 text-title1 font-bold text-label">{workout.name}</Text>
      {workout.focus ? <Text className="text-body text-label-secondary">{workout.focus}</Text> : null}
      <View className="mt-3.5 flex-row flex-wrap gap-x-5 gap-y-1">
        <Stat
          symbol={{ ios: 'list.bullet', android: 'format_list_bulleted', web: 'format_list_bulleted' }}
          label={`${workout.exercises.length} exercícios`}
        />
        {workout.exercises.length > 0 ? (
          <Stat
            symbol={{ ios: 'clock', android: 'schedule', web: 'schedule' }}
            label={`cerca de ${estimateWorkoutMinutes(workout)} min`}
          />
        ) : null}
      </View>
      <View className="mt-5">
        <Button title="Começar treino" icon={PLAY} onPress={onStart} />
      </View>
    </Card>
  );
}

function ResumeCard({ session }: { session: SessionRow }) {
  const router = useRouter();
  return (
    <Card className="mt-4">
      <Text className="text-subhead font-semibold text-tint">Treino em andamento</Text>
      <Text className="mt-1 text-title1 font-bold text-label">{session.plan.name}</Text>
      <Text className="text-body text-label-secondary">Começou às {formatTime(session.startedAt)}</Text>
      <View className="mt-5 gap-2">
        <Button
          title="Continuar treino"
          icon={PLAY}
          onPress={() => router.push({ pathname: '/session/[id]', params: { id: session.id } })}
        />
        <Button
          title="Descartar"
          variant="plain"
          onPress={async () => {
            const ok = await confirm('Descartar este treino?', 'As séries registradas nele serão apagadas.', 'Descartar', true);
            if (ok) await deleteSession(session.id);
          }}
        />
      </View>
    </Card>
  );
}

function NoProgram() {
  const router = useRouter();
  return (
    <EmptyState
      symbol={{ ios: 'figure.strengthtraining.traditional', android: 'fitness_center', web: 'fitness_center' }}
      title="Monte seu treino"
      description="Importe o treino que você já tem, crie um do zero ou comece com um programa de exemplo.">
      <Button
        title="Importar treino"
        icon={{ ios: 'square.and.arrow.down', android: 'download', web: 'download' }}
        onPress={() => router.push('/import')}
      />
      <Button title="Criar do zero" variant="gray" onPress={() => createBlankProgram(router)} />
      <Button
        title="Usar programa de exemplo"
        variant="plain"
        onPress={() => createProgram(linkToCatalog(sampleProgram), { activate: true })}
      />
    </EmptyState>
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
