import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ForbiddenError } from '@yorecebimde/shared';
import { SessionGuard } from '../../common/guards/session.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { SessionUser } from '../../common/guards/session.guard.js';
import { AdminExtrasService } from './admin-extras.service.js';

const piiRevealSchema = z.object({
  field: z.enum(['iban', 'tcKimlik', 'taxId']),
  reason: z.string().min(10).max(500),
});
class PiiRevealDto extends createZodDto(piiRevealSchema) {}

const commissionOverrideSchema = z.object({
  rate: z.number().min(0).max(50).nullable(),
  reason: z.string().min(10).max(500),
});
class CommissionOverrideDto extends createZodDto(commissionOverrideSchema) {}

const settingSchema = z.object({
  key: z.string().min(2).max(100),
  value: z.unknown(),
  category: z.string().min(2).max(50),
  description: z.string().max(500).optional(),
  isSecret: z.boolean().default(false),
});
class SettingDto extends createZodDto(settingSchema) {}

const templateSchema = z.object({
  triggerKey: z.string().min(2).max(100),
  channel: z.string().min(2).max(20),
  locale: z.string().length(2).optional(),
  subject: z.string().max(300).optional(),
  body: z.string().min(5).max(20_000),
  isActive: z.boolean().optional(),
});
class TemplateDto extends createZodDto(templateSchema) {}

const kvkkCreateSchema = z.object({
  email: z.string().email(),
  phone: z.string().max(20).optional(),
  contactName: z.string().min(2).max(200),
  type: z.enum(['access', 'deletion', 'rectification', 'portability', 'objection']),
  requestText: z.string().min(20).max(5000),
});
class KvkkCreateDto extends createZodDto(kvkkCreateSchema) {}

const kvkkRespondSchema = z.object({
  status: z.enum(['in_progress', 'completed', 'rejected']),
  response: z.string().min(10).max(5000),
});
class KvkkRespondDto extends createZodDto(kvkkRespondSchema) {}

const adminRoleSchema = z.object({
  role: z.enum(['admin', 'super_admin', 'customer']),
  reason: z.string().min(10).max(500),
});
class AdminRoleDto extends createZodDto(adminRoleSchema) {}

const adminSuspendSchema = z.object({
  reason: z.string().min(10).max(500),
});
class AdminSuspendDto extends createZodDto(adminSuspendSchema) {}

@Controller('admin')
@UseGuards(SessionGuard)
export class AdminExtrasController {
  constructor(private readonly service: AdminExtrasService) {}

  private assertAdmin(user: SessionUser) {
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      throw new ForbiddenError('Admin yetkisi gerekli');
    }
  }

  // PII
  @Post('sellers/:id/pii-reveal')
  @HttpCode(200)
  async revealPii(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: PiiRevealDto,
  ) {
    this.assertAdmin(user);
    return { data: await this.service.revealSellerPii(user.id, id, body.field, body.reason) };
  }

  // Commission override
  @Post('sellers/:id/commission-override')
  @HttpCode(200)
  async commissionOverride(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: CommissionOverrideDto,
  ) {
    this.assertAdmin(user);
    return {
      data: await this.service.setCommissionOverride(user.id, id, body.rate, body.reason),
    };
  }

  // System Settings
  @Get('settings')
  async listSettings(@CurrentUser() user: SessionUser) {
    this.assertAdmin(user);
    return { data: await this.service.listSettings() };
  }

  @Put('settings')
  @HttpCode(200)
  async upsertSetting(@CurrentUser() user: SessionUser, @Body() body: SettingDto) {
    this.assertAdmin(user);
    await this.service.upsertSetting(
      user.id,
      body.key,
      body.value,
      body.category,
      body.description,
      body.isSecret,
    );
    return { data: { key: body.key, saved: true } };
  }

  @Delete('settings/:key')
  async deleteSetting(@CurrentUser() user: SessionUser, @Param('key') key: string) {
    this.assertAdmin(user);
    await this.service.deleteSetting(user.id, key);
    return { data: { key, deleted: true } };
  }

  // Notification Templates
  @Get('templates')
  async listTemplates(@CurrentUser() user: SessionUser) {
    this.assertAdmin(user);
    return { data: await this.service.listTemplates() };
  }

  @Put('templates')
  @HttpCode(200)
  async upsertTemplate(@CurrentUser() user: SessionUser, @Body() body: TemplateDto) {
    this.assertAdmin(user);
    return { data: await this.service.upsertTemplate(user.id, body) };
  }

  // KVKK Requests
  @Get('kvkk')
  async listKvkk(@CurrentUser() user: SessionUser, @Query('status') status?: string) {
    this.assertAdmin(user);
    return { data: await this.service.listKvkkRequests(status) };
  }

  @Post('kvkk/:id/respond')
  @HttpCode(200)
  async respondKvkk(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: KvkkRespondDto,
  ) {
    this.assertAdmin(user);
    return { data: await this.service.respondKvkkRequest(user.id, id, body) };
  }

  // Admin Team
  @Get('team')
  async listAdmins(@CurrentUser() user: SessionUser) {
    this.assertAdmin(user);
    return { data: await this.service.listAdmins() };
  }

  @Post('team/:id/role')
  @HttpCode(200)
  async setAdminRole(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: AdminRoleDto,
  ) {
    this.assertAdmin(user);
    await this.service.setAdminRole(user.id, id, body.role, body.reason);
    return { data: { userId: id, role: body.role } };
  }

  @Post('team/:id/suspend')
  @HttpCode(200)
  async suspendAdmin(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: AdminSuspendDto,
  ) {
    this.assertAdmin(user);
    await this.service.suspendAdmin(user.id, id, body.reason);
    return { data: { userId: id, suspended: true } };
  }
}

// Public KVKK request — no auth (logged-in optional)
@Controller('kvkk')
export class KvkkPublicController {
  constructor(private readonly service: AdminExtrasService) {}

  @Post('requests')
  @HttpCode(201)
  async create(@Body() body: KvkkCreateDto) {
    return { data: await this.service.createKvkkRequest(body) };
  }
}
