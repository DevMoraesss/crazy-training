import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import {
  BadGatewayException,
  Global,
  HttpException,
  Inject,
  Injectable,
  Module,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { z } from 'zod';

import { ENV, type Env } from '../config/env.js';

/** Cliente da API do Claude; null quando ANTHROPIC_API_KEY não está configurada. */
export const ANTHROPIC = Symbol('ANTHROPIC');

/** Falhas da IA já classificadas. As mensagens do provedor nunca chegam ao app. */
export class AiError extends Error {
  constructor(readonly reason: 'unconfigured' | 'refused' | 'invalid' | 'busy' | 'upstream') {
    super(reason);
  }
}

/** Converte a falha numa resposta HTTP em pt-BR. `invalid` é a mensagem para resposta inválida da IA. */
export function aiHttpError(error: unknown, invalid: string): HttpException {
  if (error instanceof HttpException) return error;
  if (!(error instanceof AiError)) return new BadGatewayException(invalid);
  switch (error.reason) {
    case 'unconfigured':
      return new ServiceUnavailableException('A IA ainda não está configurada no servidor.');
    case 'busy':
      return new HttpException('A IA está com muitos pedidos agora. Aguarde um minuto e tente de novo.', 429);
    case 'refused':
      return new UnprocessableEntityException('A IA não aceitou analisar este conteúdo. Revise o que foi enviado.');
    case 'upstream':
      return new BadGatewayException(`O serviço de IA não respondeu. ${invalid}`);
    case 'invalid':
      return new BadGatewayException(invalid);
  }
}

export type StructuredRequest<T extends z.ZodType> = {
  /** Regras fixas da tarefa. */
  system: string;
  /** Dados do usuário: texto, imagem ou PDF. */
  content: Anthropic.Beta.BetaContentBlockParam[];
  schema: T;
  effort: 'low' | 'medium' | 'high';
  maxTokens: number;
  timeoutMs: number;
};

@Injectable()
export class AiService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(ANTHROPIC) private readonly client: Anthropic | null,
  ) {}

  get configured() {
    return this.client !== null;
  }

  /** Uma chamada com saída estruturada, validada pelo schema zod (inclusive os refinamentos). */
  async structured<T extends z.ZodType>(request: StructuredRequest<T>): Promise<z.infer<T>> {
    if (!this.client) throw new AiError('unconfigured');
    const format = zodOutputFormat(request.schema);
    let message: Anthropic.Beta.BetaMessage;
    try {
      message = await this.client.beta.messages
        .stream(
          {
            model: this.env.AI_MODEL,
            max_tokens: request.maxTokens,
            system: request.system,
            messages: [{ role: 'user', content: request.content }],
            output_config: { effort: request.effort, format },
            // Se o modelo recusar por engano, a API tenta de novo num modelo alternativo.
            betas: ['server-side-fallback-2026-07-01'],
            fallbacks: 'default',
          },
          { timeout: request.timeoutMs },
        )
        .finalMessage();
    } catch (error) {
      if (error instanceof Anthropic.RateLimitError) throw new AiError('busy');
      throw new AiError('upstream');
    }
    if (message.stop_reason === 'refusal') throw new AiError('refused');
    if (message.stop_reason === 'max_tokens') throw new AiError('invalid');
    const text = message.content
      .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');
    try {
      return format.parse(text);
    } catch {
      throw new AiError('invalid');
    }
  }
}

@Global()
@Module({
  providers: [
    {
      provide: ANTHROPIC,
      inject: [ENV],
      useFactory: (env: Env) => (env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }) : null),
    },
    AiService,
  ],
  exports: [AiService],
})
export class AiModule {}
