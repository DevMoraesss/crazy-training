import {
  EMPTY_NUTRITION_TARGETS,
  mealSchema,
  nutritionDateSchema,
  nutritionTargetsSchema,
  type Meal,
  type NutritionTargets,
} from '@crazy-training/shared';
import { asc, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { randomUUID } from 'expo-crypto';

import { db } from './client';
import { mealEntries, mealTemplates, nutritionTargets } from './schema';

export function useMealTemplates() {
  return useLiveQuery(db.select().from(mealTemplates).orderBy(asc(mealTemplates.createdAt))).data;
}

export function useMealTemplate(id: string | undefined) {
  const { data, updatedAt } = useLiveQuery(
    db
      .select()
      .from(mealTemplates)
      .where(eq(mealTemplates.id, id ?? '')),
    [id],
  );
  return { template: data[0], loaded: updatedAt !== undefined };
}

export function useMealEntries(date: string) {
  return useLiveQuery(
    db.select().from(mealEntries).where(eq(mealEntries.date, date)).orderBy(asc(mealEntries.createdAt)),
    [date],
  ).data;
}

export function useNutritionTargets(): NutritionTargets {
  return useNutritionSettings().targets;
}

export function useNutritionSettings() {
  const { data, updatedAt } = useLiveQuery(db.select().from(nutritionTargets).where(eq(nutritionTargets.id, 1)));
  return { targets: data[0]?.data ?? EMPTY_NUTRITION_TARGETS, loaded: updatedAt !== undefined };
}

export async function saveNutritionTargets(data: NutritionTargets) {
  const values = { data: nutritionTargetsSchema.parse(data), updatedAt: new Date() };
  await db
    .insert(nutritionTargets)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({ target: nutritionTargets.id, set: values });
}

export async function saveMealTemplate(data: Meal, id?: string) {
  const values = { data: mealSchema.parse(data), updatedAt: new Date() };
  if (id) await db.update(mealTemplates).set(values).where(eq(mealTemplates.id, id));
  else await db.insert(mealTemplates).values({ id: randomUUID(), ...values, createdAt: new Date() });
}

export async function deleteMealTemplate(id: string) {
  await db.delete(mealTemplates).where(eq(mealTemplates.id, id));
}

export async function logMeal(date: string, data: Meal) {
  await db
    .insert(mealEntries)
    .values({
      id: randomUUID(),
      date: nutritionDateSchema.parse(date),
      data: mealSchema.parse(data),
      createdAt: new Date(),
    });
}

export async function deleteMealEntry(id: string) {
  await db.delete(mealEntries).where(eq(mealEntries.id, id));
}
