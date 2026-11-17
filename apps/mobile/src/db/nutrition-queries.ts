import {
  EMPTY_NUTRITION_TARGETS,
  mealSchema,
  nutritionDateSchema,
  nutritionTargetsSchema,
  type Meal,
  type NutritionTargets,
  EMPTY_NUTRITION_DAY,
  nutritionDaySchema,
  type NutritionDay,
} from '@crazy-training/shared';
import { asc, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { randomUUID } from 'expo-crypto';

import { db } from './client';
import { mealEntries, mealTemplates, nutritionTargets, nutritionDays } from './schema';

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
  const { data, updatedAt } = useLiveQuery(
    db.select().from(nutritionTargets).where(eq(nutritionTargets.id, 1)),
  );
  return {
    targets: data[0]?.data ?? EMPTY_NUTRITION_TARGETS,
    loaded: updatedAt !== undefined,
  };
}

export async function saveNutritionTargets(data: NutritionTargets) {
  const values = {
    data: nutritionTargetsSchema.parse(data),
    updatedAt: new Date(),
  };
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

export async function logMeal(date: string, data: Meal, id = randomUUID()) {
  const row = {
    id,
    date: nutritionDateSchema.parse(date),
    data: mealSchema.parse(data),
    createdAt: new Date(),
  };
  db.transaction((tx) => {
    // Mesmo id de proposta não pode produzir duas refeições por toque/reenvio.
    const inserted = tx
      .insert(mealEntries)
      .values(row)
      .onConflictDoNothing()
      .returning({ id: mealEntries.id })
      .all();
    if (!inserted.length) return;
    const day = tx.select().from(nutritionDays).where(eq(nutritionDays.date, date)).get();
    if (day)
      tx.update(nutritionDays)
        .set({ data: { ...day.data, complete: false }, updatedAt: new Date() })
        .where(eq(nutritionDays.date, date))
        .run();
  });
}

export async function deleteMealEntry(id: string) {
  db.transaction((tx) => {
    const row = tx.select().from(mealEntries).where(eq(mealEntries.id, id)).get();
    if (!row) return;
    tx.delete(mealEntries).where(eq(mealEntries.id, id)).run();
    const day = tx.select().from(nutritionDays).where(eq(nutritionDays.date, row.date)).get();
    if (day)
      tx.update(nutritionDays)
        .set({ data: { ...day.data, complete: false }, updatedAt: new Date() })
        .where(eq(nutritionDays.date, row.date))
        .run();
  });
}

export function useNutritionDay(date: string) {
  const { data, updatedAt } = useLiveQuery(
    db.select().from(nutritionDays).where(eq(nutritionDays.date, date)),
    [date],
  );
  return {
    day: data[0]?.data ?? EMPTY_NUTRITION_DAY,
    loaded: updatedAt !== undefined,
  };
}
export async function saveNutritionDay(date: string, input: NutritionDay) {
  const values = {
    date: nutritionDateSchema.parse(date),
    data: nutritionDaySchema.parse(input),
    updatedAt: new Date(),
  };
  db.insert(nutritionDays)
    .values(values)
    .onConflictDoUpdate({
      target: nutritionDays.date,
      set: { data: values.data, updatedAt: values.updatedAt },
    })
    .run();
}
