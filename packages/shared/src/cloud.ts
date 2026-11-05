import { z } from 'zod';

import { activitySchema } from './activity';
import { coachIntakeSchema, coachPlanSchema } from './coach';
import { mealSchema, nutritionDateSchema, nutritionTargetsSchema } from './nutrition';
import { profileSchema } from './profile';
import { programSchema, workoutExerciseSchema, workoutSchema } from './workout';

export const loginSchema = z.object({
  email: z
    .email()
    .max(254)
    .transform((value) => value.toLowerCase().trim()),
  password: z.string().min(1).max(256),
});
const timestamp = z.iso.datetime();
const id = z.string().min(1).max(100);
const draftWorkout = workoutSchema.extend({ exercises: z.array(workoutExerciseSchema).max(100) });
const draftProgram = programSchema.extend({ workouts: z.array(draftWorkout).max(100) });

/** Formato de transporte versionado. Datas são ISO, nunca números dependentes de timezone. */
export const cloudSnapshotSchema = z
  .object({
    version: z.literal(1),
    profile: z.object({ id: z.literal(1), ...profileSchema.shape, updatedAt: timestamp }).nullable(),
    programs: z
      .array(z.object({ id, data: draftProgram, active: z.boolean(), createdAt: timestamp, updatedAt: timestamp }))
      .max(1000),
    sessions: z
      .array(
        z.object({
          id,
          programId: id.nullable(),
          workoutIndex: z.number().int().nonnegative(),
          plan: workoutSchema,
          skipped: z.array(z.number().int().nonnegative()),
          startedAt: timestamp,
          finishedAt: timestamp.nullable(),
          calories: z.number().int().nonnegative().nullable(),
        }),
      )
      .max(10000),
    sessionSets: z
      .array(
        z.object({
          id: z.number().int().positive(),
          sessionId: id,
          exerciseIndex: z.number().int().nonnegative(),
          exerciseKey: z.string().min(1).max(500),
          setNumber: z.number().int().positive(),
          reps: z.number().int().nonnegative(),
          loadKg: z.number().min(0).max(1000).nullable(),
          completedAt: timestamp,
        }),
      )
      .max(100000),
    mealTemplates: z.array(z.object({ id, data: mealSchema, createdAt: timestamp, updatedAt: timestamp })).max(10000),
    mealEntries: z
      .array(z.object({ id, date: nutritionDateSchema, data: mealSchema, createdAt: timestamp }))
      .max(50000),
    nutritionTargets: z.object({ id: z.literal(1), data: nutritionTargetsSchema, updatedAt: timestamp }).nullable(),
    activities: z
      .array(z.object({ id, date: nutritionDateSchema, data: activitySchema, createdAt: timestamp }))
      .max(50000),
    coachSetup: z
      .object({
        id: z.literal(1),
        intake: coachIntakeSchema,
        proposal: coachPlanSchema.nullable(),
        appliedAt: timestamp.nullable(),
        updatedAt: timestamp,
      })
      .nullable(),
  })
  .superRefine((snapshot, ctx) => {
    const sessionIds = new Set(snapshot.sessions.map((row) => row.id));
    for (const table of [
      'programs',
      'sessions',
      'sessionSets',
      'mealTemplates',
      'mealEntries',
      'activities',
    ] as const) {
      const keys = snapshot[table].map((row) => row.id);
      if (new Set(keys).size !== keys.length) ctx.addIssue({ code: 'custom', message: `IDs repetidos em ${table}.` });
    }
    if (snapshot.sessionSets.some((row) => !sessionIds.has(row.sessionId)))
      ctx.addIssue({ code: 'custom', message: 'Existem séries sem uma sessão correspondente.' });
    if (snapshot.programs.filter((row) => row.active).length > 1)
      ctx.addIssue({ code: 'custom', message: 'Existe mais de um programa ativo.' });
    if (snapshot.sessions.filter((row) => row.finishedAt === null).length > 1)
      ctx.addIssue({ code: 'custom', message: 'Existe mais de um treino em andamento.' });
    if (snapshot.activities.some((row) => row.date !== row.data.date))
      ctx.addIssue({ code: 'custom', message: 'Data da atividade inconsistente.' });
  });
export type CloudSnapshot = z.infer<typeof cloudSnapshotSchema>;
export const cloudUploadSchema = z.object({ revision: z.number().int().nonnegative(), snapshot: cloudSnapshotSchema });
export const cloudRecordSchema = z.object({
  revision: z.number().int().nonnegative(),
  snapshot: cloudSnapshotSchema.nullable(),
  updatedAt: timestamp.nullable(),
});
export type CloudRecord = z.infer<typeof cloudRecordSchema>;
