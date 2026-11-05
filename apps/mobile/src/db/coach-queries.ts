import {
  coachIntakeSchema,
  coachPlanSchema,
  validateCoachPlanForIntake,
  type CoachIntake,
  type CoachPlan,
} from '@crazy-training/shared';
import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { randomUUID } from 'expo-crypto';

import { linkToCatalog } from '@/lib/program-edit';

import { db } from './client';
import { coachSetup, mealTemplates, nutritionTargets, profile, programs } from './schema';

export function useCoachSetup() {
  const { data, updatedAt } = useLiveQuery(db.select().from(coachSetup).where(eq(coachSetup.id, 1)));
  return { setup: data[0], loaded: updatedAt !== undefined };
}

export async function saveCoachIntake(input: CoachIntake) {
  const intake = coachIntakeSchema.parse(input);
  const now = new Date();
  db.transaction((tx) => {
    tx.insert(coachSetup)
      .values({ id: 1, intake, updatedAt: now })
      .onConflictDoUpdate({ target: coachSetup.id, set: { intake, proposal: null, appliedAt: null, updatedAt: now } })
      .run();
    tx.insert(profile)
      .values({ id: 1, ...intake.profile, updatedAt: now })
      .onConflictDoUpdate({ target: profile.id, set: { ...intake.profile, updatedAt: now } })
      .run();
  });
}

export async function saveCoachProposal(intake: CoachIntake, input: CoachPlan) {
  const plan = validateCoachPlanForIntake(coachPlanSchema.parse(input), coachIntakeSchema.parse(intake));
  await db.update(coachSetup).set({ proposal: plan, updatedAt: new Date() }).where(eq(coachSetup.id, 1));
}

/** Aplica tudo junto uma única vez. Programas e refeições anteriores permanecem disponíveis. */
export async function applyCoachProposal() {
  db.transaction((tx) => {
    const row = tx.select().from(coachSetup).where(eq(coachSetup.id, 1)).get();
    if (!row?.proposal || row.appliedAt) throw new Error('Esta sugestão já foi aplicada ou não está disponível.');
    const plan = validateCoachPlanForIntake(coachPlanSchema.parse(row.proposal), coachIntakeSchema.parse(row.intake));
    const now = new Date();
    tx.update(programs).set({ active: false }).run();
    tx.insert(programs)
      .values({
        id: randomUUID(),
        data: linkToCatalog({ ...plan.program, source: 'ai-generated' }),
        active: true,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    for (const meal of plan.meals)
      tx.insert(mealTemplates).values({ id: randomUUID(), data: meal, createdAt: now, updatedAt: now }).run();
    tx.insert(nutritionTargets)
      .values({ id: 1, data: plan.targets, updatedAt: now })
      .onConflictDoUpdate({ target: nutritionTargets.id, set: { data: plan.targets, updatedAt: now } })
      .run();
    tx.update(coachSetup).set({ appliedAt: now, updatedAt: now }).where(eq(coachSetup.id, 1)).run();
  });
}
