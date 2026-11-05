import { activitySchema, localDateKey, type Activity } from '@crazy-training/shared';
import { desc, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { randomUUID } from 'expo-crypto';

import { db } from './client';
import { activities } from './schema';

export function useActivities() {
  return useLiveQuery(db.select().from(activities).orderBy(desc(activities.date), desc(activities.createdAt))).data;
}

export async function logActivity(input: Activity) {
  const data = activitySchema.parse(input);
  if (data.date > localDateKey(new Date())) throw new Error('Registre uma atividade feita hoje ou em um dia anterior.');
  await db.insert(activities).values({ id: randomUUID(), date: data.date, data, createdAt: new Date() });
}

export async function deleteActivity(id: string) {
  await db.delete(activities).where(eq(activities.id, id));
}
