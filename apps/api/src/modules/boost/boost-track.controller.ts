import { Controller, HttpCode, Param, Post } from '@nestjs/common';
import { BoostListingService } from './boost-listing.service.js';

/**
 * Boost impression + click tracking. Public — auth gerekmez ama rate limit
 * (Faz 7 hardening) eklenecek. Fire-and-forget — frontend response'u
 * beklemeden devam eder.
 */
@Controller('boost/track')
export class BoostTrackController {
  constructor(private readonly svc: BoostListingService) {}

  @Post(':boostId/impression')
  @HttpCode(204)
  async impression(@Param('boostId') boostId: string) {
    await this.svc.trackImpression(boostId);
    return null;
  }

  @Post(':boostId/click')
  @HttpCode(204)
  async click(@Param('boostId') boostId: string) {
    await this.svc.trackClick(boostId);
    return null;
  }
}
