import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ListRow } from '@/components/ui/list-row';
import { Section } from '@/components/ui/section';
import { useFinishedSessions } from '@/db/queries';
import { formatDuration, formatRelativeDay, startOfWeek } from '@/lib/format';

export default function HistoryScreen() {
  const router = useRouter();
  const sessions = useFinishedSessions();

  if (sessions.length === 0) {
    return (
      <EmptyState
        symbol={{ ios: 'chart.bar', android: 'bar_chart', web: 'bar_chart' }}
        title="Sem histórico ainda"
        description="Cada treino que você concluir aparece aqui, com a carga e as repetições de cada série."
      />
    );
  }

  const weekStart = startOfWeek(new Date());
  const thisWeek = sessions.filter((session) => session.finishedAt && session.finishedAt >= weekStart);
  const weekTime = thisWeek.reduce(
    (total, session) => total + ((session.finishedAt?.getTime() ?? 0) - session.startedAt.getTime()),
    0,
  );

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-background"
      contentContainerClassName="gap-7 pb-10 pt-2">
      <Card>
        <Text className="text-subhead font-semibold text-tint">Esta semana</Text>
        <View className="mt-2 flex-row gap-10">
          <WeekStat value={String(thisWeek.length)} label={thisWeek.length === 1 ? 'treino' : 'treinos'} />
          <WeekStat value={thisWeek.length > 0 ? formatDuration(weekTime) : '—'} label="treinando" />
        </View>
      </Card>

      <Section title="Treinos feitos">
        {sessions.map((session) => (
          <ListRow
            key={session.id}
            title={session.plan.name}
            subtitle={`${formatRelativeDay(session.finishedAt ?? session.startedAt)}, ${formatDuration(
              (session.finishedAt?.getTime() ?? 0) - session.startedAt.getTime(),
            )}`}
            value={`${session.sets} ${session.sets === 1 ? 'série' : 'séries'}`}
            onPress={() => router.push({ pathname: '/history/[id]', params: { id: session.id } })}
          />
        ))}
      </Section>
    </ScrollView>
  );
}

function WeekStat({ value, label }: { value: string; label: string }) {
  return (
    <View>
      <Text className="font-rounded text-title1 font-bold text-label" style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
      <Text className="text-subhead text-label-secondary">{label}</Text>
    </View>
  );
}
