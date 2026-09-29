import type { Reps, Workout } from './workout';

const SECONDS_PER_REP = 3;
const FAILURE_SET_SECONDS = 45;
const DEFAULT_REST_SECONDS = 60;
/** Trocar de aparelho, montar a barra, ajustar a carga. */
const TRANSITION_SECONDS = 60;

export function estimateSetSeconds(reps: Reps): number {
  switch (reps.type) {
    case 'fixed':
      return reps.value * SECONDS_PER_REP;
    case 'range':
      return ((reps.min + reps.max) / 2) * SECONDS_PER_REP;
    case 'failure':
      return FAILURE_SET_SECONDS;
    case 'time':
      return reps.seconds;
  }
}

/** Duração estimada em minutos: séries, descansos entre elas e a troca de exercício. */
export function estimateWorkoutMinutes(workout: Pick<Workout, 'exercises'>): number {
  let seconds = 0;
  for (const exercise of workout.exercises) {
    const rest = exercise.restSeconds ?? DEFAULT_REST_SECONDS;
    seconds += exercise.sets * estimateSetSeconds(exercise.reps) + (exercise.sets - 1) * rest + TRANSITION_SECONDS;
  }
  return Math.round(seconds / 60);
}
