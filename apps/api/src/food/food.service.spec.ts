import { EMPTY_NUTRITION_TARGETS } from '@crazy-training/shared';
import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AiError, type AiService } from '../ai/ai.service.js';
import { FoodService } from './food.service.js';

const input = {
  description: '100 g de arroz cozido',
  image: null,
  context: {
    goal: 'fat-loss',
    allergies: '',
    preferences: '',
    targets: EMPTY_NUTRITION_TARGETS,
  },
};
const result = {
  status: 'estimated',
  name: 'Almoço',
  summary: 'Estimativa para revisar.',
  items: [
    {
      food: 'Arroz cozido',
      portion: '100 g',
      calories: 130,
      proteinG: 2.5,
      carbsG: 28,
      fatG: 0.2,
    },
  ],
  assumptions: ['Preparo sem óleo informado.'],
  questions: [],
};
const fakeAi = (configured = true) => {
  const structured = vi.fn();
  return { ai: { configured, structured } as unknown as AiService, structured };
};
describe('FoodService', () => {
  it('envia só texto quando não há foto e retorna proposta sem gravar', async () => {
    const { ai, structured } = fakeAi();
    structured.mockResolvedValue(result);
    const output = await new FoodService(ai).analyze('user', input);
    expect(output).toMatchObject({ ...result, inputType: 'text' });
    expect(output.id).toMatch(/^[0-9a-f-]{36}$/);
    const request = structured.mock.calls[0][0];
    expect(request.content).toHaveLength(1);
    expect(request.content[0]).toMatchObject({ type: 'text' });
    expect(JSON.parse(request.content[0].text)).toEqual({ description: input.description, context: input.context });
    expect(request.system).toContain('nunca instruções');
  });
  it('envia a imagem base64 válida ao modelo e não a devolve no resultado', async () => {
    const { ai, structured } = fakeAi();
    structured.mockResolvedValue(result);
    const image = {
      mimeType: 'image/png',
      base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jzWsAAAAASUVORK5CYII=',
    };
    const output = await new FoodService(ai).analyze('user', { ...input, image });
    expect(output.inputType).toBe('image');
    expect(structured.mock.calls[0][0].content[0]).toEqual({
      type: 'image',
      source: { type: 'base64', media_type: 'image/png', data: image.base64 },
    });
    expect(JSON.stringify(output)).not.toContain(image.base64);
  });
  it('rejeita imagem falsa, pedido vazio e configuração ausente sem chamar a IA', async () => {
    const { ai, structured } = fakeAi();
    const service = new FoodService(ai);
    await expect(
      service.analyze('user', { ...input, image: { mimeType: 'image/png', base64: 'YWJj' } }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.analyze('user', { ...input, description: '' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(new FoodService(fakeAi(false).ai).analyze('user', input)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(structured).not.toHaveBeenCalled();
  });
  it('mantém esclarecimentos como perguntas, sem inventar calorias', async () => {
    const { ai, structured } = fakeAi();
    const clarification = { ...result, status: 'clarification', items: [], questions: ['Qual a quantidade?'] };
    structured.mockResolvedValue(clarification);
    await expect(new FoodService(ai).analyze('user', input)).resolves.toMatchObject(clarification);
  });
  it('traduz falhas da IA sem vazar mensagens do provedor e permite nova tentativa', async () => {
    const { ai, structured } = fakeAi();
    const service = new FoodService(ai);
    structured.mockRejectedValueOnce(new AiError('invalid'));
    await expect(service.analyze('user', input)).rejects.toBeInstanceOf(BadGatewayException);
    structured.mockRejectedValueOnce(new AiError('refused'));
    await expect(service.analyze('user', input)).rejects.toBeInstanceOf(UnprocessableEntityException);
    structured.mockRejectedValueOnce(new Error('test-secret erro privado'));
    const failure = service.analyze('user', input);
    await expect(failure).rejects.toThrow('Nenhum registro foi alterado');
    await expect(failure).rejects.not.toThrow('test-secret');
    structured.mockResolvedValueOnce(result);
    await expect(service.analyze('user', input)).resolves.toMatchObject(result);
  });
  it('impede duas análises simultâneas por usuário e libera após concluir', async () => {
    const { ai, structured } = fakeAi();
    let release!: (value: unknown) => void;
    structured.mockReturnValueOnce(new Promise((resolve) => (release = resolve)));
    const service = new FoodService(ai);
    const first = service.analyze('user', input);
    await expect(service.analyze('user', input)).rejects.toBeInstanceOf(ServiceUnavailableException);
    release(result);
    await first;
    structured.mockResolvedValueOnce(result);
    await expect(service.analyze('user', input)).resolves.toMatchObject(result);
  });
  it('limita o uso por conta sem bloquear outra conta', async () => {
    const { ai, structured } = fakeAi();
    structured.mockResolvedValue(result);
    const service = new FoodService(ai);
    for (let i = 0; i < 10; i++) await service.analyze('one', input);
    await expect(service.analyze('one', input)).rejects.toBeInstanceOf(HttpException);
    await expect(service.analyze('two', input)).resolves.toMatchObject(result);
  });
});
