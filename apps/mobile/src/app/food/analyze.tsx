import {
  EMPTY_NUTRITION_TARGETS,
  foodItemSchema,
  localDateKey,
  mealSchema,
  nutritionDateSchema,
  summarizeNutrition,
  totalFoodItems,
  type FoodAnalysis,
  type FoodAnalysisRequest,
  type FoodItem,
} from '@crazy-training/shared';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { z } from 'zod';

import { useCloud } from '@/components/cloud-provider';
import { NUTRIENT_FIELDS, NutritionField } from '@/components/nutrition-fields';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Section } from '@/components/ui/section';
import { useCoachSetup } from '@/db/coach-queries';
import { logMeal, useMealEntries, useNutritionTargets } from '@/db/nutrition-queries';
import { useProfile } from '@/db/queries';
import { apiRequest } from '@/lib/api';
import { confirm, notify } from '@/lib/dialogs';
import { analyzeFood } from '@/lib/food-api';
import { pickFoodImage } from '@/lib/food-image';
import { formatNumber, parseDecimalInput } from '@/lib/format';

export default function AnalyzeFoodScreen() {
  const params = useLocalSearchParams<{ date?: string }>();
  const today = localDateKey(new Date());
  const date =
    params.date && nutritionDateSchema.safeParse(params.date).success && params.date <= today
      ? params.date
      : today;
  const router = useRouter();
  const { user } = useCloud();
  const profile = useProfile();
  const { setup } = useCoachSetup();
  const targets = useNutritionTargets();
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<FoodAnalysisRequest['image']>(null);
  const [analysis, setAnalysis] = useState<FoodAnalysis | null>(null);
  const [availability, setAvailability] = useState<{
    ownerId?: string;
    configured: boolean;
    message?: string;
  }>({ configured: false });
  const available = Boolean(user && availability.ownerId === user.id && availability.configured);
  const [busy, setBusy] = useState(false);
  const working = useRef(false);

  useEffect(() => {
    let active = true;
    if (user)
      void apiRequest<{ configured: boolean }>('/food/status').then(
        (value) => {
          if (active)
            setAvailability({
              ownerId: user.id,
              configured: value.configured,
              message: value.configured
                ? undefined
                : 'A análise com IA ainda não está configurada no servidor. O registro manual continua disponível.',
            });
        },
        (error: unknown) => {
          if (active)
            setAvailability({
              ownerId: user.id,
              configured: false,
              message: error instanceof Error ? error.message : 'Não foi possível conectar à IA.',
            });
        },
      );
    return () => {
      active = false;
    };
  }, [user]);

  const selectImage = async () => {
    try {
      const selected = await pickFoodImage();
      if (selected) {
        setImage(selected);
        setAnalysis(null);
      }
    } catch (error) {
      notify('Não foi possível abrir a foto', error instanceof Error ? error.message : 'Tente novamente.');
    }
  };
  const analyze = async () => {
    if (working.current || !available || !user) return;
    if (!image && description.trim().length < 3) {
      notify('Descreva a refeição', 'Informe alimentos e porções, ou selecione uma foto.');
      return;
    }
    working.current = true;
    setBusy(true);
    const input: FoodAnalysisRequest = {
      description,
      image,
      context: {
        goal: profile.goal,
        preferences: setup?.intake.preferences ?? '',
        allergies: setup?.intake.allergies ?? '',
        targets,
      },
    };
    try {
      if (
        !(await confirm(
          'Analisar esta refeição?',
          'A descrição, a foto selecionada, suas metas e preferências/restrições alimentares serão enviadas ao serviço de IA. Você revisa o resultado antes de registrar.',
          'Enviar para análise',
        ))
      )
        return;
      setAnalysis(null);
      setAnalysis(await analyzeFood(input));
    } catch (error) {
      notify('Não foi possível analisar', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      working.current = false;
      setBusy(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Analisar refeição' }} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        className="flex-1 bg-background"
        contentContainerClassName="gap-6 pb-10 pt-4"
      >
        <Card>
          <Text className="text-title2 font-bold text-label">O que você vai comer?</Text>
          <Text className="mt-2 text-body text-label-secondary">
            Descreva uma refeição ou selecione uma foto do prato ou rótulo. A IA estima os valores e pergunta
            quando faltam informações.
          </Text>
        </Card>
        <Section
          title="Sua refeição"
          footer="Inclua porções, preparo, molhos e óleo, se souber. Fotos: JPEG, PNG ou WebP, até 2 MB. A foto não mede o peso dos alimentos."
        >
          <NutritionField
            label="Descrição da refeição"
            value={description}
            disabled={busy}
            multiline
            onChange={(value) => {
              setDescription(value);
              setAnalysis(null);
            }}
            placeholder="Ex.: 3 colheres de arroz, uma concha de feijão e um filé de frango grelhado."
          />
        </Section>
        <View className="mx-4 gap-3">
          {image ? (
            <Image
              source={{ uri: `data:${image.mimeType};base64,${image.base64}` }}
              accessibilityLabel="Foto selecionada da refeição"
              style={{ width: '100%', height: 220, borderRadius: 20 }}
              contentFit="contain"
            />
          ) : null}
          <Button
            title={image ? 'Trocar foto' : 'Selecionar foto'}
            variant="gray"
            disabled={busy}
            onPress={() => void selectImage()}
          />
          {image ? (
            <Button
              title="Remover foto"
              variant="plain"
              disabled={busy}
              onPress={() => {
                setImage(null);
                setAnalysis(null);
              }}
            />
          ) : null}
          {!user ? (
            <Button title="Entrar para usar a IA" variant="gray" onPress={() => router.push('/account')} />
          ) : null}
          {user && availability.ownerId === user.id && availability.message ? (
            <Text className="text-body text-label-secondary">{availability.message}</Text>
          ) : null}
          <Button
            title={busy ? 'Analisando…' : 'Analisar com IA'}
            disabled={busy || !available}
            onPress={() => void analyze()}
          />
          <Button
            title="Registrar manualmente"
            variant="plain"
            onPress={() =>
              router.replace({
                pathname: '/food/meal',
                params: { date, mode: 'log' },
              })
            }
          />
        </View>
        {analysis ? <FoodReview key={analysis.id} analysis={analysis} date={date} /> : null}
      </ScrollView>
    </>
  );
}

type DraftItem = {
  food: string;
  portion: string;
  calories: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
};
const draftItem = (item: FoodItem): DraftItem => ({
  food: item.food,
  portion: item.portion,
  calories: item.calories === null ? '' : String(item.calories),
  proteinG: item.proteinG === null ? '' : String(item.proteinG),
  carbsG: item.carbsG === null ? '' : String(item.carbsG),
  fatG: item.fatG === null ? '' : String(item.fatG),
});
function FoodReview({ analysis, date }: { analysis: FoodAnalysis; date: string }) {
  const router = useRouter();
  const entries = useMealEntries(date);
  const targets = useNutritionTargets();
  const [items, setItems] = useState(() => analysis.items.map(draftItem));
  const [name, setName] = useState(analysis.name);
  const [time, setTime] = useState('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const parsed = z
    .array(foodItemSchema)
    .min(1)
    .max(20)
    .safeParse(
      items.map((item) => ({
        food: item.food,
        portion: item.portion,
        ...Object.fromEntries(
          NUTRIENT_FIELDS.map(({ key }) => [
            key,
            parseDecimalInput(item[key]) ?? (item[key].trim() ? NaN : null),
          ]),
        ),
      })),
    );
  const totals = parsed.success ? totalFoodItems(parsed.data) : EMPTY_NUTRITION_TARGETS;
  const daily = summarizeNutrition(entries.map((row) => row.data));
  const projected =
    totals.calories !== null && daily.missing.calories === 0 ? totals.calories + daily.total.calories : null;

  const save = async () => {
    if (savingRef.current) return;
    if (!parsed.success) {
      notify(
        'Confira os alimentos',
        'Informe alimento, porção e valores válidos. Campos nutricionais em branco permanecem desconhecidos.',
      );
      return;
    }
    const meal = mealSchema.safeParse({
      name,
      time: time.trim() || null,
      description: parsed.data.map((item) => `${item.food}: ${item.portion}`).join('\n'),
      ...totals,
      evidence: {
        source: 'ai-estimate',
        inputType: analysis.inputType,
        note: 'Estimativa por IA revisada pelo usuário. ' + analysis.assumptions.join(' ').slice(0, 900),
      },
    });
    if (!meal.success) {
      notify(
        'Confira a refeição',
        'Informe nome, horário válido (ou em branco) e uma descrição de até 2.000 caracteres.',
      );
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      if (
        !(await confirm(
          'Registrar refeição revisada?',
          `Ela será adicionada ao diário de ${date.split('-').reverse().join('/')}. O resumo será recalculado e a confirmação de alimentação completa será reaberta.`,
          'Registrar no diário',
        ))
      )
        return;
      await logMeal(date, meal.data, analysis.id);
      router.back();
      notify('Refeição registrada', 'Os valores continuam identificados como estimativa por IA.', {
        tone: 'success',
      });
    } catch {
      notify('Não foi possível registrar', 'Tente novamente.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };
  return (
    <>
      <Card>
        <Text className="text-title2 font-bold text-label">
          {analysis.status === 'estimated'
            ? 'Revise a estimativa'
            : analysis.status === 'clarification'
              ? 'Precisamos de mais informações'
              : 'Não foi possível identificar a refeição'}
        </Text>
        <Text className="mt-2 text-body text-label-secondary">{analysis.summary}</Text>
        {analysis.assumptions.map((text, i) => (
          <Text key={`a${i}`} className="mt-2 text-footnote text-label-secondary">
            • {text}
          </Text>
        ))}
        {analysis.questions.map((text, i) => (
          <Text key={`q${i}`} className="mt-2 text-body text-label">
            {text}
          </Text>
        ))}
        {analysis.status !== 'estimated' ? (
          <Text className="mt-3 text-body text-label-secondary">
            Complete a descrição acima e envie uma nova análise. Nenhum registro foi feito.
          </Text>
        ) : null}
      </Card>
      {analysis.status === 'estimated' ? (
        <>
          <Section title="Refeição revisada">
            <NutritionField
              label="Nome"
              accessibilityLabel="Nome da refeição"
              value={name}
              onChange={setName}
            />
            <NutritionField
              label="Horário"
              accessibilityLabel="Horário da refeição"
              value={time}
              onChange={setTime}
              placeholder="HH:MM (opcional)"
            />
          </Section>
          {items.map((item, index) => (
            <Section
              key={index}
              title={`Alimento ${index + 1}`}
              footer="Alterar o alimento ou a porção limpa os nutrientes anteriores. Informe os valores corrigidos ou faça uma nova análise; campos em branco permanecem desconhecidos."
            >
              <NutritionField
                label={`Alimento ${index + 1}`}
                value={item.food}
                onChange={(value) =>
                  setItems((current) =>
                    current.map((row, i) =>
                      i === index
                        ? {
                            food: value,
                            portion: row.portion,
                            calories: '',
                            proteinG: '',
                            carbsG: '',
                            fatG: '',
                          }
                        : row,
                    ),
                  )
                }
              />
              <NutritionField
                label={`Porção ${index + 1}`}
                value={item.portion}
                onChange={(value) =>
                  setItems((current) =>
                    current.map((row, i) =>
                      i === index
                        ? {
                            food: row.food,
                            portion: value,
                            calories: '',
                            proteinG: '',
                            carbsG: '',
                            fatG: '',
                          }
                        : row,
                    ),
                  )
                }
              />
              {NUTRIENT_FIELDS.map(({ key, label, unit }) => (
                <NutritionField
                  key={key}
                  label={label}
                  accessibilityLabel={`${label} do alimento ${index + 1}`}
                  unit={unit}
                  numeric
                  value={item[key]}
                  onChange={(value) =>
                    setItems((current) =>
                      current.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
                    )
                  }
                />
              ))}
              <Button
                title={`Remover alimento ${index + 1}`}
                variant="plain"
                onPress={() => setItems((current) => current.filter((_, i) => i !== index))}
              />
            </Section>
          ))}
          <View className="mx-4">
            <Button
              title="Adicionar alimento"
              variant="gray"
              disabled={items.length >= 20}
              onPress={() =>
                setItems((current) => [
                  ...current,
                  draftItem({
                    food: '',
                    portion: '',
                    calories: null,
                    proteinG: null,
                    carbsG: null,
                    fatG: null,
                  }),
                ])
              }
            />
          </View>
          <Card>
            <Text className="text-headline font-semibold text-label">Impacto no seu diário</Text>
            <Text className="mt-2 text-body text-label">
              Esta refeição:{' '}
              {totals.calories === null
                ? 'calorias incompletas'
                : `aproximadamente ${formatNumber(totals.calories)} kcal`}
              .
            </Text>
            <Text className="mt-2 text-body text-label-secondary">
              {projected === null
                ? 'Faltam valores para calcular o total após esta refeição.'
                : `Se registrar, seu consumo acumulado será de aproximadamente ${formatNumber(projected)} kcal.`}
            </Text>
            {projected !== null && targets.calories !== null ? (
              <Text className="mt-2 text-body text-label-secondary">
                {projected > targets.calories
                  ? `${formatNumber(projected - targets.calories)} kcal acima da meta alimentar.`
                  : `${formatNumber(targets.calories - projected)} kcal até a meta alimentar.`}{' '}
                Isso não mede ganho ou perda de gordura.
              </Text>
            ) : null}
            <Text className="mt-2 text-footnote text-label-secondary">
              Escolha a porção que vai consumir e registre quando a refeição for realizada. Nada foi salvo
              automaticamente.
            </Text>
          </Card>
          <View className="mx-4">
            <Button
              title={saving ? 'Registrando…' : 'Confirmar e registrar refeição'}
              disabled={saving}
              onPress={() => void save()}
            />
          </View>
        </>
      ) : null}
    </>
  );
}
