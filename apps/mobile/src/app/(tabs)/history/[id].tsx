import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { SessionExercises, SessionStats } from '@/components/session-report';
import { EmptyState } from '@/components/ui/empty-state';
import { ListRow } from '@/components/ui/list-row';
import { Section } from '@/components/ui/section';
import { deleteSession, useSession, useSessionSets } from '@/db/queries';
import { confirm } from '@/lib/dialogs';
import { formatDayHeading, formatTime } from '@/lib/format';

export default function HistorySessionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, loaded } = useSession(id);
  const sets = useSessionSets(id);

  if (!session) {
    return loaded ? (
      <EmptyState
        symbol={{ ios: 'trash', android: 'delete', web: 'delete' }}
        title="Treino apagado"
        description="Este treino não está mais no histórico."
      />
    ) : (
      <View className="flex-1 bg-background" />
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: session.plan.name, headerLargeTitleEnabled: false }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        className="flex-1 bg-background"
        contentContainerClassName="gap-7 pb-10 pt-4">
        <Text className="mx-5 text-subhead text-label-secondary">
          {formatDayHeading(session.startedAt)}, às {formatTime(session.startedAt)}
        </Text>
        <SessionStats session={session} sets={sets} />
        <SessionExercises session={session} sets={sets} />
        <Section>
          <ListRow
            tone="destructive"
            title="Apagar do histórico"
            onPress={async () => {
              const ok = await confirm('Apagar este treino?', 'As séries registradas nele serão apagadas.', 'Apagar', true);
              if (!ok) return;
              await deleteSession(session.id);
              router.back();
            }}
          />
        </Section>
      </ScrollView>
    </>
  );
}
