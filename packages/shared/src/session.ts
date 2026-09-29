import { normalizeText } from './text';
import type { Program, Reps, Workout, WorkoutExercise } from './workout';

/** Uma série registrada durante o treino. */
export type CompletedSet = {
  /** Posição do exercício no plano da sessão. */
  exerciseIndex: number;
  setNumber: number;
  /** Repetições feitas; em exercício por tempo, os segundos. */
  reps: number;
  loadKg: number | null;
};

/** Onde o treino está. null quando não falta nada. */
export type SessionPosition = { exerciseIndex: number; setNumber: number } | null;

export type SessionSummary = {
  exercises: number;
  sets: number;
  reps: number;
  /** Soma de carga × repetições. */
  volumeKg: number;
};

export const DEFAULT_REST_SECONDS = 60;

/**
 * Chave para comparar o mesmo exercício entre sessões e programas ("na semana passada:
 * 38 kg × 10"): o ID do catálogo, ou o nome normalizado quando o exercício não está no catálogo.
 */
export function exerciseKey(exercise: Pick<WorkoutExercise, 'exerciseId' | 'name'>): string {
  return exercise.exerciseId ?? `nome:${normalizeText(exercise.name)}`;
}

/** Próximo treino do rodízio: o seguinte ao último concluído (A, B, C, A...). */
export function nextWorkoutIndex(program: Pick<Program, 'workouts'>, lastWorkoutIndex: number | null): number {
  const count = program.workouts.length;
  if (count === 0 || lastWorkoutIndex === null) return 0;
  return (lastWorkoutIndex + 1) % count;
}

/**
 * Primeiro exercício (não pulado) com séries pendentes. Calculado a partir das séries
 * registradas, então o treino continua de onde parou mesmo se o app fechar.
 */
export function sessionPosition(
  plan: Pick<Workout, 'exercises'>,
  sets: readonly Pick<CompletedSet, 'exerciseIndex'>[],
  skipped: readonly number[],
): SessionPosition {
  for (const [exerciseIndex, exercise] of plan.exercises.entries()) {
    if (skipped.includes(exerciseIndex)) continue;
    const done = sets.filter((set) => set.exerciseIndex === exerciseIndex).length;
    if (done < exercise.sets) return { exerciseIndex, setNumber: done + 1 };
  }
  return null;
}

export function summarizeSets(sets: readonly Omit<CompletedSet, 'setNumber'>[]): SessionSummary {
  const volume = sets.reduce((total, set) => total + set.reps * (set.loadKg ?? 0), 0);
  return {
    exercises: new Set(sets.map((set) => set.exerciseIndex)).size,
    sets: sets.length,
    reps: sets.reduce((total, set) => total + set.reps, 0),
    volumeKg: Math.round(volume * 10) / 10,
  };
}

/** Repetições para preencher a série quando não há histórico do exercício. */
export function suggestedReps(reps: Reps): number {
  switch (reps.type) {
    case 'fixed':
      return reps.value;
    case 'range':
      return reps.max;
    case 'failure':
      return 10;
    case 'time':
      return reps.seconds;
  }
}
