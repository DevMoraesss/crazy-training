import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { loginSchema } from '@crazy-training/shared';
import { and, eq, gt, lte } from 'drizzle-orm';
import {
  BadRequestException,
  Inject,
  Injectable,
  OnModuleInit,
  UnauthorizedException,
  HttpException,
} from '@nestjs/common';

import { ENV, type Env } from '../config/env.js';
import { DATABASE, type Database } from '../database/database.module.js';
import { authSessions, users } from '../database/schema.js';
import { checkPassword, hashPassword } from './password.js';

export const COOKIE_NAME = 'ct_session';
export const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const digest = (value: string) => createHash('sha256').update(value).digest('hex');

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly attempts = new Map<string, { count: number; until: number }>();
  private dummyHash: string | null = null;
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async onModuleInit() {
    this.dummyHash = await hashPassword(randomBytes(32).toString('hex'));
    // Conta pessoal provisionada no servidor. Sem cadastro público ou senha padrão.
    if (!this.env.ACCOUNT_EMAIL || !this.env.ACCOUNT_PASSWORD) return;
    const email = this.env.ACCOUNT_EMAIL.toLowerCase().trim();
    const existing = await this.db.query.users.findFirst({ where: eq(users.email, email) });
    if (!existing) {
      await this.db
        .insert(users)
        .values({ id: randomUUID(), email, passwordHash: await hashPassword(this.env.ACCOUNT_PASSWORD) })
        .onConflictDoNothing();
    }
  }

  async login(input: unknown, address: string) {
    const parsed = loginSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException('Informe e-mail e senha válidos.');
    const now = Date.now();
    for (const [key, attempt] of this.attempts) if (attempt.until <= now) this.attempts.delete(key);
    const key = address || 'unknown';
    const attempt = this.attempts.get(key) ?? { count: 0, until: now + 15 * 60 * 1000 };
    if (attempt.count >= 10)
      throw new HttpException('Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.', 429);
    attempt.count++;
    this.attempts.set(key, attempt);
    const user = await this.db.query.users.findFirst({ where: eq(users.email, parsed.data.email) });
    const valid = await checkPassword(
      parsed.data.password,
      user?.passwordHash ?? this.dummyHash ?? (await hashPassword('unavailable')),
    );
    if (!user || !valid) throw new UnauthorizedException('E-mail ou senha incorretos.');
    this.attempts.delete(key);
    await this.db.delete(authSessions).where(lte(authSessions.expiresAt, new Date()));
    const token = randomBytes(32).toString('base64url');
    await this.db
      .insert(authSessions)
      .values({ tokenHash: digest(token), userId: user.id, expiresAt: new Date(now + SESSION_MS) });
    return { token, user: { id: user.id, email: user.email } };
  }

  async current(cookie: string | undefined) {
    const token = this.readToken(cookie);
    if (!token) throw new UnauthorizedException('Entre na sua conta para continuar.');
    const [session] = await this.db
      .select({ id: users.id, email: users.email })
      .from(authSessions)
      .innerJoin(users, eq(users.id, authSessions.userId))
      .where(and(eq(authSessions.tokenHash, digest(token)), gt(authSessions.expiresAt, new Date())));
    if (!session) throw new UnauthorizedException('Sua sessão expirou. Entre novamente.');
    return session;
  }
  async logout(cookie: string | undefined) {
    const token = this.readToken(cookie);
    if (token) await this.db.delete(authSessions).where(eq(authSessions.tokenHash, digest(token)));
  }
  private readToken(cookie: string | undefined) {
    const token = cookie
      ?.split(';')
      .map((item) => item.trim())
      .find((item) => item.startsWith(`${COOKIE_NAME}=`))
      ?.slice(COOKIE_NAME.length + 1);
    return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
  }
}
