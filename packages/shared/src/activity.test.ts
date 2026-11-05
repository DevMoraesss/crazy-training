import { describe, expect, it } from 'vitest';
import { activeDateKeys, activitySchema, weekDateKeys } from './activity';

describe('dias ativos', () => {
  it('conta corrida e musculação no mesmo dia uma única vez e ignora sessões abertas', () => {
    const dates = activeDateKeys(
      [{ date: '2026-11-04' }, { date: '2026-11-04' }, { date: '2026-11-03' }],
      [{ finishedAt: new Date(2026, 10, 4, 20) }, { finishedAt: null }],
    );
    expect([...dates].sort()).toEqual(['2026-11-03', '2026-11-04']);
  });
  it('calcula a semana atravessando meses e anos', () => {
    expect(weekDateKeys(new Date(2027, 0, 3))).toEqual([
      '2026-12-28',
      '2026-12-29',
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
      '2027-01-03',
    ]);
  });
  it('rejeita data impossível, duração vazia e distância negativa', () => {
    const valid = { date: '2026-11-04', type: 'running', durationMinutes: 30, distanceKm: null, notes: '' };
    expect(activitySchema.safeParse(valid).success).toBe(true);
    for (const invalid of [{ date: '2026-02-30' }, { durationMinutes: 0 }, { distanceKm: -1 }]) {
      expect(activitySchema.safeParse({ ...valid, ...invalid }).success).toBe(false);
    }
  });
});
