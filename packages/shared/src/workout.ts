import { z } from 'zod';

/**
 * Formato portátil de treino: o que entra e sai do app em importação, exportação,
 * compartilhamento e resposta da IA. IDs de banco não fazem parte dele; cada lado
 * (SQLite no aparelho, Postgres na API) cria os seus ao salvar.
 */

export const MODALITIES = ['strength', 'cardio', 'hiit', 'mobility'] as const;
export const modalitySchema = z.enum(MODALITIES);
export type Modality = z.infer<typeof modalitySchema>;

export const repsSchema = z.discriminatedUnion('type', [
  /** 10 repetições */
  z.object({ type: z.literal('fixed'), value: z.number().int().min(1).max(200) }),
  /** 8 a 12 repetições */
  z
    .object({
      type: z.literal('range'),
      min: z.number().int().min(1).max(200),
      max: z.number().int().min(1).max(200),
    })
    .refine((reps) => reps.max > reps.min, { message: 'O máximo de repetições precisa ser maior que o mínimo' }),
  /** até a falha */
  z.object({ type: z.literal('failure') }),
  /** por tempo, como prancha de 30 s */
  z.object({ type: z.literal('time'), seconds: z.number().int().min(1).max(3600) }),
]);
export type Reps = z.infer<typeof repsSchema>;

export const workoutExerciseSchema = z.object({
  /** ID na base de exercícios. Ausente quando o nome importado não foi reconhecido. */
  exerciseId: z.string().min(1).optional(),
  /** Nome como aparece no treino original. */
  name: z.string().trim().min(1).max(120),
  sets: z.number().int().min(1).max(20),
  reps: repsSchema,
  loadKg: z.number().min(0).max(1000).optional(),
  restSeconds: z.number().int().min(0).max(1800).optional(),
  notes: z.string().trim().max(500).optional(),
  /** Repetições de cada série quando a ficha varia ("15, 15, 12, 12"). Uma por série. */
  repsPerSet: z.array(z.number().int().min(1).max(3600)).min(1).max(20).optional(),
  /** Vídeo da execução indicado na ficha original. */
  videoUrl: z.url({ protocol: /^https$/ }).max(300).optional(),
});
export type WorkoutExercise = z.infer<typeof workoutExerciseSchema>;

export const workoutSchema = z.object({
  /** "Treino A", "Full body 1" */
  name: z.string().trim().min(1).max(60),
  /** "Peito, ombro e tríceps" */
  focus: z.string().trim().max(120).optional(),
  modality: modalitySchema.default('strength'),
  exercises: z.array(workoutExerciseSchema).min(1),
  /** Orientações do dia que não são séries: cardio, aquecimento, intervalos. */
  notes: z.string().trim().max(1000).optional(),
});
export type Workout = z.infer<typeof workoutSchema>;

export const PROGRAM_SOURCES = ['manual', 'csv', 'ai-import', 'ai-generated', 'template', 'shared'] as const;

export const programSchema = z.object({
  formatVersion: z.literal(1).default(1),
  name: z.string().trim().min(1).max(80),
  source: z.enum(PROGRAM_SOURCES),
  workouts: z.array(workoutSchema).min(1),
  /** Orientações gerais do programa: duração da fase, frequência, regras de descanso. */
  notes: z.string().trim().max(2000).optional(),
});
export type Program = z.infer<typeof programSchema>;
/** Formato de entrada, antes dos valores padrão serem aplicados. */
export type ProgramInput = z.input<typeof programSchema>;

const TIME_PATTERN = /^(\d+)\s*(s|seg|segundos?)$/;
const MINUTES_PATTERN = /^(\d+)\s*(min|minutos?)$/;
const RANGE_PATTERN = /^(\d+)\s*(?:-|a|–|até)\s*(\d+)$/;

/** Lê repetições escritas por gente: "10", "8-12", "8 a 12", "falha", "30s", "1 min". */
export function parseReps(text: string): Reps | null {
  const value = text.trim().toLowerCase();
  if (value === '') return null;
  if (/^\d+$/.test(value)) return { type: 'fixed', value: Number(value) };
  if (['falha', 'até a falha', 'ate a falha', 'failure'].includes(value)) return { type: 'failure' };

  const range = RANGE_PATTERN.exec(value);
  if (range) return { type: 'range', min: Number(range[1]), max: Number(range[2]) };

  const seconds = TIME_PATTERN.exec(value);
  if (seconds) return { type: 'time', seconds: Number(seconds[1]) };

  const minutes = MINUTES_PATTERN.exec(value);
  if (minutes) return { type: 'time', seconds: Number(minutes[1]) * 60 };

  return null;
}

/** Inverso de parseReps, no formato mais curto. */
export function formatReps(reps: Reps): string {
  switch (reps.type) {
    case 'fixed':
      return String(reps.value);
    case 'range':
      return `${reps.min}-${reps.max}`;
    case 'failure':
      return 'falha';
    case 'time':
      return `${reps.seconds}s`;
  }
}

/** Prescrição curta para listas: "4 × 15, 15, 12, 12" quando a ficha varia por série, senão "4 × 8-12". */
export function formatPrescription(exercise: Pick<WorkoutExercise, 'sets' | 'reps' | 'repsPerSet'>): string {
  if (exercise.repsPerSet?.length === exercise.sets) {
    const unit = exercise.reps.type === 'time' ? 's' : '';
    return `${exercise.sets} × ${exercise.repsPerSet.map((value) => `${value}${unit}`).join(', ')}`;
  }
  return `${exercise.sets} × ${formatReps(exercise.reps)}`;
}

/**
 * Prescrição geral a partir dos valores de cada série: "15, 15, 12, 12" vira a faixa 12-15 e guarda
 * a lista; valores todos iguais viram "10" sem lista. Em exercício por tempo, vale o maior tempo.
 */
export function repsFromValues(values: readonly number[], time: boolean): { reps: Reps; repsPerSet?: number[] } {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const reps: Reps = time
    ? { type: 'time', seconds: max }
    : min === max
      ? { type: 'fixed', value: min }
      : { type: 'range', min, max };
  return min === max ? { reps } : { reps, repsPerSet: [...values] };
}

/** Ajusta as repetições por série a um novo número de séries (repete a última ao aumentar). */
export function resizeRepsPerSet(repsPerSet: readonly number[] | undefined, sets: number): number[] | undefined {
  if (!repsPerSet?.length) return undefined;
  return Array.from({ length: sets }, (_, index) => repsPerSet[Math.min(index, repsPerSet.length - 1)]!);
}

/** Lê descanso: "90", "90s", "1:30", "2 min". Retorna segundos. */
export function parseDuration(text: string): number | null {
  const value = text.trim().toLowerCase();
  if (value === '') return null;
  if (/^\d+$/.test(value)) return Number(value);

  const clock = /^(\d+):([0-5]\d)$/.exec(value);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);

  const seconds = TIME_PATTERN.exec(value);
  if (seconds) return Number(seconds[1]);

  const minutes = MINUTES_PATTERN.exec(value);
  if (minutes) return Number(minutes[1]) * 60;

  return null;
}
