import { describe, expect, it } from 'vitest';
import { cloudSnapshotSchema, cloudUploadSchema, loginSchema } from './cloud';

const empty = () => ({
  version: 2,
  nutritionDays: [],
  profile: null,
  programs: [],
  sessions: [],
  sessionSets: [],
  mealTemplates: [],
  mealEntries: [],
  nutritionTargets: null,
  activities: [],
  coachSetup: null,
});
const program = {
  id: 'draft',
  active: true,
  data: {
    formatVersion: 1,
    name: 'Rascunho',
    source: 'manual',
    workouts: [{ name: 'Treino A', modality: 'strength', exercises: [] }],
  },
  createdAt: '2026-11-05T12:00:00.000Z',
  updatedAt: '2026-11-05T12:00:00.000Z',
};
describe('transporte da conta', () => {
  it('lê v1 preservando refeições e rejeita escrita de clientes antigos', () => {
    const { nutritionDays: _days, ...legacy } = empty();
    const old = { ...legacy, version: 1, programs: [program] };
    const migrated = cloudSnapshotSchema.parse(old);
    expect(migrated.version).toBe(2);
    expect(migrated.nutritionDays).toEqual([]);
    expect(migrated.programs).toEqual([program]);
    expect(cloudUploadSchema.safeParse({ revision: 1, snapshot: old }).success).toBe(false);
  });
  it('transporta o fechamento do dia e rejeita datas duplicadas', () => {
    const day = {
      date: '2026-11-05',
      data: { complete: true, expenditureCalories: 2500, weightKg: 85 },
      updatedAt: '2026-11-05T12:00:00.000Z',
    };
    expect(cloudSnapshotSchema.parse({ ...empty(), nutritionDays: [day] }).nutritionDays).toEqual([day]);
    expect(cloudSnapshotSchema.safeParse({ ...empty(), nutritionDays: [day, day] }).success).toBe(false);
  });
  it('aceita um banco vazio e preserva rascunhos de treino', () => {
    expect(cloudSnapshotSchema.safeParse(empty()).success).toBe(true);
    expect(cloudSnapshotSchema.safeParse({ ...empty(), programs: [program] }).success).toBe(true);
  });
  it('rejeita séries órfãs e IDs duplicados', () => {
    const set = {
      id: 1,
      sessionId: 'missing',
      exerciseIndex: 0,
      exerciseKey: 'agachamento',
      setNumber: 1,
      reps: 10,
      loadKg: null,
      completedAt: '2026-11-05T12:00:00.000Z',
    };
    expect(cloudSnapshotSchema.safeParse({ ...empty(), sessionSets: [set] }).success).toBe(false);
    expect(
      cloudSnapshotSchema.safeParse({
        ...empty(),
        programs: [program, program],
      }).success,
    ).toBe(false);
  });
  it('não aceita mais de um programa ativo, nem revisão negativa', () => {
    expect(
      cloudSnapshotSchema.safeParse({
        ...empty(),
        programs: [program, { ...program, id: 'another' }],
      }).success,
    ).toBe(false);
    expect(cloudUploadSchema.safeParse({ revision: -1, snapshot: empty() }).success).toBe(false);
  });
  it('normaliza e-mail sem alterar a senha', () => {
    expect(loginSchema.parse({ email: 'Example@Example.test', password: ' AbCd ' })).toEqual({
      email: 'example@example.test',
      password: ' AbCd ',
    });
  });
});
