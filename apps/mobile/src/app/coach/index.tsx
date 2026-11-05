import { Stack, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { PlanQuestionnaire } from '@/components/plan-questionnaire';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';
import { Section } from '@/components/ui/section';
import { applyCoachProposal, saveCoachProposal, useCoachSetup } from '@/db/coach-queries';
import { useProfile } from '@/db/queries';
import { requestCoachPlan } from '@/lib/coach-api';
import { confirm, notify } from '@/lib/dialogs';
import { GOAL_OPTIONS } from '@/lib/labels';

export default function CoachScreen() {
  const { setup, loaded } = useCoachSetup();
  const profile = useProfile();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const router = useRouter();
  if (!loaded) return <View className="flex-1 bg-background" />;
  if (!setup || editing)
    return <PlanQuestionnaire initial={setup?.intake} profile={profile} onSaved={() => setEditing(false)} />;

  const generate = async () => {
    if (busyRef.current) return;
    if (setup.intake.needsProfessional) {
      notify(
        'Orientação individual',
        'Use as metas e o plano orientados por um profissional. Você pode cadastrá-los em Alimentação e Treinos.',
      );
      return;
    }
    if (
      !(await confirm(
        'Preparar sugestão com IA?',
        'Suas respostas, incluindo medidas, preferências e restrições, serão enviadas ao serviço de IA. As metas atuais só serão alteradas quando você aplicar a sugestão.',
        'Gerar sugestão',
      ))
    )
      return;
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await saveCoachProposal(setup.intake, await requestCoachPlan(setup.intake));
    } catch (error) {
      notify('Não foi possível gerar', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const apply = async () => {
    if (busyRef.current || setup.appliedAt) return;
    if (
      !(await confirm(
        'Aplicar esta sugestão?',
        'As metas nutricionais serão atualizadas, as refeições serão adicionadas ao plano e este será seu programa ativo. Seus registros anteriores serão preservados.',
        'Aplicar plano',
      ))
    )
      return;
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await applyCoachProposal();
      router.replace('/nutrition');
    } catch {
      notify(
        'Não foi possível aplicar',
        'Reabra esta tela e confira se a sugestão já foi aplicada antes de tentar novamente.',
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const proposal = setup.proposal;
  return (
    <>
      <Stack.Screen options={{ title: 'Meu plano' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        className="flex-1 bg-background"
        contentContainerClassName="gap-6 pb-10 pt-4"
      >
        <Card>
          <Text className="text-title2 font-bold text-label">
            {proposal ? 'Sua sugestão de plano' : 'Vamos planejar sua rotina'}
          </Text>
          <Text className="mt-2 text-body text-label-secondary">
            {proposal
              ? proposal.summary
              : 'Seu perfil está preenchido. A IA usará suas respostas para sugerir metas, refeições e um programa de treino para você revisar.'}
          </Text>
          {setup.appliedAt ? (
            <Text className="mt-3 text-body text-success">
              Plano aplicado em {setup.appliedAt.toLocaleDateString('pt-BR')}.
            </Text>
          ) : null}
        </Card>
        <Section title="Suas respostas">
          <ListRow
            title="Objetivo"
            value={GOAL_OPTIONS.find((option) => option.value === setup.intake.profile.goal)?.label}
          />
          <ListRow title="Frequência" value={`${setup.intake.profile.daysPerWeek} dias por semana`} />
          <ListRow title="Refeições" value={`${setup.intake.mealsPerDay} por dia`} />
          <ListRow
            title="Revisar respostas"
            onPress={() => {
              if (!busyRef.current) setEditing(true);
            }}
            tone="tint"
          />
        </Section>
        {proposal ? (
          <>
            <Section
              title="Metas diárias estimadas"
              footer="Estimativas para revisão. A IA pode errar; as refeições e metas continuam editáveis após aplicar."
            >
              <ListRow title="Energia" value={`${proposal.targets.calories.toLocaleString('pt-BR')} kcal`} />
              <ListRow title="Proteínas" value={`${proposal.targets.proteinG} g`} />
              <ListRow title="Carboidratos" value={`${proposal.targets.carbsG} g`} />
              <ListRow title="Gorduras" value={`${proposal.targets.fatG} g`} />
            </Section>
            <Section title="Refeições sugeridas">
              {proposal.meals.map((meal, index) => (
                <ListRow key={index} title={meal.name} subtitle={meal.description} value={`${meal.calories} kcal`} />
              ))}
            </Section>
            <Section title={proposal.program.name}>
              {proposal.program.workouts.map((workout, index) => (
                <ListRow
                  key={index}
                  title={workout.name}
                  subtitle={workout.exercises.map((exercise) => exercise.name).join(' · ')}
                />
              ))}
            </Section>
            {proposal.assumptions.length ? (
              <Section title="Premissas e cuidados">
                {proposal.assumptions.map((text, index) => (
                  <ListRow key={index} title={text} />
                ))}
              </Section>
            ) : null}
            {!setup.appliedAt ? (
              <View className="mx-4">
                <Button title={busy ? 'Aguarde…' : 'Aplicar plano'} onPress={apply} />
              </View>
            ) : null}
          </>
        ) : (
          <View className="mx-4">
            <Button title={busy ? 'Preparando sugestão…' : 'Gerar sugestão com IA'} onPress={generate} />
          </View>
        )}
        {proposal && !setup.appliedAt ? (
          <View className="mx-4">
            <Button title="Gerar outra sugestão" variant="plain" onPress={generate} />
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}
