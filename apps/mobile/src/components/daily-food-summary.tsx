import { dailyNutritionReport, localDateKey } from '@crazy-training/shared';
import { useRouter } from 'expo-router';
import { Text } from 'react-native';

import { useActivities } from '@/db/activity-queries';
import { useMealEntries, useNutritionDay, useNutritionTargets } from '@/db/nutrition-queries';
import { useFinishedSessions } from '@/db/queries';
import { formatNumber } from '@/lib/format';
import { Card } from './ui/card';
import { HeaderButton } from './ui/header-button';

export function DailyFoodSummary({ date }: { date: string }) {
  const router = useRouter();
  const entries = useMealEntries(date);
  const { day } = useNutritionDay(date);
  const targets = useNutritionTargets();
  const activities = useActivities().filter((row) => row.date === date);
  const sessions = useFinishedSessions().filter(
    (row) => row.finishedAt && localDateKey(row.finishedAt) === date,
  );
  const report = dailyNutritionReport(
    entries.map((row) => row.data),
    targets,
    day,
  );
  return (
    <Card>
      <Text className="text-headline font-semibold text-label">Balanço do dia</Text>
      <Text className="mt-2 text-body text-label-secondary">
        {report.status === 'open'
          ? 'Registros em aberto: confirme quando tiver registrado tudo que consumiu.'
          : report.status === 'incomplete'
            ? 'Você confirmou os registros, mas faltam calorias em uma ou mais refeições.'
            : 'Alimentação confirmada como completa.'}
      </Text>
      {report.targetDifference !== null ? (
        <Text className="mt-3 text-body text-label">
          {formatNumber(Math.abs(report.targetDifference))} kcal{' '}
          {report.targetDifference > 0
            ? 'acima da meta alimentar'
            : report.targetDifference < 0
              ? 'abaixo da meta alimentar'
              : 'de diferença para a meta alimentar'}
          {day.complete ? '.' : ' até agora.'}
        </Text>
      ) : null}
      <Text className="mt-2 text-body text-label-secondary">
        Gasto total estimado:{' '}
        {day.expenditureCalories
          ? `${formatNumber(day.expenditureCalories)} kcal (já inclui atividades).`
          : 'não informado.'}
      </Text>
      <Text className="mt-2 text-body text-label">
        {report.energyBalance === null
          ? 'Saldo energético ainda indisponível: requer alimentação completa, calorias informadas e gasto total estimado.'
          : report.energyBalance < 0
            ? `Déficit estimado: ${formatNumber(-report.energyBalance)} kcal.`
            : report.energyBalance > 0
              ? `Superávit estimado: ${formatNumber(report.energyBalance)} kcal.`
              : 'Saldo estimado: 0 kcal.'}
      </Text>
      <Text className="mt-2 text-subhead text-label-secondary">
        Atividades registradas: {activities.length} {activities.length === 1 ? 'atividade' : 'atividades'} e{' '}
        {sessions.length} {sessions.length === 1 ? 'treino concluído' : 'treinos concluídos'}.
      </Text>
      {day.weightKg !== null ? (
        <Text className="mt-2 text-body text-label-secondary">
          Pesagem informada: {formatNumber(day.weightKg)} kg.
        </Text>
      ) : null}
      <Text className="mt-3 text-footnote text-label-secondary">
        Saldo calórico não mede gordura perdida ou ganha. Alterar refeições reabre a confirmação do dia.
      </Text>
      <HeaderButton
        title="Revisar fechamento do dia"
        onPress={() => router.push({ pathname: '/food/day', params: { date } })}
      />
    </Card>
  );
}
