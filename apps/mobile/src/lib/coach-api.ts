import { coachPlanSchema, validateCoachPlanForIntake, type CoachIntake } from '@crazy-training/shared';

const API = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export async function requestCoachPlan(intake: CoachIntake) {
  let response: Response;
  try {
    response = await fetch(`${API}/coach/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(intake),
      signal: AbortSignal.timeout(100_000),
    });
  } catch {
    throw new Error(
      'Não foi possível conectar ao assistente. Suas respostas estão salvas; tente novamente mais tarde.',
    );
  }
  const data: unknown = await response.json();
  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'message' in data && typeof data.message === 'string'
        ? data.message
        : 'Não foi possível gerar a sugestão. Tente novamente.';
    throw new Error(message);
  }
  return validateCoachPlanForIntake(coachPlanSchema.parse(data), intake);
}
