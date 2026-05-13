import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { sql } from 'drizzle-orm';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(@Inject(DB_TOKEN) private readonly db: DbToken) {}

  @Get('healthz')
  liveness() {
    return { status: 'ok', uptime: process.uptime(), ts: new Date().toISOString() };
  }

  @Get('readyz')
  async readiness() {
    const checks: Record<string, 'ok' | 'fail'> = {};
    try {
      await this.db.execute(sql`SELECT 1`);
      checks.postgres = 'ok';
    } catch {
      checks.postgres = 'fail';
    }
    const allOk = Object.values(checks).every((v) => v === 'ok');
    return {
      status: allOk ? 'ready' : 'degraded',
      checks,
      ts: new Date().toISOString(),
    };
  }
}
