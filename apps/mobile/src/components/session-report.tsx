import { summarizeSets } from '@crazy-training/shared';
import { Text, View } from 'react-native';

import type { SessionRow, SessionSetRow } from '@/db/schema';
import { formatDuration, formatKg, formatNumber } from '@/lib/format';

import { Card } from './ui/card';
import { ListRow } from './ui/list-row';
import { Section } from './ui/section';

type Props = { session: SessionRow; sets: SessionSetRow[] };

/** Duração, séries, volume e calorias de uma sessão (resumo final e Histórico). */
export function SessionStats({ session, sets }: Props) {
  const summary = summarizeSets(sets);
  const end = session.finishedAt ?? new Date();
  const stats = [
    { label: 'Duração', value: formatDuration(end.getTime() - session.startedAt.getTime()) },
    { label: 'Séries', value: String(summary.sets) },
    { label: 'Volume', value: summary.volumeKg > 0 ? formatKg(summary.volumeKg) : '—' },
    { label: 'Calorias', value: session.calories ? `${formatNumber(session.calories, 0)} kcal` : '—' },
  ];

  return (
    <View className="gap-2">
      <Card>
        <View className="flex-row flex-wrap">
          {stats.map((stat) => (
            <View key={stat.label} className="w-1/2 py-2">
              <Text className="text-footnote font-semibold text-label-secondary">{stat.label}</Text>
              <Text className="font-rounded text-title2 font-bold text-label" style={{ fontVariant: ['tabular-nums'] }}>
                {stat.value}
              </Text>
            </View>
          ))}
        </View>
      </Card>
      {session.calories === null ? (
        <Text className="mx-9 text-footnote text-label-secondary">
          Informe seu peso no Perfil para estimar as calorias dos próximos treinos.
        </Text>
      ) : null}
    </View>
  );
}

/** Cada exercício do treino com as séries feitas ("40 kg × 10, 40 kg × 9"). */
export function SessionExercises({ session, sets }: Props) {
  return (
    <Section title="Exercícios">
      {session.plan.exercises.map((exercise, index) => {
        const done = sets.filter((set) => set.exerciseIndex === index);
        const isTime = exercise.reps.type === 'time';
        return (
          <ListRow
            key={index}
            title={exercise.name}
            subtitle={
              done.length > 0
                ? done.map((set) => formatSet(set.reps, set.loadKg, isTime)).join(', ')
                : session.skipped.includes(index)
                  ? 'Pulado'
                  : 'Não feito'
            }
            value={done.length > 0 ? `${done.length} ${done.length === 1 ? 'série' : 'séries'}` : undefined}
          />
        );
      })}
    </Section>
  );
}

export function formatSet(reps: number, loadKg: number | null, isTime = false): string {
  if (isTime) return `${reps} s`;
  return loadKg === null ? `${reps} reps` : `${formatKg(loadKg)} × ${reps}`;
}
