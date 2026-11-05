import { z } from 'zod';

import { localDateKey, nutritionDateSchema } from './nutrition';

export const ACTIVITY_TYPES = ['running', 'walking', 'cycling', 'swimming', 'strength', 'other'] as const;
export const ACTIVITY_LABELS: Record<(typeof ACTIVITY_TYPES)[number], string> = {
  running: 'Corrida',
  walking: 'Caminhada',
  cycling: 'Ciclismo',
  swimming: 'Natação',
  strength: 'Musculação',
  other: 'Outra atividade',
};
export const activitySchema = z.object({
  date: nutritionDateSchema,
  type: z.enum(ACTIVITY_TYPES),
  durationMinutes: z.number().int().min(1).max(1440),
  distanceKm: z.number().positive().max(1000).nullable(),
  notes: z.string().trim().max(2000),
});
export type Activity = z.infer<typeof activitySchema>;

/** Sessões e check-ins contam como um único dia ativo por data local. */
export function activeDateKeys(activities: { date: string }[], sessions: { finishedAt: Date | null }[]): Set<string> {
  return new Set([
    ...activities.map(({ date }) => date),
    ...sessions.flatMap(({ finishedAt }) => (finishedAt ? [localDateKey(finishedAt)] : [])),
  ]);
}

/** Semana de segunda a domingo, sem conversão para UTC. */
export function weekDateKeys(date: Date): string[] {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(day.getDate() + index);
    return localDateKey(day);
  });
}
