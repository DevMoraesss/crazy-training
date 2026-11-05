import { nutritionTargetsSchema } from '@crazy-training/shared';
import { Stack, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { NUTRIENT_FIELDS, NutritionField } from '@/components/nutrition-fields';
import { Button } from '@/components/ui/button';
import { Section } from '@/components/ui/section';
import { saveNutritionTargets, useNutritionSettings } from '@/db/nutrition-queries';
import { notify } from '@/lib/dialogs';
import { parseDecimalInput } from '@/lib/format';

export default function TargetsScreen() {
  const { targets, loaded } = useNutritionSettings();
  if (!loaded) return <View className="flex-1 bg-background" />;
  return <TargetsForm initial={targets} />;
}

function TargetsForm({ initial }: { initial: ReturnType<typeof useNutritionSettings>['targets'] }) {
  const router = useRouter();
  const [values, setValues] = useState(() =>
    Object.fromEntries(
      NUTRIENT_FIELDS.map(({ key }) => [key, initial[key] === null ? '' : String(initial[key]).replace('.', ',')]),
    ),
  );
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const save = async () => {
    if (savingRef.current) return;
    const parsed = nutritionTargetsSchema.safeParse(
      Object.fromEntries(NUTRIENT_FIELDS.map(({ key }) => [key, parseDecimalInput(values[key] ?? '')])),
    );
    if (!parsed.success) {
      notify('Confira os valores', 'Use números entre 0 e 10.000 ou deixe o campo em branco para remover a meta.');
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      await saveNutritionTargets(parsed.data);
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
      <Stack.Screen options={{ title: 'Metas alimentares' }} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        className="flex-1 bg-background"
        contentContainerClassName="gap-6 pb-10 pt-4"
        contentInsetAdjustmentBehavior="automatic"
      >
        <Section
          title="Suas metas diárias"
          footer="Preencha os valores do plano que você segue. Você pode usar o diário sem definir metas; o app não prescreve calorias automaticamente."
        >
          {NUTRIENT_FIELDS.map(({ key, label, unit }) => (
            <NutritionField
              key={key}
              label={label}
              unit={unit}
              numeric
              value={values[key] ?? ''}
              onChange={(value) => setValues((current) => ({ ...current, [key]: value }))}
            />
          ))}
        </Section>
        <View className="mx-4">
          <Button title={saving ? 'Salvando…' : 'Salvar metas'} onPress={save} />
        </View>
      </ScrollView>
    </>
  );
}
