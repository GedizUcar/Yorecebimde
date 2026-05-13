import {
  Body,
  Controller,
  Delete,
  Get,
  Headers as Hdr,
  HttpCode,
  Inject,
  Param,
  Patch,
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
import { CartService, type CartIdentity } from './cart.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { SessionGuard, type SessionUser } from '../../common/guards/session.guard.js';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';

const DEVICE_HEADER = 'x-device-id';

const addItemSchema = z.object({
  productId: z.string().uuid(),
  variationId: z.string().uuid().optional(),
  quantity: z.number().positive(),
});
class AddItemDto extends createZodDto(addItemSchema) {}

const updateItemSchema = z.object({ quantity: z.number().nonnegative() });
class UpdateItemDto extends createZodDto(updateItemSchema) {}

const mergeSchema = z.object({ deviceId: z.string().min(8).max(100) });
class MergeDto extends createZodDto(mergeSchema) {}

@Controller('cart')
export class CartController {
  constructor(
    private readonly service: CartService,
    private readonly authService: AuthService,
    @Inject(DB_TOKEN) private readonly db: DbToken,
  ) {}

  @Get()
  async get(@Req() req: FastifyRequest, @Hdr(DEVICE_HEADER) deviceId?: string) {
    const identity = await this.resolveIdentity(req, deviceId);
    if (!identity) return { data: { empty: true, items: [], totals: emptyTotals() } };
    return { data: await this.service.getCart(identity) };
  }

  @Post('items')
  @HttpCode(201)
  async addItem(
    @Req() req: FastifyRequest,
    @Hdr(DEVICE_HEADER) deviceId: string | undefined,
    @Body() body: AddItemDto,
  ) {
    const identity = await this.resolveIdentityOrThrow(req, deviceId);
    return { data: await this.service.addItem(identity, body) };
  }

  @Patch('items/:itemId')
  async updateItem(
    @Req() req: FastifyRequest,
    @Hdr(DEVICE_HEADER) deviceId: string | undefined,
    @Param('itemId') itemId: string,
    @Body() body: UpdateItemDto,
  ) {
    const identity = await this.resolveIdentityOrThrow(req, deviceId);
    return { data: await this.service.updateQuantity(identity, itemId, body.quantity) };
  }

  @Delete('items/:itemId')
  async removeItem(
    @Req() req: FastifyRequest,
    @Hdr(DEVICE_HEADER) deviceId: string | undefined,
    @Param('itemId') itemId: string,
  ) {
    const identity = await this.resolveIdentityOrThrow(req, deviceId);
    return { data: await this.service.removeItem(identity, itemId) };
  }

  @Post('clear')
  @HttpCode(200)
  async clear(@Req() req: FastifyRequest, @Hdr(DEVICE_HEADER) deviceId?: string) {
    const identity = await this.resolveIdentityOrThrow(req, deviceId);
    return { data: await this.service.clear(identity) };
  }

  @Post('merge')
  @UseGuards(SessionGuard)
  async merge(@CurrentUser() user: SessionUser, @Body() body: MergeDto) {
    await this.service.merge(body.deviceId, user.id);
    return { data: { merged: true } };
  }

  private async resolveIdentityOrThrow(
    req: FastifyRequest,
    deviceId: string | undefined,
  ): Promise<CartIdentity> {
    const id = await this.resolveIdentity(req, deviceId);
    if (!id) throw new AuthRequiredError('x-device-id header veya oturum gerekli');
    return id;
  }

  private async resolveIdentity(
    req: FastifyRequest,
    deviceId: string | undefined,
  ): Promise<CartIdentity | null> {
    const userId = await this.tryResolveUser(req);
    if (userId) return { kind: 'user', userId };
    if (deviceId) return { kind: 'device', deviceId };
    return null;
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

function emptyTotals() {
  return {
    subtotalCents: 0,
    discountCents: 0,
    kdvCents: 0,
    totalCents: 0,
    itemCount: 0,
    lineSummaries: [],
  };
}
