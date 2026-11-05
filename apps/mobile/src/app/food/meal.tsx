import { EMPTY_NUTRITION_TARGETS, localDateKey, mealSchema, type Meal } from '@crazy-training/shared';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { NUTRIENT_FIELDS, NutritionField } from '@/components/nutrition-fields';
import { Button } from '@/components/ui/button';
import { Section } from '@/components/ui/section';
import { logMeal, saveMealTemplate, useMealTemplate } from '@/db/nutrition-queries';
import { notify } from '@/lib/dialogs';
import { parseDecimalInput } from '@/lib/format';

export default function MealScreen() {
  const params = useLocalSearchParams<{ id?: string; mode?: string; date?: string }>();
  const { template, loaded } = useMealTemplate(params.id);
  if (params.id && !loaded) return <View className="flex-1 bg-background" />;
  if (params.id && !template)
    return (
      <View className="flex-1 bg-background">
        <Text className="m-5 text-body text-label-secondary">Esta refeição não está mais no plano.</Text>
      </View>
    );
  return (
    <MealEditor
      key={params.id ?? 'new'}
      id={params.id}
      mode={params.mode === 'template' ? 'template' : 'log'}
      date={params.date}
      initial={template?.data}
    />
  );
}

function MealEditor({
  id,
  mode,
  date,
  initial,
}: {
  id?: string;
  mode: 'template' | 'log';
  date?: string;
  initial?: Meal;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? '');
  const [time, setTime] = useState(initial?.time ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [numbers, setNumbers] = useState(() =>
    Object.fromEntries(
      NUTRIENT_FIELDS.map(({ key }) => [key, initial?.[key] == null ? '' : String(initial[key]).replace('.', ',')]),
    ),
  );
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const save = async () => {
    if (savingRef.current) return;
    const nutrients = { ...EMPTY_NUTRITION_TARGETS };
    for (const { key, label } of NUTRIENT_FIELDS) {
      const value = parseDecimalInput(numbers[key] ?? '');
      if (value === undefined) {
        notify(`${label}: valor inválido`, 'Informe um número positivo ou deixe em branco.');
        return;
      }
      nutrients[key] = value;
    }
    const parsed = mealSchema.safeParse({ name, description, time: time.trim() || null, ...nutrients });
    if (!parsed.success) {
      notify(
        'Confira a refeição',
        !name.trim()
          ? 'Informe o nome da refeição.'
          : !description.trim()
            ? 'Descreva os alimentos e as porções.'
            : 'Use horário HH:MM e valores nutricionais entre 0 e 10.000. Nome: até 80 caracteres; descrição: até 2.000.',
      );
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      if (mode === 'template') await saveMealTemplate(parsed.data, id);
      else await logMeal(date ?? localDateKey(new Date()), parsed.data);
      router.back();
    } catch {
      notify('Não foi possível salvar', 'Tente novamente.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: id ? 'Editar refeição' : mode === 'template' ? 'Nova refeição do plano' : 'Registrar refeição',
        }}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentInsetAdjustmentBehavior="automatic"
        className="flex-1 bg-background"
        contentContainerClassName="gap-6 pb-10 pt-4"
      >
        <Section title="Refeição">
          <NutritionField label="Nome" value={name} onChange={setName} placeholder="Ex.: almoço" />
          <NutritionField label="Horário" value={time} onChange={setTime} placeholder="HH:MM" />
          <NutritionField
            label="Alimentos e porções"
            value={description}
            onChange={setDescription}
            placeholder="Ex.: arroz, feijão, frango e salada. Descreva as quantidades."
            multiline
          />
        </Section>
        <Section
          title="Valores da refeição inteira"
          footer="Opcional. Informe os totais das porções descritas. O app não calcula nutrientes a partir do nome dos alimentos."
        >
          {NUTRIENT_FIELDS.map(({ key, label, unit }) => (
            <NutritionField
              key={key}
              label={label}
              unit={unit}
              numeric
              value={numbers[key] ?? ''}
              onChange={(value) => setNumbers((current) => ({ ...current, [key]: value }))}
            />
          ))}
        </Section>
        <View className="mx-4">
          <Button
            title={saving ? 'Salvando…' : mode === 'template' ? 'Salvar no plano' : 'Salvar no diário'}
            onPress={save}
          />
        </View>
      </ScrollView>
    </>
  );
}
