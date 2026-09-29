import type { Modality } from './workout';

/**
 * Gasto energético estimado: kcal = MET × peso (kg) × duração (h).
 * Valores de referência do Compendium of Physical Activities. É uma estimativa,
 * e a interface deve apresentá-la como tal ("cerca de 320 kcal").
 */
export const DEFAULT_MET: Record<Modality, number> = {
  strength: 5.0, // musculação, esforço moderado a vigoroso
  cardio: 7.0, // corrida leve
  hiit: 8.0, // circuito vigoroso, pouco descanso
  mobility: 2.5, // alongamento e mobilidade
};

export function estimateCalories(input: { weightKg: number; durationMinutes: number; met: number }): number {
  const { weightKg, durationMinutes, met } = input;
  if (weightKg <= 0 || durationMinutes <= 0 || met <= 0) return 0;
  return Math.round(met * weightKg * (durationMinutes / 60));
}
