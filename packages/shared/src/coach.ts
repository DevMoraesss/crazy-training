import { z } from 'zod';

import { mealSchema } from './nutrition';
import { profileSchema } from './profile';
import { programSchema } from './workout';

export const coachIntakeSchema = z.object({
  profile: profileSchema.extend({
    weightKg: z.number().min(20).max(400),
    heightCm: z.number().min(100).max(250),
    goal: profileSchema.shape.goal.unwrap(),
    level: profileSchema.shape.level.unwrap(),
    equipment: profileSchema.shape.equipment.unwrap(),
    daysPerWeek: z.number().int().min(1).max(7),
  }),
  age: z.number().int().min(18).max(100),
  sex: z.enum(['male', 'female', 'unspecified']),
  routine: z.enum(['sedentary', 'light', 'active', 'very-active']),
  mealsPerDay: z.number().int().min(2).max(6),
  preferences: z.string().trim().max(2000),
  allergies: z.string().trim().min(1).max(1000),
  limitations: z.string().trim().max(1000),
  needsProfessional: z.boolean(),
});
export type CoachIntake = z.infer<typeof coachIntakeSchema>;

export const coachPlanSchema = z
  .object({
    summary: z.string().trim().min(1).max(3000),
    assumptions: z.array(z.string().trim().min(1).max(500)).max(20),
    targets: z
      .object({
        calories: z.number().int().min(1200).max(6000),
        proteinG: z.number().min(1).max(400),
        carbsG: z.number().min(1).max(1000),
        fatG: z.number().min(1).max(250),
      })
      .refine(
        (t) => Math.abs(t.calories - (4 * t.proteinG + 4 * t.carbsG + 9 * t.fatG)) <= t.calories * 0.15,
        'Calorias e macronutrientes precisam ser coerentes.',
      ),
    meals: z.array(mealSchema).min(2).max(6),
    program: programSchema,
  })
  .superRefine((plan, ctx) => {
    if (plan.program.workouts.length > 7 || plan.program.workouts.some((workout) => workout.exercises.length > 20)) {
      ctx.addIssue({ code: 'custom', message: 'Programa maior que o limite suportado.' });
    }
    for (const key of ['calories', 'proteinG', 'carbsG', 'fatG'] as const) {
      if (plan.meals.some((meal) => meal[key] === null))
        ctx.addIssue({ code: 'custom', message: 'Todas as refeições sugeridas precisam ter valores estimados.' });
      const total = plan.meals.reduce((sum, meal) => sum + (meal[key] ?? 0), 0);
      if (Math.abs(total - plan.targets[key]) > plan.targets[key] * 0.2)
        ctx.addIssue({ code: 'custom', message: 'As refeições precisam corresponder às metas do dia.' });
    }
  });
export type CoachPlan = z.infer<typeof coachPlanSchema>;

export function validateCoachPlanForIntake(plan: CoachPlan, intake: CoachIntake) {
  if (intake.needsProfessional)
    throw new Error('Este perfil precisa de orientação profissional antes de gerar um plano.');
  if (plan.meals.length !== intake.mealsPerDay)
    throw new Error('O plano precisa respeitar o número de refeições informado.');
  if (plan.program.workouts.length !== intake.profile.daysPerWeek)
    throw new Error('O plano precisa respeitar os dias de treino informados.');
  return {
    ...plan,
    program: {
      ...plan.program,
      source: 'ai-generated' as const,
      workouts: plan.program.workouts.map((workout) => ({
        ...workout,
        exercises: workout.exercises.map(({ exerciseId: _exerciseId, loadKg: _loadKg, ...exercise }) => exercise),
      })),
    },
  };
}
