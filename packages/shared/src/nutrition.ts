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
  evidence: z
    .object({
      source: z.literal('ai-estimate'),
      inputType: z.enum(['text', 'image']),
      note: z.string().max(1000),
    })
    .optional(),
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

export const nutritionDaySchema = z.object({
  complete: z.boolean(),
  expenditureCalories: z.number().finite().min(0).max(20000).nullable(),
  weightKg: z.number().finite().min(20).max(400).nullable(),
});
export type NutritionDay = z.infer<typeof nutritionDaySchema>;
export const EMPTY_NUTRITION_DAY: NutritionDay = {
  complete: false,
  expenditureCalories: null,
  weightKg: null,
};

/** Consumo − gasto: positivo é superávit. Meta alimentar não é gasto total. */
export function dailyNutritionReport(
  meals: readonly NutritionTargets[],
  targets: NutritionTargets,
  day: NutritionDay,
) {
  const summary = summarizeNutrition(meals);
  const caloriesKnown = summary.missing.calories === 0 && (meals.length > 0 || day.complete);
  const calories = caloriesKnown ? summary.total.calories : null;
  return {
    ...summary,
    calories,
    targetDifference: calories === null || targets.calories === null ? null : calories - targets.calories,
    energyBalance:
      !day.complete || calories === null || !day.expenditureCalories
        ? null
        : calories - day.expenditureCalories,
    status: !day.complete
      ? ('open' as const)
      : !caloriesKnown
        ? ('incomplete' as const)
        : ('complete' as const),
  };
}
