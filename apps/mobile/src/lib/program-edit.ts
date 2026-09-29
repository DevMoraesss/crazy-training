import { matchExercise, type Program, type Workout, type WorkoutExercise } from '@crazy-training/shared';

import { updateProgram } from '@/db/queries';

// Edições do editor: cada mudança já é salva no programa (como no app Notas, sem botão Salvar).

export function updateWorkout(programId: string, workoutIndex: number, update: (workout: Workout) => Workout) {
  return updateProgram(programId, (program) => ({
    ...program,
    workouts: program.workouts.map((workout, index) => (index === workoutIndex ? update(workout) : workout)),
  }));
}

export function updateExercise(
  programId: string,
  workoutIndex: number,
  exerciseIndex: number,
  update: (exercise: WorkoutExercise) => WorkoutExercise,
) {
  return updateWorkout(programId, workoutIndex, (workout) => ({
    ...workout,
    exercises: workout.exercises.map((exercise, index) => (index === exerciseIndex ? update(exercise) : exercise)),
  }));
}

export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  if (item !== undefined) copy.splice(to, 0, item);
  return copy;
}

/** "Treino A", "Treino B"... o próximo nome livre para um treino novo. */
export function nextWorkoutName(program: Program): string {
  const used = new Set(program.workouts.map((workout) => workout.name));
  for (let code = 65; code <= 90; code++) {
    const name = `Treino ${String.fromCharCode(code)}`;
    if (!used.has(name)) return name;
  }
  return `Treino ${program.workouts.length + 1}`;
}

/** Liga cada exercício ao catálogo quando o nome é reconhecido (para foto, instruções e histórico). */
export function linkToCatalog(program: Program): Program {
  return {
    ...program,
    workouts: program.workouts.map((workout) => ({
      ...workout,
      exercises: workout.exercises.map((exercise) => {
        if (exercise.exerciseId) return exercise;
        const match = matchExercise(exercise.name);
        return match ? { ...exercise, exerciseId: match.exercise.id } : exercise;
      }),
    })),
  };
}

export const BLANK_PROGRAM: Program = {
  formatVersion: 1,
  name: 'Meu programa',
  source: 'manual',
  workouts: [{ name: 'Treino A', modality: 'strength', exercises: [] }],
};
