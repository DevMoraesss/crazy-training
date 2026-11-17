import { z } from 'zod';
import { nutritionTargetsSchema, type NutritionTargets } from './nutrition';

export const MAX_FOOD_IMAGE_BYTES = 2 * 1024 * 1024;
export const foodImageSchema = z.object({
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  base64: z
    .string()
    .min(4)
    .max(Math.ceil(MAX_FOOD_IMAGE_BYTES / 3) * 4)
    .regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/),
});
export const foodAnalysisRequestSchema = z
  .object({
    description: z.string().trim().max(4000),
    image: foodImageSchema.nullable(),
    context: z.object({
      goal: z.string().max(80).nullable(),
      preferences: z.string().max(2000),
      allergies: z.string().max(1000),
      targets: nutritionTargetsSchema,
    }),
  })
  .refine(
    (input) => input.description.length >= 3 || input.image !== null,
    'Descreva a refeição ou selecione uma foto.',
  );
export type FoodAnalysisRequest = z.infer<typeof foodAnalysisRequestSchema>;

const estimate = z.number().finite().min(0).max(10000).nullable();
export const foodItemSchema = z.object({
  food: z.string().trim().min(1).max(100),
  portion: z.string().trim().min(1).max(160),
  calories: estimate,
  proteinG: estimate,
  carbsG: estimate,
  fatG: estimate,
});
export type FoodItem = z.infer<typeof foodItemSchema>;
export const foodAnalysisOutputSchema = z
  .object({
    status: z.enum(['estimated', 'clarification', 'unrecognized']),
    name: z.string().trim().min(1).max(80),
    summary: z.string().trim().min(1).max(1600),
    items: z.array(foodItemSchema).max(20),
    assumptions: z.array(z.string().trim().min(1).max(300)).max(10),
    questions: z.array(z.string().trim().min(1).max(300)).max(6),
  })
  .superRefine((output, ctx) => {
    if (output.status === 'estimated' && !output.items.length)
      ctx.addIssue({
        code: 'custom',
        message: 'Uma estimativa precisa identificar alimentos.',
      });
    if (output.status === 'clarification' && !output.questions.length)
      ctx.addIssue({
        code: 'custom',
        message: 'Informe o que precisa ser esclarecido.',
      });
  });
export const foodAnalysisSchema = foodAnalysisOutputSchema.safeExtend({
  id: z.uuid(),
  inputType: z.enum(['text', 'image']),
});
export type FoodAnalysis = z.infer<typeof foodAnalysisSchema>;

/** Se faltar um valor em qualquer item, o total daquele nutriente fica desconhecido. */
export function totalFoodItems(items: readonly FoodItem[]): NutritionTargets {
  const result: NutritionTargets = {
    calories: null,
    proteinG: null,
    carbsG: null,
    fatG: null,
  };
  for (const key of Object.keys(result) as (keyof NutritionTargets)[]) {
    if (items.length && items.every((item) => item[key] !== null))
      result[key] = Math.round(items.reduce((sum, item) => sum + (item[key] ?? 0), 0) * 10) / 10;
  }
  return result;
}
