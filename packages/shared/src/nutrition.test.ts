import { describe, expect, it } from 'vitest';

import { EMPTY_NUTRITION_TARGETS, localDateKey, mealSchema, summarizeNutrition } from './nutrition';

describe('nutrition', () => {
  it('distingue um valor não informado de zero nos totais', () => {
    const result = summarizeNutrition([
      { calories: 300, proteinG: 20, carbsG: null, fatG: 0 },
      { calories: null, proteinG: 10, carbsG: 30, fatG: null },
    ]);
    expect(result.total).toEqual({ calories: 300, proteinG: 30, carbsG: 30, fatG: 0 });
    expect(result.missing).toEqual({ calories: 1, proteinG: 0, carbsG: 1, fatG: 1 });
  });

  it('aceita refeições sem macros, mas exige descrição e horário válido quando informado', () => {
    const meal = { ...EMPTY_NUTRITION_TARGETS, name: 'Almoço', description: 'Arroz, feijão e frango', time: null };
    expect(mealSchema.safeParse(meal).success).toBe(true);
    expect(mealSchema.safeParse({ ...meal, time: '25:00' }).success).toBe(false);
    expect(mealSchema.safeParse({ ...meal, proteinG: -1 }).success).toBe(false);
    expect(mealSchema.safeParse({ ...meal, description: ' ' }).success).toBe(false);
  });

  it('usa a data local, inclusive perto da virada do dia', () => {
    expect(localDateKey(new Date(2026, 10, 4, 23, 59))).toBe('2026-11-04');
  });
});
