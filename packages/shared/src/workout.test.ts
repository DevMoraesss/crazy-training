import { describe, expect, it } from 'vitest';

import { estimateCalories } from './calories';
import { formatReps, parseDuration, parseReps, programSchema } from './workout';

describe('parseReps', () => {
  it.each([
    ['10', { type: 'fixed', value: 10 }],
    ['8-12', { type: 'range', min: 8, max: 12 }],
    ['8 a 12', { type: 'range', min: 8, max: 12 }],
    ['Até a falha', { type: 'failure' }],
    ['30s', { type: 'time', seconds: 30 }],
    ['1 min', { type: 'time', seconds: 60 }],
  ])('"%s"', (text, expected) => {
    expect(parseReps(text)).toEqual(expected);
  });

  it('retorna null para texto que não é repetição', () => {
    expect(parseReps('muitas')).toBeNull();
    expect(parseReps('')).toBeNull();
  });

  it('formatReps é o inverso de parseReps', () => {
    for (const text of ['10', '8-12', 'falha', '45s']) {
      const reps = parseReps(text);
      expect(reps && formatReps(reps)).toBe(text);
    }
  });
});

describe('parseDuration', () => {
  it.each([
    ['90', 90],
    ['90s', 90],
    ['1:30', 90],
    ['2 min', 120],
  ])('"%s" = %i s', (text, seconds) => {
    expect(parseDuration(text)).toBe(seconds);
  });

  it('retorna null para texto inválido', () => {
    expect(parseDuration('um pouco')).toBeNull();
  });
});

describe('programSchema', () => {
  it('recusa faixa de repetições invertida', () => {
    const result = programSchema.safeParse({
      name: 'x',
      source: 'manual',
      workouts: [{ name: 'A', exercises: [{ name: 'Supino', sets: 3, reps: { type: 'range', min: 12, max: 8 } }] }],
    });
    expect(result.success).toBe(false);
  });

  it('aplica musculação como modalidade padrão', () => {
    const program = programSchema.parse({
      name: 'x',
      source: 'manual',
      workouts: [{ name: 'A', exercises: [{ name: 'Supino', sets: 3, reps: { type: 'fixed', value: 10 } }] }],
    });
    expect(program.workouts[0]?.modality).toBe('strength');
  });
});

describe('estimateCalories', () => {
  it('MET × peso × horas', () => {
    expect(estimateCalories({ met: 5, weightKg: 75, durationMinutes: 60 })).toBe(375);
    expect(estimateCalories({ met: 8, weightKg: 80, durationMinutes: 30 })).toBe(320);
  });

  it('retorna 0 para entrada sem sentido', () => {
    expect(estimateCalories({ met: 5, weightKg: 0, durationMinutes: 60 })).toBe(0);
  });
});
