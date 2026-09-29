import {
  DEFAULT_MET,
  DEFAULT_REST_SECONDS,
  estimateCalories,
  exerciseImageUrls,
  exerciseKey,
  getExercise,
  sessionPosition,
  suggestedReps,
  type WorkoutExercise,
} from '@crazy-training/shared';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SessionExercises, SessionStats, formatSet } from '@/components/session-report';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RestRing } from '@/components/ui/rest-ring';
import { RoundButton } from '@/components/ui/round-button';
import {
  deleteSession,
  finishSession,
  getProfile,
  recordSet,
  skipExercise,
  undoLastSet,
  useLastPerformance,
  useSession,
  useSessionSets,
} from '@/db/queries';
import type { SessionRow, SessionSetRow } from '@/db/schema';
import { choose, confirm, notify } from '@/lib/dialogs';
import { formatClock, formatElapsed, formatNumber, formatRelativeDay, parseDecimalInput } from '@/lib/format';
import { cancelRestEnd, scheduleRestEnd } from '@/lib/rest-notification';
import { useNow } from '@/lib/use-now';
import { useColors } from '@/theme';

const LOAD_STEP = 2.5;
const DEVICE = Platform.OS === 'ios' ? 'O iPhone' : 'O celular';

type Rest = { endsAt: number; total: number; notificationId: string | null };
type Draft = { positionKey: string; reps: number; loadKg: number | null };

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession(id);
  const sets = useSessionSets(id);
  // A tela não apaga durante o treino.
  useKeepAwake();

  if (!session) return <View className="flex-1 bg-background" />;
  return session.finishedAt ? <Summary session={session} sets={sets} /> : <ActiveSession session={session} sets={sets} />;
}

function ActiveSession({ session, sets }: { session: SessionRow; sets: SessionSetRow[] }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const now = useNow(500);
  const plan = session.plan;
  const position = sessionPosition(plan, sets, session.skipped);
  const exercise = position ? plan.exercises[position.exerciseIndex] : undefined;
  const [rest, setRest] = useState<Rest | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [notificationsOff, setNotificationsOff] = useState(false);
  const history = useLastPerformance(exercise ? exerciseKey(exercise) : null, session.id);

  // Valores da série: o que foi feito na série anterior hoje, senão a mesma série da última vez, senão o plano.
  const positionKey = position ? `${position.exerciseIndex}:${position.setNumber}` : 'fim';
  const today = position ? sets.filter((set) => set.exerciseIndex === position.exerciseIndex).at(-1) : undefined;
  const lastTime = position
    ? (history.find((set) => set.setNumber === position.setNumber) ?? history.at(-1))
    : undefined;
  const current: Draft =
    draft?.positionKey === positionKey
      ? draft
      : {
          positionKey,
          reps: today?.reps ?? lastTime?.reps ?? (exercise ? suggestedReps(exercise.reps) : 0),
          loadKg: today ? today.loadKg : lastTime ? lastTime.loadKg : (exercise?.loadKg ?? null),
        };

  // Descanso acabou com o app aberto: vibra e volta para a série. Se o app estava em segundo
  // plano, o timer dispara assim que ele volta (e a notificação local já avisou).
  useEffect(() => {
    if (!rest) return;
    const timer = setTimeout(
      () => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setRest(null);
      },
      Math.max(0, rest.endsAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [rest]);

  const scheduleRest = async (seconds: number, total: number) => {
    const endsAt = Date.now() + seconds * 1000;
    setRest({ endsAt, total, notificationId: null });
    const nextExercise = position ? plan.exercises[position.exerciseIndex] : undefined;
    const notificationId = await scheduleRestEnd(seconds, nextExercise ? `Próxima série: ${nextExercise.name}.` : 'Hora da próxima série.');
    setNotificationsOff(notificationId === null);
    setRest((value) => (value?.endsAt === endsAt ? { ...value, notificationId } : value));
  };

  const endRest = async () => {
    if (rest) await cancelRestEnd(rest.notificationId);
    setRest(null);
  };

  const adjustRest = async (deltaSeconds: number) => {
    if (!rest) return;
    await cancelRestEnd(rest.notificationId);
    const remaining = Math.max(1, (rest.endsAt - Date.now()) / 1000 + deltaSeconds);
    await scheduleRest(remaining, Math.max(rest.total, remaining));
  };

  const completeSet = async () => {
    if (!position || !exercise) return;
    if (current.reps <= 0) {
      notify('Informe as repetições', 'Use o + ou toque no número para digitar.');
      return;
    }
    await recordSet({
      sessionId: session.id,
      exerciseIndex: position.exerciseIndex,
      plan,
      setNumber: position.setNumber,
      reps: current.reps,
      loadKg: current.loadKg,
    });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const next = sessionPosition(plan, [...sets, { exerciseIndex: position.exerciseIndex }], session.skipped);
    const seconds = exercise.restSeconds ?? DEFAULT_REST_SECONDS;
    if (next && seconds > 0) await scheduleRest(seconds, seconds);
  };

  const finish = async () => {
    await endRest();
    const profile = await getProfile();
    const minutes = (Date.now() - session.startedAt.getTime()) / 60_000;
    const calories = profile.weightKg
      ? estimateCalories({ met: DEFAULT_MET[plan.modality], weightKg: profile.weightKg, durationMinutes: minutes })
      : null;
    await finishSession(session.id, calories);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const discard = async () => {
    await endRest();
    await deleteSession(session.id);
    router.back();
  };

  const close = async () => {
    if (sets.length === 0) {
      const choice = await choose(
        'Sair do treino?',
        'Nenhuma série foi registrada.',
        [{ label: 'Descartar treino', value: 'discard', style: 'destructive' }],
        'Continuar treinando',
      );
      if (choice === 'discard') await discard();
      return;
    }
    const choice = await choose(
      'Encerrar o treino?',
      `${sets.length} ${sets.length === 1 ? 'série registrada' : 'séries registradas'}.`,
      [
        { label: 'Salvar e encerrar', value: 'finish' },
        { label: 'Continuar depois', value: 'later' },
        { label: 'Descartar treino', value: 'discard', style: 'destructive' },
      ],
      'Continuar treinando',
    );
    if (choice === 'finish') await finish();
    if (choice === 'later') {
      await endRest();
      router.back();
    }
    if (choice === 'discard') await discard();
  };

  const skip = async () => {
    if (!position || !exercise) return;
    const ok = await confirm(`Pular ${exercise.name}?`, 'As séries que faltam deste exercício não serão feitas hoje.', 'Pular');
    if (!ok) return;
    await endRest();
    await skipExercise(session.id, position.exerciseIndex);
  };

  const undo = async () => {
    await endRest();
    await undoLastSet(session.id);
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top + 8 }}>
      <View className="h-11 flex-row items-center justify-between px-4">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Encerrar treino"
          onPress={close}
          className="h-11 w-11 items-center justify-center rounded-full bg-surface active:opacity-60">
          <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={17} tintColor={colors.label} weight="semibold" />
        </Pressable>
        <View className="items-center">
          <Text className="text-headline font-semibold text-label">{plan.name}</Text>
          <Text className="text-footnote text-label-secondary">
            {position ? `Exercício ${position.exerciseIndex + 1} de ${plan.exercises.length}` : 'Tudo feito'}
          </Text>
        </View>
        <View className="h-11 min-w-[72px] items-center justify-center rounded-full bg-surface px-3.5">
          <Text
            accessibilityLabel="Tempo de treino"
            className="text-headline font-semibold text-label"
            style={{ fontVariant: ['tabular-nums'] }}>
            {formatElapsed(now - session.startedAt.getTime())}
          </Text>
        </View>
      </View>

      <Progress plan={plan.exercises} sets={sets} skipped={session.skipped} />

      <ScrollView className="flex-1" contentContainerClassName="pb-6" keyboardDismissMode="on-drag">
        {rest ? (
          <RestView
            rest={rest}
            now={now}
            upcoming={position && exercise ? { exercise, setNumber: position.setNumber, draft: current } : null}
            notificationsOff={notificationsOff}
            onAdjust={adjustRest}
          />
        ) : position && exercise ? (
          <View className="gap-4 pt-5">
            <Text className="mx-5 text-title1 font-bold text-label">{exercise.name}</Text>
            <ExerciseMedia exercise={exercise} />
            <Card className="px-0 py-4">
              <View className="flex-row">
                <MetricInput
                  label={exercise.reps.type === 'time' ? 'Segundos' : 'Repetições'}
                  value={current.reps}
                  step={1}
                  onChange={(reps) => setDraft({ ...current, reps: reps ?? 0 })}
                />
                <View className="bg-separator" style={{ width: StyleSheet.hairlineWidth }} />
                <MetricInput
                  label="Carga (kg)"
                  value={current.loadKg}
                  step={LOAD_STEP}
                  decimal
                  onChange={(loadKg) => setDraft({ ...current, loadKg })}
                />
              </View>
            </Card>
            <View className="mx-5 flex-row items-center justify-between">
              <Text className="text-headline font-semibold text-label">
                Série {position.setNumber} de {exercise.sets}
              </Text>
              <SetDots total={exercise.sets} done={position.setNumber - 1} />
            </View>
            <Text className="mx-5 text-subhead text-label-secondary">
              {lastTime
                ? `Na última vez: ${formatSet(lastTime.reps, lastTime.loadKg, exercise.reps.type === 'time')}`
                : 'Primeira vez neste exercício.'}
            </Text>
            {exercise.notes ? <Text className="mx-5 text-subhead text-label-secondary">{exercise.notes}</Text> : null}
          </View>
        ) : (
          <View className="items-center px-10 pt-16">
            <SymbolView
              name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
              size={56}
              tintColor={colors.success}
            />
            <Text className="mt-4 text-center text-title2 font-bold text-label">Todas as séries feitas</Text>
            <Text className="mt-2 text-center text-body text-label-secondary">Finalize para salvar o treino no histórico.</Text>
          </View>
        )}
      </ScrollView>

      <View className="gap-1 px-4 pt-2" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
        {rest ? (
          <>
            <Button title="Pular descanso" size="xlarge" onPress={endRest} />
            <Button title="Desfazer última série" variant="plain" size="medium" onPress={undo} />
          </>
        ) : position ? (
          <>
            <Button title="Concluir série" size="xlarge" onPress={completeSet} />
            <Button title="Pular exercício" variant="plain" size="medium" onPress={skip} />
          </>
        ) : (
          <>
            <Button title="Finalizar treino" size="xlarge" onPress={finish} />
            <Button title="Desfazer última série" variant="plain" size="medium" onPress={undo} />
          </>
        )}
      </View>
    </View>
  );
}

/** Uma barra por exercício, preenchida conforme as séries feitas. */
function Progress({ plan, sets, skipped }: { plan: WorkoutExercise[]; sets: SessionSetRow[]; skipped: number[] }) {
  return (
    <View className="mt-3 flex-row gap-1 px-5" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {plan.map((exercise, index) => {
        const done = sets.filter((set) => set.exerciseIndex === index).length;
        const fraction = skipped.includes(index) ? 1 : Math.min(1, done / exercise.sets);
        return (
          <View key={index} className="h-1 flex-1 overflow-hidden rounded-full bg-fill">
            <View
              className={`h-full ${skipped.includes(index) ? 'bg-icon-tertiary' : 'bg-tint'}`}
              style={{ width: `${fraction * 100}%` }}
            />
          </View>
        );
      })}
    </View>
  );
}

/** Foto do movimento: as duas posições do exercício se alternando, como uma animação. */
function ExerciseMedia({ exercise }: { exercise: WorkoutExercise }) {
  const colors = useColors();
  const frameTick = useNow(1200);
  const catalog = exercise.exerciseId ? getExercise(exercise.exerciseId) : undefined;
  const urls = catalog ? exerciseImageUrls(catalog) : [];
  const frame = urls.length > 0 ? urls[Math.floor(frameTick / 1200) % urls.length] : undefined;

  const howTo = () => {
    if (!catalog) return;
    notify(catalog.name, catalog.instructions.map((step, index) => `${index + 1}. ${step}`).join('\n\n'));
  };

  const video = () =>
    Linking.openURL(`https://www.youtube.com/results?search_query=${encodeURIComponent(`${exercise.name} execução`)}`);

  return (
    <View className="mx-4 h-[200px] overflow-hidden rounded-[22px] bg-surface-raised" style={{ borderCurve: 'continuous' }}>
      {frame ? (
        <Image
          source={{ uri: frame }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={200}
          cachePolicy="disk"
          accessibilityLabel={`Demonstração: ${exercise.name}`}
        />
      ) : (
        <View className="flex-1 items-center justify-center gap-2">
          <SymbolView
            name={{ ios: 'figure.strengthtraining.traditional', android: 'fitness_center', web: 'fitness_center' }}
            size={40}
            tintColor={colors['icon-secondary']}
          />
          <Text className="text-subhead text-label-secondary">Sem foto para este exercício</Text>
        </View>
      )}
      <View className="absolute bottom-3 left-3 flex-row gap-2">
        <MediaChip title="Ver vídeo" icon={{ ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' }} onPress={video} />
        {catalog && catalog.instructions.length > 0 ? (
          <MediaChip title="Como fazer" icon={{ ios: 'list.bullet', android: 'format_list_bulleted', web: 'format_list_bulleted' }} onPress={howTo} />
        ) : null}
      </View>
    </View>
  );
}

function MediaChip({ title, icon, onPress }: { title: string; icon: SymbolViewProps['name']; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="h-9 flex-row items-center gap-1.5 rounded-full bg-surface px-3.5 active:opacity-70">
      <SymbolView name={icon} size={13} tintColor={colors.label} />
      <Text className="text-subhead font-semibold text-label">{title}</Text>
    </Pressable>
  );
}

type MetricInputProps = {
  label: string;
  value: number | null;
  step: number;
  decimal?: boolean;
  onChange: (value: number | null) => void;
};

/** Número grande editável (toque para digitar) com − e + embaixo. */
function MetricInput({ label, value, step, decimal, onChange }: MetricInputProps) {
  const colors = useColors();
  const shown = value === null ? '' : formatNumber(value);
  const [text, setText] = useState(shown);
  const [lastShown, setLastShown] = useState(shown);

  // O valor mudou pelos botões ou pela troca de série: o campo acompanha.
  if (shown !== lastShown) {
    setLastShown(shown);
    setText(shown);
  }

  const commit = () => {
    const parsed = parseDecimalInput(text);
    if (parsed === undefined) {
      setText(shown);
      return;
    }
    onChange(parsed === null ? null : decimal ? parsed : Math.round(parsed));
  };

  return (
    <View className="flex-1 px-5">
      <Text className="text-footnote font-semibold text-label-secondary">{label}</Text>
      <TextInput
          accessibilityLabel={label}
          className="h-[72px] min-w-[56px] font-rounded text-metric font-extrabold text-label"
          style={{ fontVariant: ['tabular-nums'] }}
          value={text}
          onChangeText={setText}
          onBlur={commit}
          onSubmitEditing={commit}
          keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
          placeholder="—"
          placeholderTextColor={colors['label-tertiary']}
          selectTextOnFocus
        />
      <View className="mt-1.5 flex-row gap-2.5">
        <RoundButton
          label="−"
          accessibilityLabel={`Diminuir ${label.toLowerCase()}`}
          onPress={() => onChange(Math.max(0, (value ?? 0) - step))}
          disabled={!value}
        />
        <RoundButton label="+" accessibilityLabel={`Aumentar ${label.toLowerCase()}`} onPress={() => onChange((value ?? 0) + step)} />
      </View>
    </View>
  );
}

function SetDots({ total, done }: { total: number; done: number }) {
  const colors = useColors();
  return (
    <View className="flex-row gap-2" accessibilityLabel={`${done} de ${total} séries feitas`}>
      {Array.from({ length: total }, (_, index) =>
        index < done ? (
          <View key={index} className="h-[26px] w-[26px] items-center justify-center rounded-full bg-tint">
            <SymbolView name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={12} tintColor={colors['on-tint']} weight="bold" />
          </View>
        ) : index === done ? (
          <View key={index} className="h-[26px] w-[26px] rounded-full border-[2.5px] border-tint" />
        ) : (
          <View key={index} className="h-[26px] w-[26px] rounded-full bg-fill" />
        ),
      )}
    </View>
  );
}

type RestViewProps = {
  rest: Rest;
  now: number;
  upcoming: { exercise: WorkoutExercise; setNumber: number; draft: Draft } | null;
  notificationsOff: boolean;
  onAdjust: (deltaSeconds: number) => void;
};

function RestView({ rest, now, upcoming, notificationsOff, onAdjust }: RestViewProps) {
  const remaining = Math.max(0, (rest.endsAt - now) / 1000);
  return (
    <View className="items-center gap-6 pt-8">
      <RestRing remaining={remaining / rest.total}>
        <Text className="text-subhead font-semibold text-label-secondary">Descanso</Text>
        <Text
          accessibilityRole="timer"
          className="font-rounded text-metric font-extrabold text-label"
          style={{ fontVariant: ['tabular-nums'] }}>
          {formatClock(remaining)}
        </Text>
        <Text className="text-subhead text-label-secondary">de {formatClock(rest.total)}</Text>
      </RestRing>

      <View className="w-full flex-row justify-between px-9">
        <RoundButton size={76} label="−15 s" accessibilityLabel="Tirar 15 segundos" onPress={() => onAdjust(-15)} />
        <RoundButton size={76} label="+30 s" accessibilityLabel="Somar 30 segundos" onPress={() => onAdjust(30)} />
      </View>

      {upcoming ? (
        <View className="self-stretch">
          <Card>
            <Text className="text-footnote font-semibold text-label-secondary">A seguir</Text>
            <Text className="mt-0.5 text-headline font-semibold text-label">{upcoming.exercise.name}</Text>
            <Text className="text-subhead text-label-secondary">
              Série {upcoming.setNumber} de {upcoming.exercise.sets}:{' '}
              {formatSet(upcoming.draft.reps, upcoming.draft.loadKg, upcoming.exercise.reps.type === 'time')}
            </Text>
          </Card>
        </View>
      ) : null}

      <Text className="mx-8 text-center text-footnote text-label-secondary">
        {notificationsOff
          ? 'Ative as notificações do app nos Ajustes para ser avisado com a tela bloqueada.'
          : `${DEVICE} avisa quando o descanso terminar, mesmo com a tela bloqueada.`}
      </Text>
    </View>
  );
}

function Summary({ session, sets }: { session: SessionRow; sets: SessionSetRow[] }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const finishedAt = session.finishedAt ?? new Date();

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <ScrollView contentContainerClassName="gap-7 pb-8 pt-10">
        <View className="items-center px-8">
          <SymbolView
            name={{ ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' }}
            size={64}
            tintColor={colors.success}
          />
          <Text className="mt-4 text-title1 font-bold text-label">Treino concluído</Text>
          <Text className="mt-1 text-body text-label-secondary">
            {session.plan.name}, {formatRelativeDay(finishedAt).toLowerCase()}
          </Text>
        </View>
        <SessionStats session={session} sets={sets} />
        <SessionExercises session={session} sets={sets} />
      </ScrollView>
      <View className="px-4 pt-2" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
        <Button title="Fechar" size="xlarge" onPress={() => router.back()} />
      </View>
    </View>
  );
}

