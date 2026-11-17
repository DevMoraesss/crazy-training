import { describe, expect, it } from 'vitest';

import { targetReps } from './session';
import { formatPrescription, programSchema, repsFromValues, resizeRepsPerSet } from './workout';
import { sheetToProgram, workoutPdfRequestSchema, type WorkoutSheet } from './workout-import';

const video = 'https://youtu.be/video-ficticio';
const exercise = (item: Partial<WorkoutSheet['workouts'][number]['exercises'][number]>) => ({
  name: 'Cadeira extensora',
  sets: 4,
  repsPerSet: [15, 15, 12, 12],
  unit: 'reps' as const,
  restSeconds: 60,
  notes: 'Descanso de 60 a 90 s',
  videoUrl: video,
  ...item,
});
const sheet = (exercises: WorkoutSheet['workouts'][number]['exercises']): WorkoutSheet => ({
  recognized: true,
  problem: null,
  name: 'Ficha de teste',
  notes: 'Seguir 8 semanas.',
  workouts: [{ name: 'Dia 1', focus: 'Pernas e abdômen', notes: null, exercises }],
});

describe('sheetToProgram', () => {
  it('mantém as repetições de cada série, o vídeo da ficha e as observações', () => {
    const program = sheetToProgram(sheet([exercise({})]), new Set([video]));
    expect(program).toMatchObject({ name: 'Ficha de teste', source: 'ai-import', notes: 'Seguir 8 semanas.' });
    expect(program.workouts[0]!.exercises[0]).toEqual({
      name: 'Cadeira extensora',
      sets: 4,
      reps: { type: 'range', min: 12, max: 15 },
      repsPerSet: [15, 15, 12, 12],
      restSeconds: 60,
      videoUrl: video,
      notes: 'Descanso de 60 a 90 s',
    });
  });
  it('descarta link que não veio do PDF', () => {
    const program = sheetToProgram(sheet([exercise({ videoUrl: 'https://youtu.be/inventado' })]), new Set([video]));
    expect(program.workouts[0]!.exercises[0]!.videoUrl).toBeUndefined();
  });
  it('trata tempo, falha e repetições iguais sem inventar valores', () => {
    const program = sheetToProgram(
      sheet([
        exercise({ name: 'Prancha abdominal', sets: 3, repsPerSet: [120], unit: 'seconds', videoUrl: null }),
        exercise({ name: 'Paralelas', repsPerSet: [8, 8, 8, 8], videoUrl: null, notes: null }),
        exercise({ name: 'Barra fixa', repsPerSet: [], unit: 'failure', videoUrl: null, notes: null }),
      ]),
      new Set(),
    );
    const [plank, dips, pullUp] = program.workouts[0]!.exercises;
    expect(plank!.reps).toEqual({ type: 'time', seconds: 120 });
    expect(plank!.repsPerSet).toBeUndefined();
    expect(dips).toEqual({ name: 'Paralelas', sets: 4, reps: { type: 'fixed', value: 8 }, restSeconds: 60 });
    expect(pullUp!.reps).toEqual({ type: 'failure' });
  });
  it('quando a ficha lista outra quantidade de valores, guarda o texto original em vez de adivinhar', () => {
    const program = sheetToProgram(sheet([exercise({ sets: 4, repsPerSet: [12, 12, 12], notes: 'Drop set na última' })]), new Set());
    const item = program.workouts[0]!.exercises[0]!;
    expect(item.repsPerSet).toBeUndefined();
    expect(item.reps).toEqual({ type: 'fixed', value: 12 });
    expect(item.notes).toBe('Drop set na última\nRepetições na ficha: 12, 12, 12');
  });
  it('move itens sem repetições (cardio) para as observações do treino e pula dias vazios', () => {
    const input = sheet([
      exercise({}),
      exercise({ name: 'Cardio', sets: 1, repsPerSet: [], notes: '30 min para ganho de massa', videoUrl: null }),
    ]);
    input.workouts.push({ name: 'Dia 7', focus: null, notes: 'Descanso', exercises: [] });
    const program = sheetToProgram(input, new Set([video]));
    expect(program.workouts).toHaveLength(1);
    expect(program.workouts[0]!.exercises).toHaveLength(1);
    expect(program.workouts[0]!.notes).toBe('Cardio: 30 min para ganho de massa');
  });
  it('recusa ficha sem nenhum exercício', () => {
    expect(() => sheetToProgram(sheet([]), new Set())).toThrow();
  });
});

describe('prescrição por série', () => {
  const item = { sets: 4, reps: { type: 'range' as const, min: 12, max: 15 }, repsPerSet: [15, 15, 12, 12] };
  it('mostra os valores de cada série e a meta da série atual', () => {
    expect(formatPrescription(item)).toBe('4 × 15, 15, 12, 12');
    expect(formatPrescription({ ...item, repsPerSet: undefined })).toBe('4 × 12-15');
    expect(targetReps(item, 1)).toBe(15);
    expect(targetReps(item, 4)).toBe(12);
    expect(targetReps({ ...item, repsPerSet: undefined }, 1)).toBe(15);
  });
  it('deriva a prescrição geral dos valores de cada série', () => {
    expect(repsFromValues([15, 15, 12, 12], false)).toEqual({
      reps: { type: 'range', min: 12, max: 15 },
      repsPerSet: [15, 15, 12, 12],
    });
    expect(repsFromValues([10, 10, 10], false)).toEqual({ reps: { type: 'fixed', value: 10 } });
    expect(repsFromValues([30, 45, 60], true)).toEqual({ reps: { type: 'time', seconds: 60 }, repsPerSet: [30, 45, 60] });
  });
  it('acompanha a mudança do número de séries no editor', () => {
    expect(resizeRepsPerSet([15, 15, 12, 12], 3)).toEqual([15, 15, 12]);
    expect(resizeRepsPerSet([15, 12], 4)).toEqual([15, 12, 12, 12]);
    expect(resizeRepsPerSet(undefined, 4)).toBeUndefined();
  });
  it('programas antigos, sem os campos novos, continuam válidos', () => {
    expect(
      programSchema.safeParse({
        name: 'Antigo',
        source: 'csv',
        workouts: [{ name: 'A', exercises: [{ name: 'Supino', sets: 3, reps: { type: 'fixed', value: 10 } }] }],
      }).success,
    ).toBe(true);
  });
  it('recusa vídeo que não é https', () => {
    const base = { name: 'A', source: 'manual', workouts: [{ name: 'A', exercises: [] }] };
    const bad = { name: 'Supino', sets: 3, reps: { type: 'fixed', value: 10 }, videoUrl: 'javascript:alert(1)' };
    expect(programSchema.safeParse({ ...base, workouts: [{ name: 'A', exercises: [bad] }] }).success).toBe(false);
  });
});

describe('workoutPdfRequestSchema', () => {
  it('aceita base64 e recusa texto qualquer', () => {
    expect(workoutPdfRequestSchema.safeParse({ fileName: 'ficha.pdf', pdfBase64: 'JVBERi0xLjQ=' }).success).toBe(true);
    expect(workoutPdfRequestSchema.safeParse({ fileName: 'ficha.pdf', pdfBase64: 'não é base64!' }).success).toBe(false);
  });
});
