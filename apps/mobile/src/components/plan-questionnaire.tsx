import { coachIntakeSchema, type CoachIntake, type Profile } from '@crazy-training/shared';
import { Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { saveCoachIntake } from '@/db/coach-queries';
import { notify } from '@/lib/dialogs';
import { parseDecimalInput } from '@/lib/format';
import { EQUIPMENT_OPTIONS, GOAL_OPTIONS, LEVEL_OPTIONS } from '@/lib/labels';

import { NutritionField } from './nutrition-fields';
import { Button } from './ui/button';
import { ListRow } from './ui/list-row';
import { Section } from './ui/section';
import { StepperRow } from './ui/stepper-row';

const STEPS = [
  {
    title: 'O que você quer conquistar?',
    detail: 'Vamos montar o plano em torno do seu objetivo.',
    group: 'Seu objetivo',
  },
  {
    title: 'Quais são suas medidas?',
    detail: 'Esses dados ajudam nas estimativas. Você poderá atualizá-los depois.',
    group: 'Sobre você',
  },
  {
    title: 'Como calcular suas estimativas?',
    detail: 'O sexo é usado nas estimativas de energia. Você também pode escolher não informar.',
    group: 'Sobre você',
  },
  { title: 'Como está sua experiência?', detail: 'Seu treino precisa acompanhar o seu momento.', group: 'Seu treino' },
  {
    title: 'Onde você vai treinar?',
    detail: 'Vamos considerar os equipamentos disponíveis para você.',
    group: 'Seu treino',
  },
  {
    title: 'Quantos dias cabem na sua semana?',
    detail: 'Escolha uma frequência que consiga manter. Corrida e outras atividades também contam como dias ativos.',
    group: 'Sua rotina',
  },
  {
    title: 'Como é seu dia fora do treino?',
    detail: 'Considere seu trabalho, deslocamentos e outras atividades do dia a dia.',
    group: 'Sua rotina',
  },
  {
    title: 'Há algo que o treino deve respeitar?',
    detail: 'Conte sobre lesões, desconfortos ou limitações. Deixe em branco se não houver.',
    group: 'Seu treino',
  },
  {
    title: 'Como prefere dividir as refeições?',
    detail: 'Escolha a quantidade que combina com sua rotina.',
    group: 'Sua alimentação',
  },
  {
    title: 'O que funciona para você comer?',
    detail: 'Conte o que gosta, seus horários, orçamento e tempo para cozinhar. Este campo é opcional.',
    group: 'Sua alimentação',
  },
  {
    title: 'Você tem alguma restrição alimentar?',
    detail: 'Informe alergias e alimentos que precisa evitar. Se não houver, escreva nenhuma.',
    group: 'Sua alimentação',
  },
  {
    title: 'Você precisa de acompanhamento individual?',
    detail:
      'Se está grávida, amamentando ou tem uma condição que exige dieta ou treino individualizado, escolha a primeira opção.',
    group: 'Seu cuidado',
  },
  {
    title: 'Está tudo certo para começar?',
    detail:
      'Confira suas respostas. Ao continuar, seu perfil será salvo. Você ainda poderá revisar a sugestão da IA antes de aplicá-la.',
    group: 'Sua revisão',
  },
] as const;
const LAST = STEPS.length - 1;
const SEX_OPTIONS = [
  { value: 'male', label: 'Masculino' },
  { value: 'female', label: 'Feminino' },
  { value: 'unspecified', label: 'Prefiro não informar' },
] as const;
const ROUTINES = [
  { value: 'sedentary', label: 'Passo a maior parte do dia sentado' },
  { value: 'light', label: 'Caminho um pouco ao longo do dia' },
  { value: 'active', label: 'Me movimento bastante no dia a dia' },
  { value: 'very-active', label: 'Tenho uma rotina fisicamente intensa' },
] as const;

export function PlanQuestionnaire({
  initial,
  profile,
  onSaved,
}: {
  initial?: CoachIntake;
  profile: Profile;
  onSaved: () => void;
}) {
  const p = initial?.profile ?? profile;
  const [step, setStep] = useState(0);
  const [weight, setWeight] = useState(String(p.weightKg ?? ''));
  const [height, setHeight] = useState(String(p.heightCm ?? ''));
  const [age, setAge] = useState(String(initial?.age ?? (p.birthYear ? new Date().getFullYear() - p.birthYear : '')));
  const [goal, setGoal] = useState(p.goal);
  const [level, setLevel] = useState(p.level);
  const [equipment, setEquipment] = useState(p.equipment);
  const [days, setDays] = useState(p.daysPerWeek ?? 3);
  const [sex, setSex] = useState<CoachIntake['sex']>(initial?.sex ?? 'unspecified');
  const [routine, setRoutine] = useState<CoachIntake['routine']>(initial?.routine ?? 'sedentary');
  const [meals, setMeals] = useState(initial?.mealsPerDay ?? 4);
  const [preferences, setPreferences] = useState(initial?.preferences ?? '');
  const [allergies, setAllergies] = useState(initial?.allergies ?? '');
  const [limitations, setLimitations] = useState(initial?.limitations ?? '');
  const [needsProfessional, setNeedsProfessional] = useState<boolean | null>(initial?.needsProfessional ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [returnToReview, setReturnToReview] = useState(false);
  const savingRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const [slide] = useState(() => new Animated.Value(0));
  const reducedMotion = useRef(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) reducedMotion.current = value;
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
      reducedMotion.current = value;
    });
    return () => {
      active = false;
      subscription.remove();
      slide.stopAnimation();
    };
  }, [slide]);

  const move = (value: number) => {
    if (savingRef.current) return;
    Keyboard.dismiss();
    slide.stopAnimation();
    slide.setValue(reducedMotion.current ? 0 : value > step ? 28 : -28);
    setError('');
    setStep(value);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    if (!reducedMotion.current)
      Animated.timing(slide, { toValue: 0, duration: 180, useNativeDriver: Platform.OS !== 'web' }).start();
  };
  const input = () => ({
    profile: {
      ...p,
      weightKg: parseDecimalInput(weight),
      heightCm: parseDecimalInput(height),
      goal,
      level,
      equipment,
      daysPerWeek: days,
      birthYear: p.birthYear ?? new Date().getFullYear() - Number(age),
    },
    age: Number(age),
    sex,
    routine,
    mealsPerDay: meals,
    preferences,
    allergies,
    limitations,
    needsProfessional,
  });
  const next = async () => {
    if (savingRef.current) return;
    if (step === 0 && !goal) {
      setError('Escolha seu objetivo para continuar.');
      return;
    }
    if (
      step === 1 &&
      (!Number.isInteger(Number(age)) ||
        Number(age) < 18 ||
        Number(age) > 100 ||
        (parseDecimalInput(weight) ?? 0) < 20 ||
        (parseDecimalInput(weight) ?? 401) > 400 ||
        (parseDecimalInput(height) ?? 0) < 100 ||
        (parseDecimalInput(height) ?? 251) > 250)
    ) {
      setError('Informe peso entre 20 e 400 kg, altura entre 100 e 250 cm e idade entre 18 e 100 anos.');
      return;
    }
    if (step === 3 && !level) {
      setError('Escolha seu nível de experiência.');
      return;
    }
    if (step === 4 && !equipment) {
      setError('Escolha onde você vai treinar.');
      return;
    }
    if (step === 7 && limitations.trim().length > 1000) {
      setError('Use até 1.000 caracteres para descrever suas limitações.');
      return;
    }
    if (step === 9 && preferences.trim().length > 2000) {
      setError('Use até 2.000 caracteres para descrever suas preferências.');
      return;
    }
    if (step === 10 && (!allergies.trim() || allergies.trim().length > 1000)) {
      setError('Informe as restrições ou escreva nenhuma. Use até 1.000 caracteres.');
      return;
    }
    if (step === 11 && needsProfessional === null) {
      setError('Escolha uma opção de acompanhamento.');
      return;
    }
    if (step !== LAST) {
      move(returnToReview ? LAST : step + 1);
      setReturnToReview(false);
      return;
    }
    const parsed = coachIntakeSchema.safeParse(input());
    if (!parsed.success) {
      setError('Confira suas respostas antes de salvar o perfil.');
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      await saveCoachIntake(parsed.data);
      onSaved();
    } catch {
      notify('Não foi possível salvar', 'Suas respostas continuam nesta tela. Tente novamente.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };
  const edit = (value: number) => {
    setReturnToReview(true);
    move(value);
  };
  const current = STEPS[step];
  return (
    <>
      <Stack.Screen options={{ title: 'Configurar meu plano' }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-background"
        style={{ minHeight: 0 }}
      >
        <View className="gap-3 px-5 pb-4 pt-4">
          <View className="flex-row justify-between">
            <Text className="text-footnote font-semibold text-tint">{current.group}</Text>
            <Text className="text-footnote text-label-secondary" accessibilityLiveRegion="polite">
              Etapa {step + 1} de {STEPS.length}
            </Text>
          </View>
          <View
            accessibilityRole="progressbar"
            accessibilityLabel="Progresso da configuração"
            accessibilityValue={{ min: 0, max: STEPS.length, now: step + 1 }}
            aria-valuemin={0}
            aria-valuemax={STEPS.length}
            aria-valuenow={step + 1}
            className="h-1.5 overflow-hidden rounded-full bg-fill-secondary"
          >
            <View className="h-full rounded-full bg-tint" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </View>
        </View>
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          className="flex-1"
          contentContainerClassName="flex-grow justify-center gap-6 pb-6 pt-3"
        >
          <Animated.View style={{ transform: [{ translateX: slide }] }} className="gap-6">
            <View className="gap-3 px-5">
              <Text accessibilityRole="header" className="text-large-title font-bold text-label">
                {current.title}
              </Text>
              <Text className="text-body text-label-secondary">{current.detail}</Text>
            </View>
            {step === 0 ? (
              <Section>
                {GOAL_OPTIONS.map((option) => (
                  <ListRow
                    key={option.value}
                    title={option.label}
                    subtitle={option.description}
                    checked={goal === option.value}
                    onPress={() => {
                      setGoal(option.value);
                      setError('');
                    }}
                  />
                ))}
              </Section>
            ) : null}
            {step === 1 ? (
              <Section footer="O planejamento automático é voltado a adultos.">
                <NutritionField
                  label="Peso"
                  value={weight}
                  onChange={(value) => {
                    setWeight(value);
                    setError('');
                  }}
                  numeric
                  unit="kg"
                />
                <NutritionField
                  label="Altura"
                  value={height}
                  onChange={(value) => {
                    setHeight(value);
                    setError('');
                  }}
                  numeric
                  unit="cm"
                />
                <NutritionField
                  label="Idade"
                  value={age}
                  onChange={(value) => {
                    setAge(value);
                    setError('');
                  }}
                  numeric
                  unit="anos"
                />
              </Section>
            ) : null}
            {step === 2 ? (
              <Section>
                {SEX_OPTIONS.map((option) => (
                  <ListRow
                    key={option.value}
                    title={option.label}
                    checked={sex === option.value}
                    onPress={() => {
                      setSex(option.value);
                      setError('');
                    }}
                  />
                ))}
              </Section>
            ) : null}
            {step === 3 ? (
              <Section>
                {LEVEL_OPTIONS.map((option) => (
                  <ListRow
                    key={option.value}
                    title={option.label}
                    checked={level === option.value}
                    onPress={() => {
                      setLevel(option.value);
                      setError('');
                    }}
                  />
                ))}
              </Section>
            ) : null}
            {step === 4 ? (
              <Section>
                {EQUIPMENT_OPTIONS.map((option) => (
                  <ListRow
                    key={option.value}
                    title={option.label}
                    checked={equipment === option.value}
                    onPress={() => {
                      setEquipment(option.value);
                      setError('');
                    }}
                  />
                ))}
              </Section>
            ) : null}
            {step === 5 ? (
              <Section>
                <StepperRow
                  label="Dias por semana"
                  display={String(days)}
                  canDecrement={days > 1}
                  canIncrement={days < 7}
                  onDecrement={() => setDays((value) => Math.max(1, value - 1))}
                  onIncrement={() => setDays((value) => Math.min(7, value + 1))}
                />
              </Section>
            ) : null}
            {step === 6 ? (
              <Section>
                {ROUTINES.map((option) => (
                  <ListRow
                    key={option.value}
                    title={option.label}
                    checked={routine === option.value}
                    onPress={() => {
                      setRoutine(option.value);
                      setError('');
                    }}
                  />
                ))}
              </Section>
            ) : null}
            {step === 7 ? (
              <Section>
                <NutritionField
                  label="Limitações e lesões"
                  value={limitations}
                  onChange={(value) => {
                    setLimitations(value);
                    setError('');
                  }}
                  multiline
                  placeholder="Há movimentos que você precisa evitar?"
                />
              </Section>
            ) : null}
            {step === 8 ? (
              <Section>
                <StepperRow
                  label="Refeições por dia"
                  display={String(meals)}
                  canDecrement={meals > 2}
                  canIncrement={meals < 6}
                  onDecrement={() => setMeals((value) => Math.max(2, value - 1))}
                  onIncrement={() => setMeals((value) => Math.min(6, value + 1))}
                />
              </Section>
            ) : null}
            {step === 9 ? (
              <Section>
                <NutritionField
                  label="Preferências e rotina"
                  value={preferences}
                  onChange={(value) => {
                    setPreferences(value);
                    setError('');
                  }}
                  multiline
                  placeholder="Alimentos que gosta, horários e tempo para cozinhar."
                />
              </Section>
            ) : null}
            {step === 10 ? (
              <Section>
                <NutritionField
                  label="Alergias e restrições"
                  value={allergies}
                  onChange={(value) => {
                    setAllergies(value);
                    setError('');
                  }}
                  multiline
                  placeholder="Informe as restrições ou escreva nenhuma."
                />
              </Section>
            ) : null}
            {step === 11 ? (
              <Section>
                <ListRow
                  title="Preciso de orientação profissional individualizada"
                  checked={needsProfessional === true}
                  onPress={() => {
                    setNeedsProfessional(true);
                    setError('');
                  }}
                />
                <ListRow
                  title="Não tenho essa necessidade"
                  checked={needsProfessional === false}
                  onPress={() => {
                    setNeedsProfessional(false);
                    setError('');
                  }}
                />
              </Section>
            ) : null}
            {step === LAST ? (
              <Section title="Toque para ajustar uma resposta">
                <ListRow
                  title="Objetivo"
                  value={GOAL_OPTIONS.find((option) => option.value === goal)?.label}
                  onPress={() => edit(0)}
                />
                <ListRow
                  title="Medidas"
                  subtitle={`${weight} kg · ${height} cm · ${age} anos`}
                  onPress={() => edit(1)}
                />
                <ListRow
                  title="Sexo para estimativas"
                  value={SEX_OPTIONS.find((option) => option.value === sex)?.label}
                  onPress={() => edit(2)}
                />
                <ListRow
                  title="Experiência"
                  value={LEVEL_OPTIONS.find((option) => option.value === level)?.label}
                  onPress={() => edit(3)}
                />
                <ListRow
                  title="Onde você treina"
                  value={EQUIPMENT_OPTIONS.find((option) => option.value === equipment)?.label}
                  onPress={() => edit(4)}
                />
                <ListRow title="Frequência" value={`${days} dias por semana`} onPress={() => edit(5)} />
                <ListRow
                  title="Rotina"
                  subtitle={ROUTINES.find((option) => option.value === routine)?.label}
                  onPress={() => edit(6)}
                />
                <ListRow title="Limitações" subtitle={limitations || 'Não informadas'} onPress={() => edit(7)} />
                <ListRow title="Refeições" value={`${meals} por dia`} onPress={() => edit(8)} />
                <ListRow title="Preferências" subtitle={preferences || 'Não informadas'} onPress={() => edit(9)} />
                <ListRow title="Restrições" subtitle={allergies} onPress={() => edit(10)} />
                <ListRow
                  title="Acompanhamento individual"
                  value={needsProfessional ? 'Sim' : 'Não'}
                  onPress={() => edit(11)}
                />
              </Section>
            ) : null}
          </Animated.View>
        </ScrollView>
        <View
          className="gap-3 border-t border-separator bg-background px-4 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          {error ? (
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              className="px-1 text-footnote text-danger"
            >
              {error}
            </Text>
          ) : null}
          <View className="flex-row items-center gap-3">
            {step > 0 ? (
              <View className="flex-1">
                <Button
                  title="Voltar"
                  variant="gray"
                  onPress={() => {
                    move(returnToReview ? LAST : step - 1);
                    setReturnToReview(false);
                  }}
                />
              </View>
            ) : null}
            <View className="flex-[2]">
              <Button
                title={
                  saving ? 'Salvando…' : step === LAST ? 'Salvar perfil' : returnToReview ? 'Revisar' : 'Continuar'
                }
                onPress={next}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}
