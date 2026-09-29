import { programSchema, type Program } from '@crazy-training/shared';

/** Programa de exemplo até existirem a importação e o banco local (Fase 1). */
export const sampleProgram: Program = programSchema.parse({
  name: 'Programa de exemplo',
  source: 'template',
  workouts: [
    {
      name: 'Treino A',
      focus: 'Peito, ombro e tríceps',
      exercises: [
        { name: 'Supino reto com barra', sets: 4, reps: { type: 'fixed', value: 10 }, loadKg: 40, restSeconds: 90 },
        { name: 'Supino inclinado com halteres', sets: 3, reps: { type: 'fixed', value: 12 }, restSeconds: 60 },
        { name: 'Crucifixo na máquina', sets: 3, reps: { type: 'fixed', value: 12 }, restSeconds: 60 },
        { name: 'Desenvolvimento com halteres', sets: 4, reps: { type: 'fixed', value: 10 }, restSeconds: 90 },
        { name: 'Elevação lateral', sets: 3, reps: { type: 'fixed', value: 15 }, restSeconds: 45 },
        { name: 'Tríceps na polia', sets: 3, reps: { type: 'fixed', value: 12 }, restSeconds: 45 },
      ],
    },
    {
      name: 'Treino B',
      focus: 'Costas e bíceps',
      exercises: [
        { name: 'Barra fixa', sets: 4, reps: { type: 'failure' }, restSeconds: 120 },
        { name: 'Remada curvada', sets: 4, reps: { type: 'range', min: 8, max: 10 }, restSeconds: 90 },
        { name: 'Puxada frente', sets: 3, reps: { type: 'range', min: 10, max: 12 }, restSeconds: 60 },
        { name: 'Rosca direta', sets: 3, reps: { type: 'fixed', value: 10 }, restSeconds: 60 },
        { name: 'Rosca martelo', sets: 3, reps: { type: 'fixed', value: 12 }, restSeconds: 45 },
      ],
    },
    {
      name: 'Treino C',
      focus: 'Pernas',
      exercises: [
        { name: 'Agachamento livre', sets: 4, reps: { type: 'range', min: 8, max: 10 }, restSeconds: 120 },
        { name: 'Leg press', sets: 4, reps: { type: 'fixed', value: 12 }, restSeconds: 90 },
        { name: 'Cadeira extensora', sets: 3, reps: { type: 'range', min: 12, max: 15 }, restSeconds: 60 },
        { name: 'Mesa flexora', sets: 3, reps: { type: 'fixed', value: 12 }, restSeconds: 60 },
        { name: 'Panturrilha em pé', sets: 4, reps: { type: 'fixed', value: 15 }, restSeconds: 45 },
      ],
    },
  ],
});
