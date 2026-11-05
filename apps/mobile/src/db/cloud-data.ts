import { cloudSnapshotSchema, type CloudSnapshot } from '@crazy-training/shared';
import { asc, desc, eq } from 'drizzle-orm';
import { CryptoDigestAlgorithm, digestStringAsync } from 'expo-crypto';

import { db } from './client';
import {
  activities,
  cloudBackups,
  cloudState,
  coachSetup,
  mealEntries,
  mealTemplates,
  nutritionTargets,
  profile,
  programs,
  sessions,
  sessionSets,
} from './schema';

export const CLOUD_TABLES = [
  'profile',
  'programs',
  'sessions',
  'session_sets',
  'activities',
  'meal_entries',
  'meal_templates',
  'nutrition_targets',
  'coach_setup',
];
export function exportCloudSnapshot(): CloudSnapshot {
  return cloudSnapshotSchema.parse(
    JSON.parse(
      JSON.stringify({
        version: 1,
        profile: db.select().from(profile).where(eq(profile.id, 1)).get() ?? null,
        programs: db.select().from(programs).orderBy(asc(programs.id)).all(),
        sessions: db.select().from(sessions).orderBy(asc(sessions.id)).all(),
        sessionSets: db.select().from(sessionSets).orderBy(asc(sessionSets.id)).all(),
        mealTemplates: db.select().from(mealTemplates).orderBy(asc(mealTemplates.id)).all(),
        mealEntries: db.select().from(mealEntries).orderBy(asc(mealEntries.id)).all(),
        nutritionTargets: db.select().from(nutritionTargets).where(eq(nutritionTargets.id, 1)).get() ?? null,
        activities: db.select().from(activities).orderBy(asc(activities.id)).all(),
        coachSetup: db.select().from(coachSetup).where(eq(coachSetup.id, 1)).get() ?? null,
      }),
    ),
  );
}
export const snapshotFingerprint = (snapshot: CloudSnapshot) =>
  digestStringAsync(CryptoDigestAlgorithm.SHA256, JSON.stringify(snapshot));
export function snapshotHasData(snapshot: CloudSnapshot) {
  return Boolean(
    snapshot.profile ||
    snapshot.programs.length ||
    snapshot.sessions.length ||
    snapshot.activities.length ||
    snapshot.mealEntries.length ||
    snapshot.mealTemplates.length ||
    snapshot.nutritionTargets ||
    snapshot.coachSetup,
  );
}
export function readCloudState() {
  return db.select().from(cloudState).where(eq(cloudState.id, 1)).get();
}
export function writeCloudState(ownerId: string, revision: number, fingerprint: string) {
  const values = { ownerId, revision, fingerprint, syncedAt: new Date() };
  db.insert(cloudState)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({ target: cloudState.id, set: values })
    .run();
}
export function latestCloudBackup(ownerId: string) {
  return db
    .select()
    .from(cloudBackups)
    .where(eq(cloudBackups.ownerId, ownerId))
    .orderBy(desc(cloudBackups.id))
    .limit(1)
    .get();
}

export function importCloudSnapshot(
  input: CloudSnapshot,
  ownerId: string,
  revision: number,
  fingerprint: string,
  backup?: CloudSnapshot,
) {
  const snapshot = cloudSnapshotSchema.parse(input);
  db.transaction((tx) => {
    if (backup) {
      tx.insert(cloudBackups).values({ ownerId, data: backup, createdAt: new Date() }).run();
      const stale = tx
        .select({ id: cloudBackups.id })
        .from(cloudBackups)
        .where(eq(cloudBackups.ownerId, ownerId))
        .orderBy(desc(cloudBackups.id))
        .all()
        .slice(3);
      for (const row of stale) tx.delete(cloudBackups).where(eq(cloudBackups.id, row.id)).run();
    }
    tx.delete(sessionSets).run();
    tx.delete(sessions).run();
    tx.delete(programs).run();
    tx.delete(profile).run();
    tx.delete(activities).run();
    tx.delete(mealEntries).run();
    tx.delete(mealTemplates).run();
    tx.delete(nutritionTargets).run();
    tx.delete(coachSetup).run();
    if (snapshot.profile)
      tx.insert(profile)
        .values({ ...snapshot.profile, updatedAt: new Date(snapshot.profile.updatedAt) })
        .run();
    for (const row of snapshot.programs)
      tx.insert(programs)
        .values({ ...row, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) })
        .run();
    for (const row of snapshot.sessions)
      tx.insert(sessions)
        .values({
          ...row,
          startedAt: new Date(row.startedAt),
          finishedAt: row.finishedAt ? new Date(row.finishedAt) : null,
        })
        .run();
    for (const row of snapshot.sessionSets)
      tx.insert(sessionSets)
        .values({ ...row, completedAt: new Date(row.completedAt) })
        .run();
    for (const row of snapshot.activities)
      tx.insert(activities)
        .values({ ...row, createdAt: new Date(row.createdAt) })
        .run();
    for (const row of snapshot.mealEntries)
      tx.insert(mealEntries)
        .values({ ...row, createdAt: new Date(row.createdAt) })
        .run();
    for (const row of snapshot.mealTemplates)
      tx.insert(mealTemplates)
        .values({ ...row, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) })
        .run();
    if (snapshot.nutritionTargets)
      tx.insert(nutritionTargets)
        .values({ ...snapshot.nutritionTargets, updatedAt: new Date(snapshot.nutritionTargets.updatedAt) })
        .run();
    if (snapshot.coachSetup)
      tx.insert(coachSetup)
        .values({
          ...snapshot.coachSetup,
          updatedAt: new Date(snapshot.coachSetup.updatedAt),
          appliedAt: snapshot.coachSetup.appliedAt ? new Date(snapshot.coachSetup.appliedAt) : null,
        })
        .run();
    const values = { ownerId, revision, fingerprint, syncedAt: new Date() };
    tx.insert(cloudState)
      .values({ id: 1, ...values })
      .onConflictDoUpdate({ target: cloudState.id, set: values })
      .run();
  });
}
