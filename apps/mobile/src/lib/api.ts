import { Platform } from 'react-native';

const API = (process.env.EXPO_PUBLIC_API_URL ?? (Platform.OS === 'web' ? '/api' : 'http://localhost:3000')).replace(
  /\/$/,
  '',
);
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}
export async function apiRequest<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      ...options,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers },
      signal: options.signal ?? AbortSignal.timeout(30_000),
    });
  } catch {
    throw new ApiError('Não foi possível conectar ao servidor. Seus dados continuam neste aparelho.', 0);
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiError('O servidor não está disponível. Tente novamente mais tarde.', response.status);
  }
  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
        ? body.message
        : 'Não foi possível concluir a operação.';
    throw new ApiError(message, response.status);
  }
  return body as T;
}

type JobState = { status: 'running' } | { status: 'done'; result: unknown } | { status: 'failed'; message: string };

/**
 * Envia um pedido demorado (plano, ficha em PDF) e consulta o resultado até terminar. O servidor
 * continua trabalhando se a tela bloquear; ao voltar, a consulta segue de onde parou.
 */
export async function runJob(path: string, body: unknown, timeoutMs = 8 * 60_000): Promise<unknown> {
  const { id } = await apiRequest<{ id: string }>(path, {
    method: 'POST',
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  const until = Date.now() + timeoutMs;
  let failures = 0;
  while (Date.now() < until) {
    await new Promise((resolve) => setTimeout(resolve, 3_000));
    let state: JobState;
    try {
      state = await apiRequest<JobState>(`${path}/${id}`);
      failures = 0;
    } catch (error) {
      // Rede instável (academia, tela bloqueada): tenta de novo algumas vezes antes de desistir.
      if (error instanceof ApiError && error.status === 0 && ++failures < 5) continue;
      throw error;
    }
    if (state.status === 'done') return state.result;
    if (state.status === 'failed') throw new ApiError(state.message, 502);
  }
  throw new ApiError('A IA demorou demais para responder. Tente novamente.', 504);
}
