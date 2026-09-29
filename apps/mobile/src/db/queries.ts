import {
  EMPTY_PROFILE,
  exerciseKey,
  type Profile,
  type Program,
  type Workout,
} from '@crazy-training/shared';
import { and, asc, desc, eq, isNotNull, isNull, ne, sql } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { randomUUID } from 'expo-crypto';
import { useEffect, useState } from 'react';

import { db } from './client';
import { profile, programs, sessions, sessionSets } from './schema';

// Leituras reativas (use*) re-renderizam a tela quando a tabela muda. Escritas são funções async.

// ---------- Perfil ----------

export function useProfile(): Profile {
  const { data } = useLiveQuery(db.select().from(profile).where(eq(profile.id, 1)));
  const row = data[0];
  if (!row) return EMPTY_PROFILE;
  const { id: _id, updatedAt: _updatedAt, ...values } = row;
  return values;
}

export async function getProfile(): Promise<Profile> {
  const row = await db.query.profile.findFirst({ where: eq(profile.id, 1) });
  if (!row) return EMPTY_PROFILE;
  const { id: _id, updatedAt: _updatedAt, ...values } = row;
  return values;
}

export async function saveProfile(changes: Partial<Profile>) {
  const values = { ...changes, updatedAt: new Date() };
  await db
    .insert(profile)
    .values({ ...EMPTY_PROFILE, ...values, id: 1 })
    .onConflictDoUpdate({ target: profile.id, set: values });
}

// ---------- Programas ----------

export function usePrograms() {
  return useLiveQuery(db.select().from(programs).orderBy(desc(programs.active), asc(programs.createdAt))).data;
}

/** loaded distingue 'ainda carregando' de 'o programa não existe (foi apagado)'. */
export function useProgram(id: string | undefined) {
  const { data, updatedAt } = useLiveQuery(db.select().from(programs).where(eq(programs.id, id ?? '')), [id]);
  return { program: data[0], loaded: updatedAt !== undefined };
}

export function useActiveProgram() {
  return useLiveQuery(db.select().from(programs).where(eq(programs.active, true)).limit(1)).data[0];
}

/** Cria o programa. Vira o ativo se pedido ou se ainda não houver um ativo. */
export async function createProgram(program: Program, options: { activate?: boolean } = {}): Promise<string> {
  const id = randomUUID();
  const now = new Date();
  const hasActive = await db.query.programs.findFirst({ where: eq(programs.active, true) });
  const activate = options.activate ?? !hasActive;
  // Transações do Drizzle no expo-sqlite são síncronas: dentro delas, .run() e nada de await.
  db.transaction((tx) => {
    if (activate) tx.update(programs).set({ active: false }).run();
    tx.insert(programs).values({ id, data: program, active: activate, createdAt: now, updatedAt: now }).run();
  });
  return id;
}

/** Edita o programa aplicando uma função sobre a versão salva. */
export async function updateProgram(id: string, update: (program: Program) => Program) {
  const row = await db.query.programs.findFirst({ where: eq(programs.id, id) });
  if (!row) return;
  await db.update(programs).set({ data: update(row.data), updatedAt: new Date() }).where(eq(programs.id, id));
}

export async function setActiveProgram(id: string) {
  db.transaction((tx) => {
    tx.update(programs).set({ active: false }).run();
    tx.update(programs).set({ active: true }).where(eq(programs.id, id)).run();
  });
}

/** Apaga o programa. O histórico continua, porque cada sessão tem a própria cópia do treino. */
export async function deleteProgram(id: string) {
  await db.delete(programs).where(eq(programs.id, id));
}

// ---------- Sessões ----------

export function useUnfinishedSession() {
  return useLiveQuery(
    db.select().from(sessions).where(isNull(sessions.finishedAt)).orderBy(desc(sessions.startedAt)).limit(1),
  ).data[0];
}

/** Última sessão concluída do programa: define qual treino vem agora no rodízio. */
export function useLastFinishedSession(programId: string | undefined) {
  return useLiveQuery(
    db
      .select()
      .from(sessions)
      .where(and(eq(sessions.programId, programId ?? ''), isNotNull(sessions.finishedAt)))
      .orderBy(desc(sessions.finishedAt))
      .limit(1),
    [programId],
  ).data[0];
}

export function useSession(id: string | undefined) {
  const { data, updatedAt } = useLiveQuery(db.select().from(sessions).where(eq(sessions.id, id ?? '')), [id]);
  return { session: data[0], loaded: updatedAt !== undefined };
}

export function useSessionSets(sessionId: string | undefined) {
  return useLiveQuery(
    db
      .select()
      .from(sessionSets)
      .where(eq(sessionSets.sessionId, sessionId ?? ''))
      .orderBy(asc(sessionSets.completedAt)),
    [sessionId],
  ).data;
}

/** Sessões concluídas, da mais recente para a mais antiga, com os totais de cada uma. */
export function useFinishedSessions() {
  const list = useLiveQuery(
    db.select().from(sessions).where(isNotNull(sessions.finishedAt)).orderBy(desc(sessions.finishedAt)),
  ).data;
  const totals = useLiveQuery(
    db
      .select({
        sessionId: sessionSets.sessionId,
        sets: sql<number>`count(*)`,
        volumeKg: sql<number>`coalesce(sum(${sessionSets.reps} * coalesce(${sessionSets.loadKg}, 0)), 0)`,
      })
      .from(sessionSets)
      .groupBy(sessionSets.sessionId),
  ).data;
  const bySession = new Map(totals.map((row) => [row.sessionId, row]));
  return list.map((session) => ({
    ...session,
    sets: bySession.get(session.id)?.sets ?? 0,
    volumeKg: bySession.get(session.id)?.volumeKg ?? 0,
  }));
}

export async function startSession(programId: string, workoutIndex: number, plan: Workout): Promise<string> {
  const id = randomUUID();
  await db.insert(sessions).values({ id, programId, workoutIndex, plan, startedAt: new Date() });
  return id;
}

export async function recordSet(values: {
  sessionId: string;
  exerciseIndex: number;
  plan: Workout;
  setNumber: number;
  reps: number;
  loadKg: number | null;
}) {
  const exercise = values.plan.exercises[values.exerciseIndex];
  if (!exercise) return;
  await db.insert(sessionSets).values({
    sessionId: values.sessionId,
    exerciseIndex: values.exerciseIndex,
    exerciseKey: exerciseKey(exercise),
    setNumber: values.setNumber,
    reps: values.reps,
    loadKg: values.loadKg,
    completedAt: new Date(),
  });
}

/** Desfaz a última série registrada na sessão (toque errado em "Concluir série"). */
export async function undoLastSet(sessionId: string) {
  const last = await db.query.sessionSets.findFirst({
    where: eq(sessionSets.sessionId, sessionId),
    orderBy: desc(sessionSets.id),
  });
  if (last) await db.delete(sessionSets).where(eq(sessionSets.id, last.id));
}

export async function skipExercise(sessionId: string, exerciseIndex: number) {
  const session = await db.query.sessions.findFirst({ where: eq(sessions.id, sessionId) });
  if (!session || session.skipped.includes(exerciseIndex)) return;
  await db
    .update(sessions)
    .set({ skipped: [...session.skipped, exerciseIndex] })
    .where(eq(sessions.id, sessionId));
}

export async function finishSession(sessionId: string, calories: number | null) {
  await db.update(sessions).set({ finishedAt: new Date(), calories }).where(eq(sessions.id, sessionId));
}

export async function deleteSession(sessionId: string) {
  db.transaction((tx) => {
    tx.delete(sessionSets).where(eq(sessionSets.sessionId, sessionId)).run();
    tx.delete(sessions).where(eq(sessions.id, sessionId)).run();
  });
}

/**
 * O que foi feito neste exercício na última sessão concluída (fora a atual): as séries, na ordem.
 * É o "na semana passada: 38 kg × 10" da tela de execução.
 */
export async function getLastPerformance(key: string, currentSessionId: string) {
  const [latest] = await db
    .select({ sessionId: sessionSets.sessionId })
    .from(sessionSets)
    .innerJoin(sessions, eq(sessions.id, sessionSets.sessionId))
    .where(and(eq(sessionSets.exerciseKey, key), ne(sessionSets.sessionId, currentSessionId), isNotNull(sessions.finishedAt)))
    .orderBy(desc(sessionSets.completedAt))
    .limit(1);
  if (!latest) return [];
  return db
    .select({ setNumber: sessionSets.setNumber, reps: sessionSets.reps, loadKg: sessionSets.loadKg })
    .from(sessionSets)
    .where(and(eq(sessionSets.sessionId, latest.sessionId), eq(sessionSets.exerciseKey, key)))
    .orderBy(asc(sessionSets.setNumber));
}

type PastSet = { setNumber: number; reps: number; loadKg: number | null };

/** getLastPerformance como hook, recarregado quando muda o exercício. */
export function useLastPerformance(key: string | null, currentSessionId: string): PastSet[] {
  const [state, setState] = useState<{ key: string; sets: PastSet[] } | null>(null);
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    void getLastPerformance(key, currentSessionId).then((sets) => {
      if (!cancelled) setState({ key, sets });
    });
    return () => {
      cancelled = true;
    };
  }, [key, currentSessionId]);
  return state && state.key === key ? state.sets : [];
}
