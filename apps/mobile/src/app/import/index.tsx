import {
  buildImportPrompt,
  formatReps,
  matchExercise,
  parseProgramCsv,
  type CsvIssue,
  type Program,
} from '@crazy-training/shared';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FieldRow } from '@/components/ui/field-row';
import { HeaderButton } from '@/components/ui/header-button';
import { ListRow } from '@/components/ui/list-row';
import { Section } from '@/components/ui/section';
import { createProgram } from '@/db/queries';
import { notify } from '@/lib/dialogs';
import { linkToCatalog } from '@/lib/program-edit';
import { useColors } from '@/theme';

const MONOSPACE = Platform.select({ ios: 'ui-monospace', android: 'monospace', default: 'ui-monospace, monospace' });

type Review = { ok: true; program: Program } | { ok: false; issues: CsvIssue[] };

export default function ImportScreen() {
  const router = useRouter();
  const colors = useColors();
  const [csv, setCsv] = useState('');
  const [name, setName] = useState('Programa importado');
  const [copied, setCopied] = useState(false);
  const [review, setReview] = useState<Review | null>(null);

  const copyPrompt = async () => {
    await Clipboard.setStringAsync(buildImportPrompt());
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
  };

  const paste = async () => {
    const text = await Clipboard.getStringAsync();
    if (text.trim()) setCsv(text);
    else notify('A área de transferência está vazia', 'Copie o CSV da resposta da IA e tente de novo.');
  };

  const openFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'text/comma-separated-values', 'text/plain', 'public.comma-separated-values-text'],
      copyToCacheDirectory: true,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    const text = asset.file ? await asset.file.text() : await new File(asset.uri).text();
    setCsv(text);
    if (name === 'Programa importado') setName(asset.name.replace(/\.[^.]+$/, ''));
  };

  const check = () => {
    const result = parseProgramCsv(csv, { name: name.trim() || 'Programa importado', source: 'csv' });
    setReview(result.ok ? { ok: true, program: linkToCatalog(result.program) } : result);
  };

  const save = async (program: Program) => {
    await createProgram(program);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: review?.ok ? 'Revisar importação' : 'Importar treino',
          headerLeft: () => <HeaderButton title="Cancelar" onPress={() => router.back()} />,
          headerRight: review?.ok
            ? () => <HeaderButton title="Salvar" bold onPress={() => save(review.program)} />
            : undefined,
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="interactive"
        className="flex-1 bg-background"
        contentContainerClassName="gap-7 pb-12 pt-4">
        {review?.ok ? (
          <ReviewList program={review.program} onEdit={() => setReview(null)} onSave={() => save(review.program)} />
        ) : (
          <>
            <Card>
              <Text className="text-headline font-semibold text-label">Como funciona</Text>
              {[
                'Copie o prompt abaixo.',
                'Abra o ChatGPT, Gemini ou Claude, anexe seu treino (PDF, foto ou planilha) e cole o prompt.',
                'Copie o CSV da resposta e cole aqui.',
              ].map((step, index) => (
                <View key={step} className="mt-2.5 flex-row gap-3">
                  <Text className="w-5 text-body font-semibold text-tint">{index + 1}.</Text>
                  <Text className="flex-1 text-body text-label">{step}</Text>
                </View>
              ))}
              <View className="mt-5">
                <Button
                  title={copied ? 'Prompt copiado' : 'Copiar prompt'}
                  variant={copied ? 'gray' : 'filled'}
                  icon={
                    copied
                      ? { ios: 'checkmark', android: 'check', web: 'check' }
                      : { ios: 'doc.on.doc', android: 'content_copy', web: 'content_copy' }
                  }
                  onPress={copyPrompt}
                />
              </View>
            </Card>

            <Section title="CSV da resposta">
              <TextInput
                accessibilityLabel="CSV da resposta"
                className="min-h-[160px] px-5 py-3 text-footnote text-label"
                style={{ fontFamily: MONOSPACE }}
                multiline
                textAlignVertical="top"
                autoCapitalize="none"
                autoCorrect={false}
                value={csv}
                onChangeText={(text) => {
                  setCsv(text);
                  setReview(null);
                }}
                placeholder={'treino,foco,exercicio,series,repeticoes,...'}
                placeholderTextColor={colors['label-tertiary']}
              />
            </Section>

            <View className="mx-4 flex-row gap-3">
              <View className="flex-1">
                <Button title="Colar" variant="gray" size="medium" onPress={paste} />
              </View>
              <View className="flex-1">
                <Button title="Abrir arquivo" variant="gray" size="medium" onPress={openFile} />
              </View>
            </View>

            <Section>
              <FieldRow label="Nome do programa" value={name} onCommit={setName} />
            </Section>

            {review && !review.ok ? (
              <Section title="Corrija antes de continuar" separatorInset={56}>
                {review.issues.map((issue, index) => (
                  <ListRow
                    key={index}
                    icon={{ ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' }}
                    iconColor={colors.warning}
                    title={issue.line > 0 ? `Linha ${issue.line}` : 'Arquivo'}
                    subtitle={issue.message}
                  />
                ))}
              </Section>
            ) : null}

            <View className="mx-4">
              <Button title="Revisar treino" onPress={check} />
            </View>
          </>
        )}
      </ScrollView>
    </>
  );
}

function ReviewList({ program, onEdit, onSave }: { program: Program; onEdit: () => void; onSave: () => void }) {
  const colors = useColors();
  const exercises = program.workouts.flatMap((workout) => workout.exercises);
  const unmatched = exercises.filter((exercise) => !exercise.exerciseId).length;

  return (
    <>
      <Card>
        <Text className="text-title2 font-bold text-label">{program.name}</Text>
        <Text className="mt-1 text-body text-label-secondary">
          {program.workouts.length} {program.workouts.length === 1 ? 'treino' : 'treinos'} e {exercises.length} exercícios.
          {unmatched > 0
            ? ` ${unmatched} ${unmatched === 1 ? 'exercício não está' : 'exercícios não estão'} na base: ficam com o nome original, sem foto.`
            : ' Todos os exercícios foram encontrados na base.'}
        </Text>
      </Card>

      {program.workouts.map((workout, workoutIndex) => (
        <Section key={workoutIndex} title={workout.name} footer={workout.focus} separatorInset={56}>
          {workout.exercises.map((exercise, index) => {
            const match = exercise.exerciseId ? matchExercise(exercise.name) : null;
            const found = Boolean(exercise.exerciseId);
            const details = `${exercise.sets} × ${formatReps(exercise.reps)}${
              exercise.restSeconds === undefined ? '' : `, descanso ${exercise.restSeconds} s`
            }`;
            return (
              <ListRow
                key={index}
                icon={
                  found
                    ? { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }
                    : { ios: 'questionmark.circle.fill', android: 'help', web: 'help' }
                }
                iconColor={found ? colors.success : colors.warning}
                title={exercise.name}
                subtitle={
                  match?.confidence === 'probable'
                    ? `${details}. Na base: ${match.exercise.name}`
                    : found
                      ? details
                      : `${details}. Não encontrado na base`
                }
              />
            );
          })}
        </Section>
      ))}

      <View className="mx-4 gap-2">
        <Button title="Salvar programa" onPress={onSave} />
        <Button title="Voltar e editar o CSV" variant="plain" onPress={onEdit} />
      </View>
    </>
  );
}
