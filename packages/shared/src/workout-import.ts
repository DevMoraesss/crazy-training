import { z } from 'zod';

import { programSchema, repsFromValues, type Program, type Reps, type Workout, type WorkoutExercise } from './workout';

export const MAX_WORKOUT_PDF_BYTES = 3 * 1024 * 1024;

/** O PDF da ficha enviado pelo app. */
export const workoutPdfRequestSchema = z.object({
  fileName: z.string().trim().min(1).max(200),
  pdfBase64: z
    .string()
    .min(8)
    .max(Math.ceil(MAX_WORKOUT_PDF_BYTES / 3) * 4)
    .regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/),
});
export type WorkoutPdfRequest = z.infer<typeof workoutPdfRequestSchema>;

/** O que a IA devolve ao ler a ficha. `sheetToProgram` confere e converte para o formato do app. */
export const workoutSheetSchema = z.object({
  recognized: z.boolean(),
  /** Por que não é uma ficha legível (quando recognized é false). */
  problem: z.string().trim().max(400).nullable(),
  name: z.string().trim().min(1).max(80),
  notes: z.string().trim().max(2000).nullable(),
  workouts: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(60),
        focus: z.string().trim().max(120).nullable(),
        notes: z.string().trim().max(1000).nullable(),
        exercises: z
          .array(
            z.object({
              name: z.string().trim().min(1).max(120),
              sets: z.number().int().min(1).max(20),
              /** Um valor por série, na ordem da ficha. Vazio quando a ficha não informa. */
              repsPerSet: z.array(z.number().int().min(1).max(3600)).max(20),
              unit: z.enum(['reps', 'seconds', 'failure']),
              restSeconds: z.number().int().min(0).max(1800).nullable(),
              notes: z.string().trim().max(500).nullable(),
              videoUrl: z.string().trim().max(300).nullable(),
            }),
          )
          .max(40),
      }),
    )
    .max(14),
});
export type WorkoutSheet = z.infer<typeof workoutSheetSchema>;
type SheetExercise = WorkoutSheet['workouts'][number]['exercises'][number];

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);
const join = (parts: (string | null | undefined)[], max: number) => {
  const text = parts.filter((part): part is string => Boolean(part?.trim())).join('\n');
  return text ? clip(text, max) : undefined;
};

function toExercise(item: SheetExercise, allowedUrls: ReadonlySet<string>): WorkoutExercise | null {
  const notes: (string | null)[] = [item.notes];
  let reps: Reps;
  let repsPerSet: number[] | undefined;
  if (item.unit === 'failure') reps = { type: 'failure' };
  else {
    let values = item.repsPerSet;
    if (values.length === 0) return null; // sem repetições: vai para as observações do treino
    if (values.length === 1 && item.sets > 1) values = Array.from({ length: item.sets }, () => values[0]!);
    const matches = values.length === item.sets;
    // A ficha lista outra quantidade de valores: preserva o texto em vez de adivinhar a série.
    if (!matches) notes.push(`Repetições na ficha: ${item.repsPerSet.join(', ')}`);
    ({ reps, repsPerSet } = repsFromValues(values, item.unit === 'seconds'));
    if (!matches) repsPerSet = undefined;
  }
  return {
    name: item.name,
    sets: item.sets,
    reps,
    ...(repsPerSet ? { repsPerSet } : {}),
    ...(item.restSeconds === null ? {} : { restSeconds: item.restSeconds }),
    ...(item.videoUrl && allowedUrls.has(item.videoUrl) ? { videoUrl: item.videoUrl } : {}),
    ...(join(notes, 500) ? { notes: join(notes, 500) } : {}),
  };
}

/**
 * Converte a leitura da IA no programa do app. Só aceita links que estão no PDF e não inventa
 * repetições: um item sem repetições (cardio, aquecimento) vira observação do treino.
 */
export function sheetToProgram(sheet: WorkoutSheet, allowedUrls: ReadonlySet<string>): Program {
  const workouts: Workout[] = [];
  for (const day of sheet.workouts) {
    const exercises: WorkoutExercise[] = [];
    const extra: string[] = [];
    for (const item of day.exercises) {
      const exercise = toExercise(item, allowedUrls);
      if (exercise) exercises.push(exercise);
      else extra.push(item.notes ? `${item.name}: ${item.notes}` : item.name);
    }
    if (!exercises.length) continue;
    workouts.push({
      name: day.name,
      ...(day.focus ? { focus: day.focus } : {}),
      modality: 'strength',
      exercises,
      ...(join([day.notes, ...extra], 1000) ? { notes: join([day.notes, ...extra], 1000) } : {}),
    });
  }
  return programSchema.parse({
    formatVersion: 1,
    name: sheet.name,
    source: 'ai-import',
    workouts,
    ...(sheet.notes ? { notes: clip(sheet.notes, 2000) } : {}),
  });
}
