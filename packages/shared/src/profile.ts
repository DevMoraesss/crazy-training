import { z } from 'zod';

export const GOALS = ['hypertrophy', 'strength', 'fat-loss', 'conditioning'] as const;
export const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export const EQUIPMENT = ['gym', 'home', 'outdoor'] as const;

export type Goal = (typeof GOALS)[number];
export type Level = (typeof LEVELS)[number];
export type Equipment = (typeof EQUIPMENT)[number];

/** Perfil de quem treina. Tudo opcional: o app funciona sem, e cada campo libera um recurso. */
export const profileSchema = z.object({
  weightKg: z.number().min(20).max(400).nullable(),
  heightCm: z.number().min(100).max(250).nullable(),
  birthYear: z.number().int().min(1900).max(2100).nullable(),
  goal: z.enum(GOALS).nullable(),
  level: z.enum(LEVELS).nullable(),
  daysPerWeek: z.number().int().min(1).max(7).nullable(),
  equipment: z.enum(EQUIPMENT).nullable(),
});
export type Profile = z.infer<typeof profileSchema>;

export const EMPTY_PROFILE: Profile = {
  weightKg: null,
  heightCm: null,
  birthYear: null,
  goal: null,
  level: null,
  daysPerWeek: null,
  equipment: null,
};

/** Índice de massa corporal, com uma casa decimal. */
export function bodyMassIndex(weightKg: number, heightCm: number): number {
  const meters = heightCm / 100;
  return Math.round((weightKg / (meters * meters)) * 10) / 10;
}
