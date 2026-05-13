import { Inject, Injectable } from '@nestjs/common';
import { auditLogs } from '@yorecebimde/db/schema';
import type { AuditAction } from '@yorecebimde/shared';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';

export type AuditEntry = {
  actorUserId?: string | null;
  actorRole?: 'customer' | 'seller' | 'admin' | 'super_admin' | null;
  actorIp?: string | null;
  actorUserAgent?: string | null;
  action: AuditAction;
  targetType?: string;
  targetId?: string;
  beforeData?: Record<string, unknown>;
  afterData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class AuditService {
  constructor(@Inject(DB_TOKEN) private readonly db: DbToken) {}

  /**
   * Append-only audit log entry. RLS policy UPDATE/DELETE'i engelliyor.
   */
  async log(entry: AuditEntry): Promise<void> {
    await this.db.insert(auditLogs).values({
      actorUserId: entry.actorUserId ?? null,
      actorRole: entry.actorRole ?? null,
      actorIp: entry.actorIp ?? null,
      actorUserAgent: entry.actorUserAgent ?? null,
      action: entry.action,
      targetType: entry.targetType ?? null,
      targetId: entry.targetId ?? null,
      beforeData: entry.beforeData ?? null,
      afterData: entry.afterData ?? null,
      metadata: entry.metadata ?? null,
    });
  }
}
