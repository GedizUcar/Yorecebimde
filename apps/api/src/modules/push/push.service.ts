import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { userPushTokens } from '@yorecebimde/db/schema';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';

export type PushPlatform = 'ios' | 'android' | 'web';

export type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
  /** Deep link path, e.g., "/order/123" */
  url?: string;
};

/**
 * Push token registry + Expo Push gönderici.
 * Docs: https://docs.expo.dev/push-notifications/sending-notifications/
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(@Inject(DB_TOKEN) private readonly db: DbToken) {}

  async registerToken(
    userId: string,
    token: string,
    platform: PushPlatform,
    deviceLabel?: string,
  ) {
    const [existing] = await this.db
      .select()
      .from(userPushTokens)
      .where(eq(userPushTokens.token, token))
      .limit(1);
    if (existing) {
      // Token başka user'a kayıtlı olabilir — son user'a transfer et
      await this.db
        .update(userPushTokens)
        .set({
          userId,
          platform,
          ...(deviceLabel ? { deviceLabel } : {}),
          lastUsedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(userPushTokens.id, existing.id));
      return existing;
    }
    const [inserted] = await this.db
      .insert(userPushTokens)
      .values({
        userId,
        token,
        platform,
        ...(deviceLabel ? { deviceLabel } : {}),
      })
      .returning();
    return inserted!;
  }

  async deleteToken(userId: string, token: string) {
    await this.db
      .delete(userPushTokens)
      .where(and(eq(userPushTokens.userId, userId), eq(userPushTokens.token, token)));
  }

  async listUserTokens(userId: string) {
    return this.db
      .select()
      .from(userPushTokens)
      .where(and(eq(userPushTokens.userId, userId), isNull(userPushTokens.deletedAt)))
      .orderBy(desc(userPushTokens.lastUsedAt));
  }

  async sendToUser(userId: string, payload: PushPayload): Promise<{ sent: number; failed: number }> {
    const tokens = await this.listUserTokens(userId);
    if (tokens.length === 0) return { sent: 0, failed: 0 };
    const messages = tokens.map((t) => this.buildMessage(t.token, payload));
    return this.sendBatch(messages);
  }

  async sendToToken(token: string, payload: PushPayload): Promise<{ sent: boolean }> {
    const result = await this.sendBatch([this.buildMessage(token, payload)]);
    return { sent: result.sent > 0 };
  }

  private buildMessage(token: string, payload: PushPayload): Record<string, unknown> {
    return {
      to: token,
      title: payload.title,
      body: payload.body,
      data: {
        ...(payload.data ?? {}),
        ...(payload.url ? { url: payload.url } : {}),
      },
      sound: 'default',
      priority: 'high',
    };
  }

  /**
   * Expo Push HTTP gönderici. Test/non-Expo token'lar log stub'una düşer
   * (geliştirme kolaylığı için). DeviceNotRegistered token'lar silinir.
   */
  private async sendBatch(
    messages: Array<Record<string, unknown>>,
  ): Promise<{ sent: number; failed: number }> {
    if (messages.length === 0) return { sent: 0, failed: 0 };

    const valid = messages.filter((m) => {
      const t = String(m['to']);
      return t.startsWith('ExponentPushToken[') || t.startsWith('ExpoPushToken[');
    });

    // Non-Expo (test) token'lar — log stub
    const stubs = messages.length - valid.length;
    if (stubs > 0) {
      for (const m of messages) {
        const t = String(m['to']);
        if (!t.startsWith('ExponentPushToken[') && !t.startsWith('ExpoPushToken[')) {
          this.logger.log(
            `[push-stub] to=${t.substring(0, 16)}... title=${m['title']}`,
          );
        }
      }
    }
    if (valid.length === 0) return { sent: stubs, failed: 0 };

    let sent = 0;
    let failed = 0;
    try {
      for (let i = 0; i < valid.length; i += 100) {
        const chunk = valid.slice(i, i + 100);
        const res = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(chunk),
        });
        if (!res.ok) {
          failed += chunk.length;
          this.logger.warn(`Expo push HTTP ${res.status}: ${await res.text()}`);
          continue;
        }
        const json = (await res.json()) as {
          data?: Array<{ status: 'ok' | 'error'; details?: { error?: string } }>;
        };
        for (let idx = 0; idx < (json.data?.length ?? 0); idx++) {
          const tk = json.data![idx]!;
          if (tk.status === 'ok') {
            sent++;
          } else {
            failed++;
            if (tk.details?.error === 'DeviceNotRegistered') {
              const token = String(chunk[idx]!['to']);
              await this.db
                .delete(userPushTokens)
                .where(eq(userPushTokens.token, token))
                .catch(() => undefined);
            }
          }
        }
      }
    } catch (err) {
      this.logger.warn(`Expo push send failed: ${String(err)}`);
      failed += valid.length;
    }

    return { sent: sent + stubs, failed };
  }
}
