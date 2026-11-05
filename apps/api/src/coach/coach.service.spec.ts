import { type CoachIntake, type CoachPlan } from '@crazy-training/shared';
import { BadGatewayException, BadRequestException, ServiceUnavailableException } from '@nestjs/common';

import type { Env } from '../config/env.js';
import { CoachService } from './coach.service.js';

const intake: CoachIntake = {
  profile: {
    weightKg: 85,
    heightCm: 178,
    birthYear: 1995,
    goal: 'fat-loss',
    level: 'beginner',
    daysPerWeek: 3,
    equipment: 'gym',
  },
  age: 31,
  sex: 'male',
  routine: 'light',
  mealsPerDay: 4,
  preferences: 'Comida caseira',
  allergies: 'Nenhuma',
  limitations: '',
  needsProfessional: false,
};
const plan: CoachPlan = {
  summary: 'Sugestão de teste',
  assumptions: ['Estimativa de teste'],
  targets: { calories: 2000, proteinG: 150, carbsG: 215, fatG: 60 },
  meals: Array.from({ length: 4 }, (_, i) => ({
    name: `Refeição ${i + 1}`,
    time: null,
    description: 'Porções de teste',
    calories: 500,
    proteinG: 37.5,
    carbsG: 53.75,
    fatG: 15,
  })),
  program: {
    formatVersion: 1,
    name: 'Programa de teste',
    source: 'ai-generated',
    workouts: Array.from({ length: 3 }, (_, i) => ({
      name: `Treino ${i + 1}`,
      modality: 'strength',
      exercises: [{ name: 'Agachamento', sets: 3, reps: { type: 'fixed', value: 10 } }],
    })),
  },
};
const env: Env = {
  NODE_ENV: 'test',
  PORT: 3000,
  DATABASE_URL: 'postgres://localhost/test',
  COACH_PROVIDER: 'openai',
  OPENAI_API_KEY: 'test-key',
  COACH_MODEL: 'test-model',
};
const response = (value: unknown) =>
  new Response(
    JSON.stringify({
      status: 'completed',
      output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(value) }] }],
    }),
    { status: 200 },
  );

describe('CoachService', () => {
  const mockFetch = vi.fn();
  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('valida a resposta e mantém a chave apenas na chamada do servidor', async () => {
    mockFetch.mockResolvedValue(response(plan));
    await expect(new CoachService(env).generate(intake)).resolves.toEqual(plan);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.store).toBe(false);
    expect(JSON.parse(body.input)).toEqual(intake);
    expect(JSON.stringify(body)).not.toContain('test-key');
  });
  it('descarta IDs e cargas inventados pelo modelo', async () => {
    const invented = structuredClone(plan);
    invented.program.workouts[0]!.exercises[0]!.exerciseId = 'id-inventado';
    invented.program.workouts[0]!.exercises[0]!.loadKg = 100;
    mockFetch.mockResolvedValue(response(invented));
    await expect(new CoachService(env).generate(intake)).resolves.toEqual(plan);
  });
  it('não chama o provedor sem configuração ou com perfil inválido', async () => {
    await expect(new CoachService({ ...env, OPENAI_API_KEY: undefined }).generate(intake)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await expect(new CoachService(env).generate({ ...intake, age: 15 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(new CoachService(env).generate({ ...intake, needsProfessional: true })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });
  it('rejeita JSON inválido, dados incompletos e número errado de refeições', async () => {
    for (const invalid of [
      {},
      { ...plan, meals: plan.meals.slice(0, 2) },
      { ...plan, targets: { ...plan.targets, calories: 500 } },
    ]) {
      mockFetch.mockResolvedValueOnce(response(invalid));
      await expect(new CoachService(env).generate(intake)).rejects.toBeInstanceOf(BadGatewayException);
    }
  });
  it('não revela erro nem credenciais do provedor e permite nova tentativa', async () => {
    const service = new CoachService(env);
    mockFetch.mockRejectedValueOnce(new Error('test-key erro confidencial'));
    await expect(service.generate(intake)).rejects.toThrow('Não foi possível validar');
    mockFetch.mockResolvedValueOnce(response(plan));
    await expect(service.generate(intake)).resolves.toEqual(plan);
  });
  it('limita a uma geração por vez', async () => {
    let release!: (response: Response) => void;
    mockFetch.mockReturnValue(
      new Promise<Response>((resolve) => {
        release = resolve;
      }),
    );
    const service = new CoachService(env);
    const first = service.generate(intake);
    await expect(service.generate(intake)).rejects.toBeInstanceOf(ServiceUnavailableException);
    release(response(plan));
    await expect(first).resolves.toEqual(plan);
  });
});
