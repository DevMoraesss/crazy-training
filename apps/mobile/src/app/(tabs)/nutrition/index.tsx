import { localDateKey, summarizeNutrition, type Meal, type NutritionTargets } from '@crazy-training/shared';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HeaderButton } from '@/components/ui/header-button';
import { ListRow } from '@/components/ui/list-row';
import { Section } from '@/components/ui/section';
import {
  deleteMealEntry,
  deleteMealTemplate,
  logMeal,
  useMealEntries,
  useMealTemplates,
  useNutritionTargets,
} from '@/db/nutrition-queries';
import { confirm, notify } from '@/lib/dialogs';
import { formatNumber, formatRelativeDay } from '@/lib/format';
import { useNow } from '@/lib/use-now';

const METRICS: { key: keyof NutritionTargets; label: string; unit: string }[] = [
  { key: 'calories', label: 'Energia', unit: 'kcal' },
  { key: 'proteinG', label: 'Proteínas', unit: 'g' },
  { key: 'carbsG', label: 'Carboidratos', unit: 'g' },
  { key: 'fatG', label: 'Gorduras', unit: 'g' },
];

function mealDetails(meal: Meal) {
  return [
    meal.time,
    meal.calories === null ? null : `${formatNumber(meal.calories)} kcal`,
    meal.proteinG === null ? null : `${formatNumber(meal.proteinG)} g de proteína`,
  ]
    .filter(Boolean)
    .join(' · ');
}

export default function NutritionScreen() {
  const router = useRouter();
  const now = useNow(60_000);
  const today = localDateKey(new Date(now));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const date = selectedDate ?? today;
  const entries = useMealEntries(date);
  const templates = useMealTemplates();
  const targets = useNutritionTargets();
  const summary = summarizeNutrition(entries.map((entry) => entry.data));
  const [saving, setSaving] = useState<string | null>(null);
  const savingRef = useRef(false);

  const moveDay = (delta: number) => {
    const next = new Date(`${date}T12:00:00`);
    next.setDate(next.getDate() + delta);
    const key = localDateKey(next);
    setSelectedDate(key === today ? null : key);
  };

  const register = async (id: string, data: Meal) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(id);
    try {
      await logMeal(date, data);
    } catch {
      notify('Não foi possível registrar', 'Tente novamente.');
    } finally {
      savingRef.current = false;
      setSaving(null);
    }
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-background"
      contentContainerClassName="gap-6 pb-10 pt-3"
    >
      <View className="mx-5 flex-row items-center justify-between">
        <DayButton label="Dia anterior" symbol="‹" onPress={() => moveDay(-1)} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar para hoje"
          onPress={() => setSelectedDate(null)}
          className="items-center px-4 py-2"
        >
          <Text className="text-headline font-semibold text-label">
            {date === today ? 'Hoje' : formatRelativeDay(new Date(`${date}T12:00:00`))}
          </Text>
          <Text className="text-footnote text-label-secondary">
            {date === today ? 'Seu diário alimentar' : 'Toque para voltar a hoje'}
          </Text>
        </Pressable>
        <DayButton label="Próximo dia" symbol="›" disabled={date >= today} onPress={() => moveDay(1)} />
      </View>

      <Section title="Planejamento">
        <ListRow
          title="Configurar meu plano"
          subtitle="Responda sobre sua rotina para preparar metas, refeições e treino"
          onPress={() => router.push('/coach')}
          tone="tint"
        />
      </Section>
      <Card>
        <View className="flex-row items-center justify-between">
          <Text className="text-headline font-semibold text-label">Resumo do dia</Text>
          <HeaderButton title="Metas" onPress={() => router.push('/food/targets')} />
        </View>
        <Text className="mt-1 text-subhead text-label-secondary">
          {entries.length} {entries.length === 1 ? 'refeição registrada' : 'refeições registradas'}
        </Text>
        <View className="mt-5 flex-row flex-wrap gap-y-5">
          {METRICS.map(({ key, label, unit }) => {
            const informed = entries.length - summary.missing[key];
            const total = summary.total[key];
            const target = targets[key];
            return (
              <View key={key} className="w-1/2 pr-3">
                <Text className="text-footnote text-label-secondary">{label}</Text>
                <Text className="mt-1 font-rounded text-title2 font-bold text-label">
                  {informed ? formatNumber(total) : '—'}{' '}
                  <Text className="text-footnote font-normal text-label-secondary">{unit}</Text>
                </Text>
                <Text className="mt-1 text-caption text-label-secondary">
                  {target === null ? 'Sem meta definida' : `Meta: ${formatNumber(target)} ${unit}`}
                </Text>
                {summary.missing[key] > 0 ? (
                  <Text className="text-caption text-label-secondary">Parcial · {summary.missing[key]} sem valor</Text>
                ) : null}
              </View>
            );
          })}
        </View>
      </Card>

      <View className="mx-4">
        <Button
          title="Registrar refeição"
          icon={{ ios: 'plus', android: 'add', web: 'add' }}
          onPress={() => router.push({ pathname: '/food/meal', params: { mode: 'log', date } })}
        />
      </View>

      <Section
        title="O que você comeu"
        footer="Os valores são os que você informar para a refeição inteira. Campos em branco não são contados como zero."
      >
        {entries.length ? (
          entries.map((entry) => (
            <View key={entry.id}>
              <ListRow
                title={entry.data.name}
                subtitle={[mealDetails(entry.data), entry.data.description].filter(Boolean).join('\n')}
              />
              <View className="items-end px-5 pb-3">
                <HeaderButton
                  title="Remover"
                  accessibilityLabel={`Remover ${entry.data.name}`}
                  destructive
                  onPress={async () => {
                    if (await confirm('Remover registro?', 'A refeição sai apenas deste dia.', 'Remover', true)) {
                      try {
                        await deleteMealEntry(entry.id);
                      } catch {
                        notify('Não foi possível remover', 'Tente novamente.');
                      }
                    }
                  }}
                />
              </View>
            </View>
          ))
        ) : (
          <ListRow
            title="Seu dia começa aqui"
            subtitle="Registre uma refeição ou use uma das refeições do seu plano abaixo."
          />
        )}
      </Section>

      <Section
        title="Meu plano alimentar"
        footer="Cadastre refeições do seu plano e use-as no diário. Editar ou remover uma refeição do plano não altera dias já registrados."
      >
        {templates.map((template) => (
          <View key={template.id}>
            <ListRow
              title={template.data.name}
              subtitle={[mealDetails(template.data), template.data.description].filter(Boolean).join('\n')}
              onPress={() => router.push({ pathname: '/food/meal', params: { id: template.id, mode: 'template' } })}
            />
            <View className="flex-row items-center justify-between gap-3 px-5 pb-3">
              <HeaderButton
                title={saving === template.id ? 'Registrando…' : 'Registrar'}
                accessibilityLabel={`Registrar ${template.data.name}`}
                onPress={() => {
                  void register(template.id, template.data);
                }}
              />
              <HeaderButton
                title="Excluir"
                destructive
                onPress={async () => {
                  if (
                    await confirm(
                      'Excluir refeição do plano?',
                      'Os registros no diário serão mantidos.',
                      'Excluir',
                      true,
                    )
                  ) {
                    try {
                      await deleteMealTemplate(template.id);
                    } catch {
                      notify('Não foi possível excluir', 'Tente novamente.');
                    }
                  }
                }}
              />
            </View>
          </View>
        ))}
        {!templates.length ? (
          <ListRow
            title="Suas refeições, do seu jeito"
            subtitle="Adicione os alimentos, as porções e, se souber, os valores nutricionais."
          />
        ) : null}
        <ListRow
          title="Adicionar refeição ao plano"
          tone="tint"
          icon={{ ios: 'plus', android: 'add', web: 'add' }}
          onPress={() => router.push({ pathname: '/food/meal', params: { mode: 'template' } })}
        />
      </Section>
    </ScrollView>
  );
}

function DayButton({
  label,
  symbol,
  onPress,
  disabled,
}: {
  label: string;
  symbol: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      className={`h-11 w-11 items-center justify-center rounded-full bg-surface ${disabled ? 'opacity-30' : 'active:opacity-60'}`}
    >
      <Text className="text-title1 text-tint">{symbol}</Text>
    </Pressable>
  );
}
