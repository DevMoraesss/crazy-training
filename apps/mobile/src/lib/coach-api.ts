import { coachPlanSchema, validateCoachPlanForIntake, type CoachIntake } from '@crazy-training/shared';

import { apiRequest } from './api';

export async function requestCoachPlan(intake: CoachIntake) {
  const data = await apiRequest('/coach/plan', {
    method: 'POST',
    body: JSON.stringify(intake),
    signal: AbortSignal.timeout(100_000),
  });
  return validateCoachPlanForIntake(coachPlanSchema.parse(data), intake);
}
