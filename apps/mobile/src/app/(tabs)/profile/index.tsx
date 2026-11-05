import { bodyMassIndex, type Profile } from '@crazy-training/shared';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { ScrollView } from 'react-native';

import { useCloud } from '@/components/cloud-provider';
import { FieldRow } from '@/components/ui/field-row';
import { ListRow } from '@/components/ui/list-row';
import { Section } from '@/components/ui/section';
import { SegmentedRow } from '@/components/ui/segmented-row';
import { StepperRow } from '@/components/ui/stepper-row';
import { saveProfile, useProfile } from '@/db/queries';
import { notify } from '@/lib/dialogs';
import { formatNumber, parseDecimalInput } from '@/lib/format';
import { EQUIPMENT_OPTIONS, GOAL_OPTIONS, LEVEL_OPTIONS } from '@/lib/labels';

type NumberField = 'weightKg' | 'heightCm' | 'birthYear';

const LIMITS: Record<NumberField, { min: number; max: number; message: string }> = {
  weightKg: { min: 20, max: 400, message: 'Informe o peso em quilos, entre 20 e 400.' },
  heightCm: { min: 100, max: 250, message: 'Informe a altura em centímetros, entre 100 e 250.' },
  birthYear: { min: 1900, max: new Date().getFullYear(), message: 'Informe o ano com quatro dígitos, como 1995.' },
};

export default function ProfileScreen() {
  const profile = useProfile();
  const router = useRouter();
  const cloud = useCloud();

  const commitNumber = (field: NumberField) => (text: string) => {
    const value = parseDecimalInput(text);
    const limits = LIMITS[field];
    if (value === undefined || (value !== null && (value < limits.min || value > limits.max))) {
      notify('Valor inválido', limits.message);
      return;
    }
    const changes: Partial<Profile> = { [field]: value === null || field === 'weightKg' ? value : Math.round(value) };
    void saveProfile(changes);
  };

  const show = (value: number | null) => (value === null ? '' : formatNumber(value));
  const bmi =
    profile.weightKg && profile.heightCm
      ? `IMC ${formatNumber(bodyMassIndex(profile.weightKg, profile.heightCm))}. `
      : '';

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="interactive"
      className="flex-1 bg-background"
      contentContainerClassName="gap-7 pb-10 pt-2"
    >
      <Section title="Conta">
        <ListRow
          title={cloud.user ? cloud.user.email : 'Entrar na minha conta'}
          subtitle={
            cloud.user
              ? cloud.phase === 'ready'
                ? 'Dados conectados à sua conta'
                : 'Ver sincronização'
              : 'Acesse seus dados em outros aparelhos'
          }
          onPress={() => router.push('/account')}
        />
      </Section>
      <Section title="Meu plano">
        <ListRow
          title="Configurar meu plano"
          subtitle="Perfil, metas, alimentação e treino em um só fluxo"
          tone="tint"
          onPress={() => router.push('/coach')}
        />
      </Section>
      <Section title="Corpo" footer={`${bmi}O peso é usado para estimar as calorias de cada treino.`}>
        <FieldRow
          label="Peso"
          value={show(profile.weightKg)}
          suffix="kg"
          placeholder="—"
          keyboardType="decimal-pad"
          onCommit={commitNumber('weightKg')}
        />
        <FieldRow
          label="Altura"
          value={show(profile.heightCm)}
          suffix="cm"
          placeholder="—"
          keyboardType="number-pad"
          onCommit={commitNumber('heightCm')}
        />
        <FieldRow
          label="Ano de nascimento"
          value={profile.birthYear === null ? '' : String(profile.birthYear)}
          placeholder="—"
          keyboardType="number-pad"
          onCommit={commitNumber('birthYear')}
        />
      </Section>

      <Section title="Objetivo">
        {GOAL_OPTIONS.map((option) => (
          <ListRow
            key={option.value}
            title={option.label}
            subtitle={option.description}
            checked={profile.goal === option.value}
            onPress={() => saveProfile({ goal: option.value })}
          />
        ))}
      </Section>

      <Section
        title="Treino"
        footer="Use Configurar meu plano para preparar uma sugestão de treino e alimentação com IA."
      >
        <SegmentedRow
          label="Nível"
          options={LEVEL_OPTIONS}
          value={profile.level}
          onChange={(level) => saveProfile({ level })}
        />
        <SegmentedRow
          label="Onde você treina"
          options={EQUIPMENT_OPTIONS}
          value={profile.equipment}
          onChange={(equipment) => saveProfile({ equipment })}
        />
        <StepperRow
          label="Dias por semana"
          display={profile.daysPerWeek === null ? '—' : String(profile.daysPerWeek)}
          onDecrement={() => saveProfile({ daysPerWeek: Math.max(1, (profile.daysPerWeek ?? 4) - 1) })}
          onIncrement={() => saveProfile({ daysPerWeek: Math.min(7, (profile.daysPerWeek ?? 2) + 1) })}
          canDecrement={profile.daysPerWeek === null || profile.daysPerWeek > 1}
          canIncrement={profile.daysPerWeek === null || profile.daysPerWeek < 7}
        />
      </Section>

      <Section footer="Fotos e instruções dos exercícios: free-exercise-db.">
        <ListRow title="Versão" value={Constants.expoConfig?.version ?? '—'} />
      </Section>
    </ScrollView>
  );
}
