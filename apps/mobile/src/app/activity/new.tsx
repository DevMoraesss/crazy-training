import { ACTIVITY_LABELS, ACTIVITY_TYPES, activitySchema, localDateKey } from '@crazy-training/shared';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { NutritionField } from '@/components/nutrition-fields';
import { Button } from '@/components/ui/button';
import { ListRow } from '@/components/ui/list-row';
import { Section } from '@/components/ui/section';
import { logActivity } from '@/db/activity-queries';
import { notify } from '@/lib/dialogs';
import { parseDecimalInput } from '@/lib/format';

export default function NewActivityScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();
  const [date, setDate] = useState(params.date ?? localDateKey(new Date()));
  const [type, setType] = useState<(typeof ACTIVITY_TYPES)[number]>('running');
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const save = async () => {
    if (savingRef.current) return;
    const parsed = activitySchema.safeParse({
      date,
      type,
      durationMinutes: parseDecimalInput(duration),
      distanceKm: parseDecimalInput(distance),
      notes,
    });
    if (!parsed.success || date > localDateKey(new Date())) {
      notify(
        'Confira a atividade',
        'Use uma data válida até hoje (AAAA-MM-DD), duração de 1 a 1.440 minutos inteiros e distância positiva ou em branco.',
      );
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      await logActivity(parsed.data);
      router.back();
    } catch {
      notify('Não foi possível registrar', 'Tente novamente.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };
  return (
    <>
      <Stack.Screen options={{ title: 'Registrar atividade' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        className="flex-1 bg-background"
        contentContainerClassName="gap-6 pb-10 pt-4"
      >
        <Section title="Atividade">
          {ACTIVITY_TYPES.map((value) => (
            <ListRow
              key={value}
              title={ACTIVITY_LABELS[value]}
              checked={type === value}
              onPress={() => setType(value)}
            />
          ))}
        </Section>
        <Section
          title="Seu registro"
          footer="Atividades contam como dia ativo. Várias atividades na mesma data contam como um dia. Este registro não avança a sequência do seu programa de musculação."
        >
          <NutritionField label="Data" value={date} onChange={setDate} placeholder="AAAA-MM-DD" />
          <NutritionField label="Duração" value={duration} onChange={setDuration} numeric unit="min" />
          <NutritionField
            label="Distância"
            value={distance}
            onChange={setDistance}
            numeric
            unit="km"
            placeholder="Opcional"
          />
          <NutritionField
            label="Observações"
            value={notes}
            onChange={setNotes}
            multiline
            placeholder="Como foi a atividade?"
          />
        </Section>
        <View className="mx-4">
          <Button title={saving ? 'Registrando…' : 'Registrar atividade'} onPress={save} />
        </View>
      </ScrollView>
    </>
  );
}
