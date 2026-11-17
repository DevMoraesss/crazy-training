import { EMPTY_NUTRITION_TARGETS } from '@crazy-training/shared';
import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Env } from '../config/env.js';
import { FoodService } from './food.service.js';

const env: Env = {
  NODE_ENV: 'test',
  PORT: 3000,
  DATABASE_URL: 'postgres://localhost/test',
  COACH_PROVIDER: 'openai',
  COACH_MODEL: 'test-model',
  OPENAI_API_KEY: 'test-secret',
};
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
const respond = (value: unknown) =>
  new Response(
    JSON.stringify({
      status: 'completed',
      output: [
        {
          type: 'message',
          content: [{ type: 'output_text', text: JSON.stringify(value) }],
        },
      ],
    }),
    { status: 200 },
  );
describe('FoodService', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());
  it('usa saída estruturada, mantém a chave no servidor e retorna proposta sem gravar', async () => {
    fetchMock.mockResolvedValue(respond(result));
    const output = await new FoodService(env).analyze('user', input);
    expect(output).toMatchObject({ ...result, inputType: 'text' });
    expect(output.id).toMatch(/^[0-9a-f-]{36}$/);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.store).toBe(false);
    expect(body.text.format).toMatchObject({
      type: 'json_schema',
      strict: true,
      schema: { additionalProperties: false },
    });
    expect(body.input[0].content).toHaveLength(1);
    expect(JSON.stringify(body)).not.toContain('test-secret');
    expect(JSON.stringify(output)).not.toContain('test-secret');
  });
  it('envia imagem base64 válida somente ao provedor', async () => {
    fetchMock.mockResolvedValue(respond(result));
    const image = {
      mimeType: 'image/png',
      base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jzWsAAAAASUVORK5CYII=',
    };
    const output = await new FoodService(env).analyze('user', {
      ...input,
      image,
    });
    expect(output.inputType).toBe('image');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).input[0].content[1].image_url).toBe(
      `data:image/png;base64,${image.base64}`,
    );
    expect(JSON.stringify(output)).not.toContain(image.base64);
  });
  it('rejeita imagem falsa, pedido vazio e configuração ausente sem chamar o provedor', async () => {
    const service = new FoodService(env);
    await expect(
      service.analyze('user', {
        ...input,
        image: { mimeType: 'image/png', base64: 'YWJj' },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.analyze('user', { ...input, description: '' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      new FoodService({ ...env, OPENAI_API_KEY: undefined }).analyze('user', input),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('mantém esclarecimentos como perguntas, sem inventar calorias', async () => {
    const clarification = {
      ...result,
      status: 'clarification',
      items: [],
      questions: ['Qual a quantidade?'],
    };
    fetchMock.mockResolvedValue(respond(clarification));
    await expect(new FoodService(env).analyze('user', input)).resolves.toMatchObject(clarification);
  });
  it('rejeita resposta inválida ou recusada e não vaza mensagens do provedor', async () => {
    const service = new FoodService(env);
    for (const invalid of [{}, { ...result, items: [] }]) {
      fetchMock.mockResolvedValueOnce(respond(invalid));
      await expect(service.analyze('user', input)).rejects.toBeInstanceOf(BadGatewayException);
    }
    fetchMock.mockRejectedValueOnce(new Error('test-secret erro privado'));
    await expect(service.analyze('user', input)).rejects.toThrow('Nenhum registro foi alterado');
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: 'completed',
          output: [
            {
              type: 'message',
              content: [{ type: 'refusal', refusal: 'Recusa' }],
            },
          ],
        }),
      ),
    );
    await expect(service.analyze('user', input)).rejects.toBeInstanceOf(BadGatewayException);
    fetchMock.mockResolvedValueOnce(respond(result));
    await expect(service.analyze('user', input)).resolves.toMatchObject(result);
  });
  it('impede duas análises simultâneas por usuário e libera após concluir', async () => {
    let release!: (response: Response) => void;
    fetchMock.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        release = resolve;
      }),
    );
    const service = new FoodService(env);
    const first = service.analyze('user', input);
    await expect(service.analyze('user', input)).rejects.toBeInstanceOf(ServiceUnavailableException);
    release(respond(result));
    await first;
    fetchMock.mockResolvedValueOnce(respond(result));
    await expect(service.analyze('user', input)).resolves.toMatchObject(result);
  });
  it('limita o uso por conta sem bloquear outra conta', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(respond(result)));
    const service = new FoodService(env);
    for (let i = 0; i < 10; i++) await service.analyze('one', input);
    await expect(service.analyze('one', input)).rejects.toBeInstanceOf(HttpException);
    await expect(service.analyze('two', input)).resolves.toMatchObject(result);
  });
});
