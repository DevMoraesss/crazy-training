import {
  localDateKey,
  nutritionDateSchema,
  nutritionDaySchema,
  type NutritionDay,
} from '@crazy-training/shared';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { NutritionField } from '@/components/nutrition-fields';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Section } from '@/components/ui/section';
import { saveNutritionDay, useNutritionDay } from '@/db/nutrition-queries';
import { confirm, notify } from '@/lib/dialogs';
import { parseDecimalInput } from '@/lib/format';

export default function FoodDayScreen() {
  const params = useLocalSearchParams<{ date?: string }>();
  const today = localDateKey(new Date());
  const date =
    params.date && nutritionDateSchema.safeParse(params.date).success && params.date <= today
      ? params.date
      : today;
  const { day, loaded } = useNutritionDay(date);
  if (!loaded) return <View className="flex-1 bg-background" />;
  return <DayForm key={`${date}:${JSON.stringify(day)}`} date={date} initial={day} />;
}
function DayForm({ date, initial }: { date: string; initial: NutritionDay }) {
  const router = useRouter();
  const [expenditure, setExpenditure] = useState(
    initial.expenditureCalories === null ? '' : String(initial.expenditureCalories),
  );
  const [weight, setWeight] = useState(initial.weightKg === null ? '' : String(initial.weightKg));
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const save = async (complete: boolean) => {
    if (working.current) return;
    const parsed = nutritionDaySchema.safeParse({
      complete,
      expenditureCalories: parseDecimalInput(expenditure),
      weightKg: parseDecimalInput(weight),
    });
    if (!parsed.success) {
      notify(
        'Confira os valores',
        'Deixe em branco o que não souber. O gasto aceita de 0 a 20.000 kcal e o peso de 20 a 400 kg.',
      );
      return;
    }
    working.current = true;
    setBusy(true);
    try {
      if (
        complete &&
        !(await confirm(
          'Confirmar alimentação completa?',
          'Confirme apenas se registrou tudo que consumiu nesta data, incluindo bebidas, lanches e acompanhamentos. A confirmação não verifica se os valores são exatos.',
          'Confirmar registros completos',
        ))
      )
        return;
      await saveNutritionDay(date, parsed.data);
      router.back();
      notify('Resumo atualizado', undefined, { tone: 'success' });
    } catch {
      notify('Não foi possível salvar', 'Tente novamente.');
    } finally {
      working.current = false;
      setBusy(false);
    }
  };
  return (
    <>
      <Stack.Screen options={{ title: 'Fechamento do dia' }} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        className="flex-1 bg-background"
        contentContainerClassName="gap-6 pb-10 pt-4"
      >
        <Card>
          <Text className="text-title2 font-bold text-label">
            Resumo de {date.split('-').reverse().join('/')}
          </Text>
          <Text className="mt-2 text-body text-label-secondary">
            O saldo energético depende de registros completos e de uma estimativa do gasto total. Os campos
            são opcionais; o aplicativo não inventa os valores ausentes.
          </Text>
        </Card>
        <Section
          title="Informações do dia"
          footer="O gasto total inclui o metabolismo e todas as atividades do dia. Não informe apenas as calorias do treino. Os exercícios registrados não serão somados novamente a esse número."
        >
          <NutritionField
            label="Gasto total estimado"
            value={expenditure}
            onChange={setExpenditure}
            numeric
            unit="kcal"
          />
          <NutritionField label="Peso na balança" value={weight} onChange={setWeight} numeric unit="kg" />
        </Section>
        <View className="mx-4 gap-3">
          <Button
            title={busy ? 'Salvando…' : 'Confirmar alimentação completa'}
            disabled={busy}
            onPress={() => void save(true)}
          />
          <Button
            title="Salvar e manter dia em aberto"
            variant="gray"
            disabled={busy}
            onPress={() => void save(false)}
          />
        </View>
        <Card>
          <Text className="text-body text-label-secondary">
            Uma pesagem informa seu peso naquele momento. Este resumo não calcula gordura perdida ou ganha a
            partir das calorias do dia.
          </Text>
        </Card>
      </ScrollView>
    </>
  );
}
