import { randomUUID } from 'node:crypto';

import { HttpException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';

type Job = {
  id: string;
  owner: string;
  kind: string;
  status: 'running' | 'done' | 'failed';
  result?: unknown;
  message?: string;
  expiresAt: number;
};

export type JobState<T> =
  | { status: 'running' }
  | { status: 'done'; result: T }
  | { status: 'failed'; message: string };

const TTL_MS = 30 * 60_000;
const MAX_RUNNING = 4;

/**
 * Pedidos demorados de IA (plano, ficha em PDF) rodam em segundo plano e o app consulta o
 * resultado. Assim a resposta não depende de a tela do celular ficar aberta nem do limite de
 * tempo do proxy. Fica em memória: se a API reiniciar, o app pede para enviar de novo.
 */
@Injectable()
export class AiJobs {
  private readonly jobs = new Map<string, Job>();

  start(owner: string, kind: string, run: () => Promise<unknown>): { id: string } {
    const now = Date.now();
    for (const [id, job] of this.jobs) if (job.expiresAt <= now) this.jobs.delete(id);
    const running = [...this.jobs.values()].filter((job) => job.status === 'running');
    if (running.some((job) => job.owner === owner && job.kind === kind))
      throw new ServiceUnavailableException('Já existe um pedido em andamento. Aguarde ele terminar.');
    if (running.length >= MAX_RUNNING)
      throw new ServiceUnavailableException('O servidor está ocupado. Tente novamente em alguns minutos.');
    const job: Job = { id: randomUUID(), owner, kind, status: 'running', expiresAt: now + TTL_MS };
    this.jobs.set(job.id, job);
    void run().then(
      (result) => {
        job.status = 'done';
        job.result = result;
      },
      (error: unknown) => {
        job.status = 'failed';
        job.message =
          error instanceof HttpException ? error.message : 'Não foi possível concluir o pedido. Tente novamente.';
      },
    );
    return { id: job.id };
  }

  get<T>(owner: string, kind: string, id: string): JobState<T> {
    const job = this.jobs.get(id);
    if (!job || job.owner !== owner || job.kind !== kind || job.expiresAt <= Date.now())
      throw new NotFoundException('Este pedido não existe mais. Envie de novo.');
    if (job.status === 'done') return { status: 'done', result: job.result as T };
    if (job.status === 'failed') return { status: 'failed', message: job.message ?? 'Falhou.' };
    return { status: 'running' };
  }
}
