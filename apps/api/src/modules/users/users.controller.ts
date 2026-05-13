import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { SessionGuard, type SessionUser } from '../../common/guards/session.guard.js';
import { UsersRepository } from './users.repository.js';
import { NotFoundError } from '@yorecebimde/shared';

const updateMeSchema = z.object({
  firstName: z.string().min(2).max(100).optional(),
  lastName: z.string().min(2).max(100).optional(),
  phone: z.string().min(10).max(20).optional(),
  preferredLocale: z.enum(['tr', 'en']).optional(),
  marketingEmailOptIn: z.boolean().optional(),
  marketingSmsOptIn: z.boolean().optional(),
});
class UpdateMeDto extends createZodDto(updateMeSchema) {}

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly repo: UsersRepository) {}

  /**
   * Profil bilgisi — auth'lı kullanıcının domain user kaydı.
   * Better-Auth session'dan farkı: bizim users tablomuzdaki tüm field'lar
   * (role, kvkk, marketing opt-in, lastLoginAt, twoFa, etc.).
   */
  @Get('me')
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Giriş yapmış kullanıcının kendi profili' })
  async me(@CurrentUser() user: SessionUser) {
    const row = await this.repo.findById(user.id);
    if (!row) throw new NotFoundError('User', user.id);
    return {
      data: {
        id: row.id,
        email: row.email,
        phone: row.phone,
        phoneVerified: row.phoneVerified,
        firstName: row.firstName,
        lastName: row.lastName,
        role: row.role,
        status: row.status,
        preferredLocale: row.preferredLocale,
        marketingEmailOptIn: row.marketingEmailOptIn,
        marketingSmsOptIn: row.marketingSmsOptIn,
        twoFaEnabled: row.twoFaEnabled,
        kvkkAcceptedAt: row.kvkkAcceptedAt,
        lastLoginAt: row.lastLoginAt,
        createdAt: row.createdAt,
      },
    };
  }

  @Patch('me')
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Profil güncelleme — ad, telefon, tercihler' })
  async updateMe(@CurrentUser() user: SessionUser, @Body() body: UpdateMeDto) {
    // exactOptionalPropertyTypes — undefined field'ları repo'ya geçirme
    const patch: Parameters<UsersRepository['updateProfile']>[1] = {};
    if (body.firstName !== undefined) patch.firstName = body.firstName;
    if (body.lastName !== undefined) patch.lastName = body.lastName;
    if (body.phone !== undefined) patch.phone = body.phone;
    if (body.preferredLocale !== undefined) patch.preferredLocale = body.preferredLocale;
    if (body.marketingEmailOptIn !== undefined)
      patch.marketingEmailOptIn = body.marketingEmailOptIn;
    if (body.marketingSmsOptIn !== undefined)
      patch.marketingSmsOptIn = body.marketingSmsOptIn;
    const updated = await this.repo.updateProfile(user.id, patch);
    return { data: updated };
  }
}
