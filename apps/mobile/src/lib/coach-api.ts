import { coachPlanSchema, validateCoachPlanForIntake, type CoachIntake } from '@crazy-training/shared';

import { runJob } from './api';

export async function requestCoachPlan(intake: CoachIntake) {
  const data = await runJob('/coach/plan', intake);
  return validateCoachPlanForIntake(coachPlanSchema.parse(data), intake);
}
