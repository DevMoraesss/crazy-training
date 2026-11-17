import { cloudSnapshotSchema, cloudUploadSchema } from '@crazy-training/shared';
import { and, eq } from 'drizzle-orm';
import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Inject,
  Put,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { AuthService } from '../auth/auth.service.js';
import { assertOrigin } from '../auth/origin.js';
import { ENV, type Env } from '../config/env.js';
import { DATABASE, type Database } from '../database/database.module.js';
import { cloudSnapshots } from '../database/schema.js';

@Controller('cloud')
export class CloudController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(DATABASE) private readonly db: Database,
    @Inject(ENV) private readonly env: Env,
  ) {}
  @Get('snapshot')
  async read(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    assertOrigin(request, this.env);
    const user = await this.auth.current(request.headers.cookie);
    response.setHeader('Cache-Control', 'no-store');
    const row = await this.db.query.cloudSnapshots.findFirst({
      where: eq(cloudSnapshots.userId, user.id),
    });
    return {
      revision: row?.revision ?? 0,
      snapshot: row ? cloudSnapshotSchema.parse(row.data) : null,
      updatedAt: row?.updatedAt.toISOString() ?? null,
    };
  }
  @Put('snapshot')
  async write(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() body: unknown,
  ) {
    assertOrigin(request, this.env);
    const user = await this.auth.current(request.headers.cookie);
    if (
      body &&
      typeof body === 'object' &&
      'snapshot' in body &&
      body.snapshot &&
      typeof body.snapshot === 'object' &&
      'version' in body.snapshot &&
      body.snapshot.version === 1
    )
      throw new BadRequestException(
        'Atualize a página ou o aplicativo antes de sincronizar. Esta versão não preserva os novos resumos alimentares. Nenhum dado foi alterado.',
      );
    const parsed = cloudUploadSchema.safeParse(body);
    if (!parsed.success)
      throw new BadRequestException('Os dados não puderam ser validados. Nenhuma alteração foi salva.');
    const { revision, snapshot } = parsed.data;
    const now = new Date();
    const rows =
      revision === 0
        ? await this.db
            .insert(cloudSnapshots)
            .values({
              userId: user.id,
              revision: 1,
              data: snapshot,
              updatedAt: now,
            })
            .onConflictDoNothing()
            .returning()
        : await this.db
            .update(cloudSnapshots)
            .set({ revision: revision + 1, data: snapshot, updatedAt: now })
            .where(and(eq(cloudSnapshots.userId, user.id), eq(cloudSnapshots.revision, revision)))
            .returning();
    if (!rows.length)
      throw new ConflictException('Sua conta foi atualizada em outro aparelho. Nenhum dado foi sobrescrito.');
    response.setHeader('Cache-Control', 'no-store');
    return { revision: revision + 1, snapshot, updatedAt: now.toISOString() };
  }
}
