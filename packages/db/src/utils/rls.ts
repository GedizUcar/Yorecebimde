import { sql, type SQL } from 'drizzle-orm';

/**
 * RLS policy generator.
 *
 * Her tenant-bound tablo için (örn. products, order_items, vs.):
 *
 * ```
 * await db.execute(rlsEnable('products'));
 * await db.execute(rlsTenantPolicy('products'));
 * ```
 *
 * Policy:
 *   - seller_id = current_setting('app.current_seller_id') VEYA
 *   - current_setting('app.current_role') = 'admin' / 'super_admin'
 */

export function rlsEnable(tableName: string): SQL {
  return sql.raw(`ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;`);
}

export function rlsForceEnable(tableName: string): SQL {
  // FORCE: tablo sahibi (owner) bile RLS'e tabidir.
  return sql.raw(`ALTER TABLE ${tableName} FORCE ROW LEVEL SECURITY;`);
}

export function rlsTenantPolicy(tableName: string, sellerIdColumn = 'seller_id'): SQL {
  return sql.raw(`
    CREATE POLICY ${tableName}_tenant_iso ON ${tableName}
      USING (
        ${sellerIdColumn} = NULLIF(current_setting('app.current_seller_id', true), '')::uuid
        OR current_setting('app.current_role', true) IN ('admin', 'super_admin')
      )
      WITH CHECK (
        ${sellerIdColumn} = NULLIF(current_setting('app.current_seller_id', true), '')::uuid
        OR current_setting('app.current_role', true) IN ('admin', 'super_admin')
      );
  `);
}

export function rlsPublicReadActivePolicy(tableName: string): SQL {
  return sql.raw(`
    CREATE POLICY ${tableName}_public_read ON ${tableName}
      FOR SELECT
      USING (
        (is_active = true AND deleted_at IS NULL)
        OR current_setting('app.current_role', true) IN ('admin', 'super_admin')
      );
  `);
}

/**
 * Audit log append-only: UPDATE ve DELETE policy yok (default DENY).
 */
export function rlsAuditAppendOnly(tableName: string): SQL {
  return sql.raw(`
    CREATE POLICY ${tableName}_insert ON ${tableName}
      FOR INSERT
      WITH CHECK (true);
    CREATE POLICY ${tableName}_select ON ${tableName}
      FOR SELECT
      USING (current_setting('app.current_role', true) IN ('admin', 'super_admin'));
  `);
}

/**
 * NestJS middleware/transaction içinden çağrılacak: tenant context'i set eder.
 */
export function setTenantContext(opts: {
  userId?: string | null;
  sellerId?: string | null;
  role?: string;
}): SQL {
  return sql`
    SELECT
      set_config('app.current_user_id', ${opts.userId ?? ''}, true),
      set_config('app.current_seller_id', ${opts.sellerId ?? ''}, true),
      set_config('app.current_role', ${opts.role ?? 'guest'}, true)
  `;
}
