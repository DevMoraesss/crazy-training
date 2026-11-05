import { z } from 'zod';

const nutrient = z.number().finite().min(0).max(10000).nullable();
export const nutritionDateSchema = z.iso.date();

/** Totais da porção inteira informada, nunca valores presumidos por alimento. */
export const mealSchema = z.object({
  name: z.string().trim().min(1).max(80),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .nullable(),
  description: z.string().trim().min(1).max(2000),
  calories: nutrient,
  proteinG: nutrient,
  carbsG: nutrient,
  fatG: nutrient,
});
export type Meal = z.infer<typeof mealSchema>;

export const nutritionTargetsSchema = z.object({
  calories: nutrient,
  proteinG: nutrient,
  carbsG: nutrient,
  fatG: nutrient,
});
export type NutritionTargets = z.infer<typeof nutritionTargetsSchema>;
export const EMPTY_NUTRITION_TARGETS: NutritionTargets = {
  calories: null,
  proteinG: null,
  carbsG: null,
  fatG: null,
};

/** Ausente é diferente de zero: uma soma parcial nunca parece um total completo. */
export function summarizeNutrition(meals: readonly NutritionTargets[]) {
  const total = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  const missing = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  for (const meal of meals) {
    for (const key of Object.keys(total) as (keyof NutritionTargets)[]) {
      if (meal[key] === null) missing[key]++;
      else total[key] += meal[key];
    }
  }
  return { total, missing };
}

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
