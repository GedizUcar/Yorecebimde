import {
  Body,
  Controller,
  Delete,
  Get,
  Headers as Hdr,
  HttpCode,
  Inject,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { users } from '@yorecebimde/db/schema';
import { AuthRequiredError } from '@yorecebimde/shared';
import { AuthService } from '../auth/auth.service.js';
import { WishlistRepository } from './wishlist.repository.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { SessionGuard, type SessionUser } from '../../common/guards/session.guard.js';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';

const DEVICE_HEADER = 'x-device-id';

const addSchema = z.object({ productId: z.string().uuid() });
class AddDto extends createZodDto(addSchema) {}

const mergeSchema = z.object({ deviceId: z.string().min(8).max(100) });
class MergeDto extends createZodDto(mergeSchema) {}

/**
 * Wishlist — kullanıcı login ise user_id, değilse device_id (x-device-id header).
 * Login sonrası `/merge` ile device kayıtları user'a taşınır.
 */
@Controller('wishlist')
export class WishlistController {
  constructor(
    private readonly repo: WishlistRepository,
    private readonly authService: AuthService,
    @Inject(DB_TOKEN) private readonly db: DbToken,
  ) {}

  @Get()
  async list(@Req() req: FastifyRequest, @Hdr(DEVICE_HEADER) deviceId?: string) {
    const userDomainId = await this.tryResolveUser(req);
    if (userDomainId) return { data: await this.repo.listByUser(userDomainId) };
    if (!deviceId) return { data: [] };
    return { data: await this.repo.listByDevice(deviceId) };
  }

  @Get('ids')
  async ids(@Req() req: FastifyRequest, @Hdr(DEVICE_HEADER) deviceId?: string) {
    const userDomainId = await this.tryResolveUser(req);
    const data = await this.repo.productIds(userDomainId, deviceId ?? null);
    return { data };
  }

  @Post()
  @HttpCode(201)
  async add(
    @Req() req: FastifyRequest,
    @Hdr(DEVICE_HEADER) deviceId: string | undefined,
    @Body() body: AddDto,
  ) {
    const userDomainId = await this.tryResolveUser(req);
    if (userDomainId) {
      await this.repo.addForUser(userDomainId, body.productId);
    } else {
      if (!deviceId) throw new AuthRequiredError('x-device-id header gerekli');
      await this.repo.addForDevice(deviceId, body.productId);
    }
    return { data: { productId: body.productId, added: true } };
  }

  @Delete(':productId')
  async remove(
    @Req() req: FastifyRequest,
    @Hdr(DEVICE_HEADER) deviceId: string | undefined,
    @Param('productId') productId: string,
  ) {
    const userDomainId = await this.tryResolveUser(req);
    if (userDomainId) {
      await this.repo.removeForUser(userDomainId, productId);
    } else {
      if (!deviceId) throw new AuthRequiredError('x-device-id header gerekli');
      await this.repo.removeForDevice(deviceId, productId);
    }
    return { data: { productId, removed: true } };
  }

  @Post('merge')
  @UseGuards(SessionGuard)
  async merge(@CurrentUser() user: SessionUser, @Body() body: MergeDto) {
    await this.repo.mergeDeviceIntoUser(body.deviceId, user.id);
    return { data: { merged: true } };
  }

  private async tryResolveUser(req: FastifyRequest): Promise<string | null> {
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      if (typeof v === 'string') headers.set(k, v);
      else if (Array.isArray(v)) headers.set(k, v.join(','));
    }
    try {
      const session = await this.authService.auth.api.getSession({ headers });
      if (!session?.user) return null;
      const rows = await this.db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.authUserId, session.user.id), isNull(users.deletedAt)))
        .limit(1);
      return rows[0]?.id ?? null;
    } catch {
      return null;
    }
  }
}
