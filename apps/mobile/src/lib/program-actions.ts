import { serializeProgramCsv, type Program } from '@crazy-training/shared';
import { File, Paths } from 'expo-file-system';
import type { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { createProgram, startSession } from '@/db/queries';

import { notify } from './dialogs';
import { BLANK_PROGRAM } from './program-edit';

type Router = ReturnType<typeof useRouter>;

/** Começa um treino e abre a tela de execução. */
export async function startWorkout(
  router: Router,
  options: { programId: string; program: Program; workoutIndex: number; hasUnfinishedSession: boolean },
) {
  const workout = options.program.workouts[options.workoutIndex];
  if (!workout) return;
  if (workout.exercises.length === 0) {
    notify('Treino sem exercícios', 'Adicione exercícios a este treino antes de começar.');
    return;
  }
  if (options.hasUnfinishedSession) {
    notify('Há um treino em andamento', 'Continue ou encerre o treino atual antes de começar outro.');
    return;
  }
  const id = await startSession(options.programId, options.workoutIndex, workout);
  router.push({ pathname: '/session/[id]', params: { id } });
}

/** Cria um programa em branco e abre o editor. */
export async function createBlankProgram(router: Router) {
  const programId = await createProgram(BLANK_PROGRAM);
  router.push({ pathname: '/editor/[programId]', params: { programId } });
}

/** Exporta o programa em CSV pela folha de compartilhamento do sistema (Arquivos, AirDrop, e-mail...). */
export async function shareProgramCsv(program: Program) {
  const csv = serializeProgramCsv(program);
  const fileName = `${slugify(program.name) || 'treino'}.csv`;

  if (Platform.OS === 'web') {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    link.download = fileName;
    link.click();
    return;
  }

  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(csv);
  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
    dialogTitle: program.name,
  });
}

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
