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
