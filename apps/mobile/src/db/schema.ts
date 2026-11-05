import type { Equipment, Goal, Level, Meal, NutritionTargets, Program, Workout } from '@crazy-training/shared';
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Banco no aparelho (expo-sqlite). Depois de mudar este arquivo, gere a migração:
//   npm run db:generate -w @crazy-training/mobile
// O app aplica as migrações sozinho ao abrir (DatabaseGate).

/** Uma linha só (id = 1). */
export const profile = sqliteTable('profile', {
  id: integer('id').primaryKey(),
  weightKg: real('weight_kg'),
  heightCm: real('height_cm'),
  birthYear: integer('birth_year'),
  goal: text('goal').$type<Goal>(),
  level: text('level').$type<Level>(),
  daysPerWeek: integer('days_per_week'),
  equipment: text('equipment').$type<Equipment>(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

/** O programa inteiro fica no formato portátil do pacote shared (o mesmo do CSV e da IA). */
export const programs = sqliteTable('programs', {
  id: text('id').primaryKey(),
  data: text('data', { mode: 'json' }).$type<Program>().notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

/** Uma sessão guarda uma cópia do treino como estava ao começar: editar o programa não muda o histórico. */
export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    programId: text('program_id'),
    workoutIndex: integer('workout_index').notNull(),
    plan: text('plan', { mode: 'json' }).$type<Workout>().notNull(),
    skipped: text('skipped', { mode: 'json' })
      .$type<number[]>()
      .notNull()
      .$defaultFn(() => []),
    startedAt: integer('started_at', { mode: 'timestamp_ms' }).notNull(),
    /** null enquanto o treino está em andamento. */
    finishedAt: integer('finished_at', { mode: 'timestamp_ms' }),
    calories: integer('calories'),
  },
  (table) => [index('sessions_program_idx').on(table.programId, table.finishedAt)],
);

export const sessionSets = sqliteTable(
  'session_sets',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sessionId: text('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    exerciseIndex: integer('exercise_index').notNull(),
    /** exerciseKey() do shared: liga o mesmo exercício entre sessões e programas. */
    exerciseKey: text('exercise_key').notNull(),
    setNumber: integer('set_number').notNull(),
    /** Repetições; em exercício por tempo, os segundos. */
    reps: integer('reps').notNull(),
    loadKg: real('load_kg'),
    completedAt: integer('completed_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    index('session_sets_session_idx').on(table.sessionId),
    index('session_sets_exercise_idx').on(table.exerciseKey, table.completedAt),
  ],
);

export type ProgramRow = typeof programs.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
export type SessionSetRow = typeof sessionSets.$inferSelect;

/** Modelos reutilizáveis. O diário guarda uma cópia independente de cada refeição. */
export const mealTemplates = sqliteTable('meal_templates', {
  id: text('id').primaryKey(),
  data: text('data', { mode: 'json' }).$type<Meal>().notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const mealEntries = sqliteTable(
  'meal_entries',
  {
    id: text('id').primaryKey(),
    date: text('date').notNull(),
    data: text('data', { mode: 'json' }).$type<Meal>().notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('meal_entries_date_idx').on(table.date)],
);

export const nutritionTargets = sqliteTable('nutrition_targets', {
  id: integer('id').primaryKey(),
  data: text('data', { mode: 'json' }).$type<NutritionTargets>().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export type MealTemplateRow = typeof mealTemplates.$inferSelect;
export type MealEntryRow = typeof mealEntries.$inferSelect;

/** Atividades feitas fora da execução de uma sessão, como corrida e caminhada. */
export const activities = sqliteTable(
  'activities',
  {
    id: text('id').primaryKey(),
    date: text('date').notNull(),
    data: text('data', { mode: 'json' }).$type<import('@crazy-training/shared').Activity>().notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('activities_date_idx').on(table.date)],
);

/** Questionário e sugestão pendente sobrevivem a recarregamentos. */
export const coachSetup = sqliteTable('coach_setup', {
  id: integer('id').primaryKey(),
  intake: text('intake', { mode: 'json' }).$type<import('@crazy-training/shared').CoachIntake>().notNull(),
  proposal: text('proposal', { mode: 'json' }).$type<import('@crazy-training/shared').CoachPlan>(),
  appliedAt: integer('applied_at', { mode: 'timestamp_ms' }),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});
