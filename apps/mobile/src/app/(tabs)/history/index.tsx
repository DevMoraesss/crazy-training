import { ACTIVITY_LABELS, activeDateKeys, localDateKey, weekDateKeys } from '@crazy-training/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { ActivityCalendar } from '@/components/activity-calendar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';
import { Section } from '@/components/ui/section';
import { deleteActivity, useActivities } from '@/db/activity-queries';
import { useFinishedSessions, useProfile } from '@/db/queries';
import { confirm, notify } from '@/lib/dialogs';
import { formatDuration } from '@/lib/format';

export default function HistoryScreen() {
  const router = useRouter();
  const sessions = useFinishedSessions();
  const activities = useActivities();
  const profile = useProfile();
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState(() => localDateKey(new Date()));
  const activeDays = activeDateKeys(activities, sessions);
  const week = weekDateKeys(new Date());
  const weekCount = week.filter((date) => activeDays.has(date)).length;
  const daySessions = sessions.filter((session) => session.finishedAt && localDateKey(session.finishedAt) === selected);
  const dayActivities = activities.filter((activity) => activity.date === selected);
  const remove = async (id: string) => {
    if (
      !(await confirm(
        'Remover atividade?',
        'O calendário será atualizado. Seus outros registros serão mantidos.',
        'Remover',
        true,
      ))
    )
      return;
    try {
      await deleteActivity(id);
    } catch {
      notify('Não foi possível remover', 'Tente novamente.');
    }
  };
  const selectedDate = new Date(`${selected}T12:00:00`);
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-background"
      contentContainerClassName="gap-6 pb-10 pt-2"
    >
      <Card>
        <Text className="text-subhead font-semibold text-tint">Esta semana</Text>
        <Text className="mt-2 font-rounded text-title1 font-bold text-label">
          {weekCount} {weekCount === 1 ? 'dia ativo' : 'dias ativos'}
          {profile.daysPerWeek ? ` de ${profile.daysPerWeek}` : ''}
        </Text>
        <Text className="mt-1 text-subhead text-label-secondary">
          De segunda a domingo. Corrida, caminhada e musculação contam; cada dia conta uma vez.
        </Text>
      </Card>
      <ActivityCalendar
        month={month}
        selected={selected}
        activeDays={activeDays}
        onMonth={setMonth}
        onSelect={setSelected}
      />
      <View className="mx-4">
        <Button
          title={selected > localDateKey(new Date()) ? 'Registrar atividade de hoje' : 'Registrar atividade'}
          onPress={() =>
            router.push({
              pathname: '/activity/new',
              params: { date: selected > localDateKey(new Date()) ? localDateKey(new Date()) : selected },
            })
          }
        />
      </View>
      <Section title={selectedDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}>
        {daySessions.map((session) => (
          <ListRow
            key={session.id}
            title={session.plan.name}
            subtitle={`${session.plan.modality === 'strength' ? 'Musculação' : 'Treino'} · ${formatDuration((session.finishedAt?.getTime() ?? 0) - session.startedAt.getTime())}`}
            value={`${session.sets} séries`}
            onPress={() => router.push({ pathname: '/history/[id]', params: { id: session.id } })}
          />
        ))}
        {dayActivities.map((activity) => (
          <ListRow
            key={activity.id}
            title={ACTIVITY_LABELS[activity.data.type]}
            subtitle={`${activity.data.durationMinutes} min${activity.data.distanceKm == null ? '' : ` · ${activity.data.distanceKm.toLocaleString('pt-BR')} km`}${activity.data.notes ? ` · ${activity.data.notes}` : ''}`}
          />
        ))}
        {dayActivities.map((activity) => (
          <ListRow
            key={`delete-${activity.id}`}
            title={`Remover ${ACTIVITY_LABELS[activity.data.type].toLowerCase()}`}
            tone="destructive"
            onPress={() => remove(activity.id)}
          />
        ))}
        {!daySessions.length && !dayActivities.length ? (
          <ListRow
            title="Nenhuma atividade registrada"
            subtitle={
              selected > localDateKey(new Date())
                ? 'As atividades feitas aparecerão aqui.'
                : 'Foi correr? Registre a atividade para contar no seu dia.'
            }
          />
        ) : null}
      </Section>
      {sessions.length ? (
        <Section title="Treinos concluídos">
          {sessions.map((session) => (
            <ListRow
              key={session.id}
              title={session.plan.name}
              subtitle={session.finishedAt?.toLocaleDateString('pt-BR')}
              value={`${session.sets} séries`}
              onPress={() => router.push({ pathname: '/history/[id]', params: { id: session.id } })}
            />
          ))}
        </Section>
      ) : null}
    </ScrollView>
  );
}
