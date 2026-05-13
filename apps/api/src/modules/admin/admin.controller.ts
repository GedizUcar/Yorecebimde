import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ForbiddenError } from '@yorecebimde/shared';
import { SessionGuard } from '../../common/guards/session.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { SessionUser } from '../../common/guards/session.guard.js';
import { AdminService } from './admin.service.js';

const sellerActionSchema = z.object({
  reason: z.string().max(1000).optional(),
});
class SellerActionDto extends createZodDto(sellerActionSchema) {}

const createCategorySchema = z.object({
  slug: z.string().min(2).max(100),
  nameTr: z.string().min(2).max(200),
  nameEn: z.string().max(200).optional(),
  parentId: z.string().uuid().optional(),
  defaultKdvRate: z.number().min(0).max(50).optional(),
  isActive: z.boolean().optional(),
});
class CreateCategoryDto extends createZodDto(createCategorySchema) {}

const updateCategorySchema = z.object({
  nameTr: z.string().min(2).max(200).optional(),
  nameEn: z.string().max(200).optional(),
  isActive: z.boolean().optional(),
  defaultKdvRate: z.number().min(0).max(50).optional(),
});
class UpdateCategoryDto extends createZodDto(updateCategorySchema) {}

const boostPackageSchema = z.object({
  name: z.string().min(2).max(100),
  durationDays: z.number().int().positive(),
  priceCents: z.number().int().nonnegative(),
  weight: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});
class BoostPackageDto extends createZodDto(boostPackageSchema) {}

const updateBoostPackageSchema = boostPackageSchema.partial();
class UpdateBoostPackageDto extends createZodDto(updateBoostPackageSchema) {}

const resolveDisputeSchema = z.object({
  winner: z.enum(['customer', 'seller', 'split']),
  refundAmountCents: z.number().int().nonnegative().optional(),
  decisionNotes: z.string().min(10).max(2000),
});
class ResolveDisputeDto extends createZodDto(resolveDisputeSchema) {}

@Controller('admin')
@UseGuards(SessionGuard)
export class AdminController {
  constructor(private readonly service: AdminService) {}

  private assertAdmin(user: SessionUser) {
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      throw new ForbiddenError('Admin yetkisi gerekli');
    }
  }

  @Get('dashboard')
  async dashboard(@CurrentUser() user: SessionUser) {
    this.assertAdmin(user);
    return { data: await this.service.dashboard() };
  }

  // Sellers
  @Get('sellers')
  async listSellers(
    @CurrentUser() user: SessionUser,
    @Query('status') status?: string,
    @Query('q') q?: string,
  ) {
    this.assertAdmin(user);
    return {
      data: await this.service.listSellers({
        ...(status ? { status } : {}),
        ...(q ? { q } : {}),
      }),
    };
  }

  @Get('sellers/:id')
  async findSeller(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    this.assertAdmin(user);
    return { data: await this.service.findSeller(id) };
  }

  @Post('sellers/:id/suspend')
  @HttpCode(200)
  async suspendSeller(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: SellerActionDto,
  ) {
    this.assertAdmin(user);
    return { data: await this.service.sellerTransition(user.id, id, 'suspended', body.reason) };
  }

  @Post('sellers/:id/reinstate')
  @HttpCode(200)
  async reinstateSeller(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: SellerActionDto,
  ) {
    this.assertAdmin(user);
    return { data: await this.service.sellerTransition(user.id, id, 'approved', body.reason) };
  }

  @Post('sellers/:id/close')
  @HttpCode(200)
  async closeSeller(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: SellerActionDto,
  ) {
    this.assertAdmin(user);
    return { data: await this.service.sellerTransition(user.id, id, 'closed', body.reason) };
  }

  // Categories
  @Post('categories')
  @HttpCode(201)
  async createCategory(@CurrentUser() user: SessionUser, @Body() body: CreateCategoryDto) {
    this.assertAdmin(user);
    return { data: await this.service.createCategory(user.id, body) };
  }

  @Patch('categories/:id')
  async updateCategory(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: UpdateCategoryDto,
  ) {
    this.assertAdmin(user);
    await this.service.updateCategory(user.id, id, body);
    return { data: { id, updated: true } };
  }

  @Delete('categories/:id')
  async deleteCategory(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    this.assertAdmin(user);
    await this.service.deleteCategory(user.id, id);
    return { data: { id, deleted: true } };
  }

  // Boost packages
  @Get('boost-packages')
  async listBoostPackages(@CurrentUser() user: SessionUser) {
    this.assertAdmin(user);
    const { boostPackages } = await import('@yorecebimde/db/schema');
    const rows = await (
      this.service as unknown as { db: import('../../infrastructure/database.module.js').DbToken }
    ).db
      .select()
      .from(boostPackages);
    return { data: rows };
  }

  @Post('boost-packages')
  @HttpCode(201)
  async createBoostPackage(@CurrentUser() user: SessionUser, @Body() body: BoostPackageDto) {
    this.assertAdmin(user);
    return { data: await this.service.createBoostPackage(user.id, body) };
  }

  @Patch('boost-packages/:id')
  async updateBoostPackage(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: UpdateBoostPackageDto,
  ) {
    this.assertAdmin(user);
    await this.service.updateBoostPackage(user.id, id, body);
    return { data: { id, updated: true } };
  }

  @Delete('boost-packages/:id')
  async deleteBoostPackage(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    this.assertAdmin(user);
    await this.service.deleteBoostPackage(user.id, id);
    return { data: { id, deactivated: true } };
  }

  // Disputes
  @Get('disputes')
  async listDisputes(@CurrentUser() user: SessionUser, @Query('status') status?: string) {
    this.assertAdmin(user);
    return { data: await this.service.listDisputes(status) };
  }

  @Post('disputes/:id/resolve')
  @HttpCode(200)
  async resolveDispute(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: ResolveDisputeDto,
  ) {
    this.assertAdmin(user);
    return { data: await this.service.resolveDispute(user.id, id, body) };
  }

  // Audit CSV export — must come before /audit list route to avoid conflict
  @Get('audit/export.csv')
  async auditCsv(
    @CurrentUser() user: SessionUser,
    @Query('action') action?: string,
    @Query('targetType') targetType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    this.assertAdmin(user);
    const rows = await this.service.listAuditLogs({
      ...(action ? { action } : {}),
      ...(targetType ? { targetType } : {}),
      ...(from ? { from: new Date(from) } : {}),
      ...(to ? { to: new Date(to) } : {}),
      limit: 1000,
    });
    const lines: string[] = ['created_at,actor_user_id,actor_role,action,target_type,target_id'];
    for (const r of rows) {
      lines.push(
        [
          r.createdAt.toISOString(),
          r.actorUserId ?? '',
          r.actorRole ?? '',
          r.action,
          r.targetType ?? '',
          r.targetId ?? '',
        ].join(','),
      );
    }
    return lines.join('\n');
  }

  // Audit
  @Get('audit')
  async audit(
    @CurrentUser() user: SessionUser,
    @Query('actorId') actorId?: string,
    @Query('action') action?: string,
    @Query('targetType') targetType?: string,
    @Query('targetId') targetId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    this.assertAdmin(user);
    return {
      data: await this.service.listAuditLogs({
        ...(actorId ? { actorId } : {}),
        ...(action ? { action } : {}),
        ...(targetType ? { targetType } : {}),
        ...(targetId ? { targetId } : {}),
        ...(from ? { from: new Date(from) } : {}),
        ...(to ? { to: new Date(to) } : {}),
        ...(limit ? { limit: Number(limit) } : {}),
      }),
    };
  }
}
