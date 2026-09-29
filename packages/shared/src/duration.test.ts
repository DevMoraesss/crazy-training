import { describe, expect, it } from 'vitest';

import { estimateSetSeconds, estimateWorkoutMinutes } from './duration';

describe('estimateWorkoutMinutes', () => {
  it('soma séries, descansos entre elas e a troca de exercício', () => {
    // 4 × 30 s de série + 3 × 90 s de descanso + 60 s de troca = 450 s
    const minutes = estimateWorkoutMinutes({
      exercises: [{ name: 'Supino', sets: 4, reps: { type: 'fixed', value: 10 }, restSeconds: 90 }],
    });
    expect(minutes).toBe(8);
  });

  it('usa 60 s de descanso quando o treino não diz', () => {
    const minutes = estimateWorkoutMinutes({
      exercises: [{ name: 'Prancha', sets: 3, reps: { type: 'time', seconds: 60 } }],
    });
    // 3 × 60 + 2 × 60 + 60 = 360 s
    expect(minutes).toBe(6);
  });
});

describe('estimateSetSeconds', () => {
  it('usa a média da faixa de repetições', () => {
    expect(estimateSetSeconds({ type: 'range', min: 8, max: 12 })).toBe(30);
  });
});
