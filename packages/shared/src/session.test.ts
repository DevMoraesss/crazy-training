import { describe, expect, it } from 'vitest';

import { parseProgramCsv } from './csv';
import { buildImportPrompt } from './import-prompt';
import { bodyMassIndex } from './profile';
import { exerciseKey, nextWorkoutIndex, sessionPosition, suggestedReps, summarizeSets } from './session';

const plan = {
  exercises: [
    { name: 'Supino', sets: 2, reps: { type: 'fixed' as const, value: 10 } },
    { name: 'Crucifixo', sets: 1, reps: { type: 'fixed' as const, value: 12 } },
    { name: 'Tríceps', sets: 2, reps: { type: 'fixed' as const, value: 12 } },
  ],
};

describe('sessionPosition', () => {
  it('começa na primeira série do primeiro exercício', () => {
    expect(sessionPosition(plan, [], [])).toEqual({ exerciseIndex: 0, setNumber: 1 });
  });

  it('avança série a série e depois para o próximo exercício', () => {
    expect(sessionPosition(plan, [{ exerciseIndex: 0 }], [])).toEqual({ exerciseIndex: 0, setNumber: 2 });
    expect(sessionPosition(plan, [{ exerciseIndex: 0 }, { exerciseIndex: 0 }], [])).toEqual({
      exerciseIndex: 1,
      setNumber: 1,
    });
  });

  it('ignora exercícios pulados', () => {
    expect(sessionPosition(plan, [{ exerciseIndex: 0 }, { exerciseIndex: 0 }], [1])).toEqual({
      exerciseIndex: 2,
      setNumber: 1,
    });
  });

  it('retorna null quando tudo foi feito ou pulado', () => {
    const sets = [{ exerciseIndex: 0 }, { exerciseIndex: 0 }, { exerciseIndex: 1 }];
    expect(sessionPosition(plan, sets, [2])).toBeNull();
  });
});

describe('nextWorkoutIndex', () => {
  const program = { workouts: [plan, plan, plan].map((workout, i) => ({ ...workout, name: `T${i}`, modality: 'strength' as const })) };

  it('começa pelo primeiro treino', () => {
    expect(nextWorkoutIndex(program, null)).toBe(0);
  });

  it('segue o rodízio e volta ao início', () => {
    expect(nextWorkoutIndex(program, 0)).toBe(1);
    expect(nextWorkoutIndex(program, 2)).toBe(0);
  });

  it('continua o rodízio mesmo se o programa encolheu', () => {
    expect(nextWorkoutIndex(program, 7)).toBe(2);
  });
});

describe('summarizeSets', () => {
  it('soma séries, repetições e volume', () => {
    expect(
      summarizeSets([
        { exerciseIndex: 0, reps: 10, loadKg: 40 },
        { exerciseIndex: 0, reps: 8, loadKg: 42.5 },
        { exerciseIndex: 1, reps: 12, loadKg: null },
      ]),
    ).toEqual({ exercises: 2, sets: 3, reps: 30, volumeKg: 740 });
  });
});

describe('exerciseKey', () => {
  it('usa o ID do catálogo quando existe', () => {
    expect(exerciseKey({ exerciseId: 'supino-reto-barra', name: 'Supino' })).toBe('supino-reto-barra');
  });

  it('sem ID, usa o nome sem acento nem caixa', () => {
    expect(exerciseKey({ name: '  Tríceps  Corda ' })).toBe(exerciseKey({ name: 'triceps corda' }));
  });
});

describe('suggestedReps', () => {
  it('usa o topo da faixa e os segundos em exercícios por tempo', () => {
    expect(suggestedReps({ type: 'range', min: 8, max: 12 })).toBe(12);
    expect(suggestedReps({ type: 'time', seconds: 30 })).toBe(30);
  });
});

describe('buildImportPrompt', () => {
  it('o exemplo do prompt é um CSV que o app aceita', () => {
    const prompt = buildImportPrompt();
    const example = prompt.slice(prompt.lastIndexOf('treino,foco'));
    const result = parseProgramCsv(example, { name: 'Exemplo' });
    expect(result.ok).toBe(true);
  });
});

describe('bodyMassIndex', () => {
  it('peso / altura²', () => {
    expect(bodyMassIndex(80, 180)).toBe(24.7);
  });
});
