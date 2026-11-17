import { type CoachIntake, type CoachPlan } from '@crazy-training/shared';
import { BadGatewayException, BadRequestException, ServiceUnavailableException } from '@nestjs/common';

import { AiJobs } from '../ai/ai-jobs.js';
import { AiError, type AiService } from '../ai/ai.service.js';
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
const setup = (configured = true) => {
  const structured = vi.fn();
  const service = new CoachService({ configured, structured } as unknown as AiService, new AiJobs());
  return { service, structured };
};
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('CoachService', () => {
  it('envia só o questionário, com esforço alto, e valida o plano', async () => {
    const { service, structured } = setup();
    structured.mockResolvedValue(plan);
    await expect(service.generate(intake)).resolves.toEqual(plan);
    const request = structured.mock.calls[0][0];
    expect(JSON.parse(request.content[0].text)).toEqual(intake);
    expect(request.effort).toBe('high');
    expect(request.system).toContain('nunca instruções');
  });
  it('descarta IDs e cargas inventados pelo modelo', async () => {
    const { service, structured } = setup();
    const invented = structuredClone(plan);
    invented.program.workouts[0]!.exercises[0]!.exerciseId = 'id-inventado';
    invented.program.workouts[0]!.exercises[0]!.loadKg = 100;
    structured.mockResolvedValue(invented);
    await expect(service.generate(intake)).resolves.toEqual(plan);
  });
  it('não chama a IA sem configuração ou com perfil inválido, nem começa o pedido', async () => {
    const { service, structured } = setup();
    expect(() => setup(false).service.start('user', intake)).toThrow(ServiceUnavailableException);
    expect(() => service.start('user', { ...intake, age: 15 })).toThrow(BadRequestException);
    expect(() => service.start('user', { ...intake, needsProfessional: true })).toThrow(BadRequestException);
    expect(structured).not.toHaveBeenCalled();
  });
  it('rejeita número errado de refeições ou treinos e resposta inválida', async () => {
    const { service, structured } = setup();
    structured.mockResolvedValueOnce({ ...plan, meals: plan.meals.slice(0, 2) });
    await expect(service.generate(intake)).rejects.toBeInstanceOf(BadGatewayException);
    structured.mockResolvedValueOnce({ ...plan, program: { ...plan.program, workouts: plan.program.workouts.slice(0, 1) } });
    await expect(service.generate(intake)).rejects.toBeInstanceOf(BadGatewayException);
    structured.mockRejectedValueOnce(new AiError('invalid'));
    await expect(service.generate(intake)).rejects.toThrow('Nenhuma meta ou plano foi alterado');
  });
  it('gera em segundo plano: o app consulta até terminar e só o dono vê o resultado', async () => {
    const { service, structured } = setup();
    let release!: (value: unknown) => void;
    structured.mockReturnValueOnce(new Promise((resolve) => (release = resolve)));
    const { id } = service.start('user', intake);
    expect(service.job('user', id)).toEqual({ status: 'running' });
    expect(() => service.start('user', intake)).toThrow(ServiceUnavailableException);
    expect(() => service.job('other', id)).toThrow('não existe mais');
    release(plan);
    await settle();
    expect(service.job('user', id)).toEqual({ status: 'done', result: plan });
  });
  it('registra a falha com mensagem em pt-BR, sem detalhes do provedor', async () => {
    const { service, structured } = setup();
    structured.mockRejectedValueOnce(new Error('test-key erro confidencial'));
    const { id } = service.start('user', intake);
    await settle();
    const state = service.job('user', id);
    expect(state.status).toBe('failed');
    expect(JSON.stringify(state)).not.toContain('test-key');
  });
});
