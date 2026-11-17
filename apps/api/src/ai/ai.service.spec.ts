import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

import type { Env } from '../config/env.js';
import { AiError, AiService } from './ai.service.js';

const env: Env = {
  NODE_ENV: 'test',
  PORT: 3000,
  DATABASE_URL: 'postgres://localhost/test',
  ANTHROPIC_API_KEY: 'test-secret',
  AI_MODEL: 'claude-opus-5-5',
};
const schema = z.object({ name: z.string().min(1), total: z.number().min(0) });
const message = (text: string, stop_reason = 'end_turn') => ({
  content: [
    { type: 'thinking', thinking: '' },
    { type: 'text', text },
  ],
  stop_reason,
});
const fakeClient = () => {
  const stream = vi.fn();
  const client = { beta: { messages: { stream } } } as unknown as Anthropic;
  const respond = (value: unknown) => stream.mockReturnValueOnce({ finalMessage: () => Promise.resolve(value) });
  return { client, stream, respond };
};
const request = {
  system: 'Regras',
  content: [{ type: 'text' as const, text: 'dados' }],
  schema,
  effort: 'medium' as const,
  maxTokens: 1000,
  timeoutMs: 5000,
};

describe('AiService', () => {
  it('chama o modelo configurado com saída estruturada e fallback, e valida a resposta', async () => {
    const { client, stream, respond } = fakeClient();
    respond(message('{"name":"Arroz","total":130}'));
    await expect(new AiService(env, client).structured(request)).resolves.toEqual({ name: 'Arroz', total: 130 });
    const [params, options] = stream.mock.calls[0];
    expect(params).toMatchObject({
      model: 'claude-opus-5-5',
      max_tokens: 1000,
      system: 'Regras',
      messages: [{ role: 'user', content: request.content }],
      output_config: { effort: 'medium', format: { type: 'json_schema' } },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    });
    expect(options).toEqual({ timeout: 5000 });
    expect(JSON.stringify(params)).not.toContain('test-secret');
  });
  it('classifica recusa, resposta cortada e resposta fora do schema', async () => {
    const { client, respond } = fakeClient();
    const service = new AiService(env, client);
    respond(message('', 'refusal'));
    await expect(service.structured(request)).rejects.toMatchObject({ reason: 'refused' });
    respond(message('{"name":"Arr', 'max_tokens'));
    await expect(service.structured(request)).rejects.toMatchObject({ reason: 'invalid' });
    respond(message('{"name":"","total":-1}'));
    await expect(service.structured(request)).rejects.toMatchObject({ reason: 'invalid' });
    respond(message('não é JSON'));
    await expect(service.structured(request)).rejects.toMatchObject({ reason: 'invalid' });
  });
  it('separa limite de uso de outras falhas de rede ou da API', async () => {
    const { client, stream } = fakeClient();
    const service = new AiService(env, client);
    stream.mockImplementationOnce(() => {
      throw new Anthropic.RateLimitError(429, undefined, 'limite', new Headers());
    });
    await expect(service.structured(request)).rejects.toMatchObject({ reason: 'busy' });
    stream.mockReturnValueOnce({ finalMessage: () => Promise.reject(new Error('test-secret rede')) });
    const failure = service.structured(request);
    await expect(failure).rejects.toBeInstanceOf(AiError);
    await expect(failure).rejects.toMatchObject({ reason: 'upstream' });
  });
  it('sem chave configurada não chama a API', async () => {
    const service = new AiService(env, null);
    expect(service.configured).toBe(false);
    await expect(service.structured(request)).rejects.toMatchObject({ reason: 'unconfigured' });
  });
});
