import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocket, WebSocketServer } from 'ws';
import { and, eq, isNull } from 'drizzle-orm';
import { users, chatThreads } from '@yorecebimde/db/schema';
import { logger } from '@yorecebimde/shared';
import { AuthService } from '../auth/auth.service.js';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';

type ClientInfo = {
  userId: string;
  authUserId: string;
  role: string;
  /** Domain seller id (eğer satıcıysa) */
  sellerId: string | null;
};

type OutboundMessage =
  | { type: 'connected'; userId: string }
  | { type: 'subscribed'; threadId: string }
  | { type: 'error'; error: string }
  | {
      type: 'message';
      threadId: string;
      message: {
        id: string;
        threadId: string;
        senderRole: 'user' | 'seller' | 'system';
        body: string;
        attachments: unknown;
        createdAt: string;
      };
    }
  | { type: 'pong' };

type InboundMessage =
  | { type: 'subscribe'; threadId: string }
  | { type: 'unsubscribe'; threadId: string }
  | { type: 'ping' };

const HEARTBEAT_INTERVAL = 30_000;

@Injectable()
export class RealtimeService implements OnModuleDestroy {
  private wss?: WebSocketServer;
  /** Per-thread subscriber set (WebSocket instances) */
  private threadSubs = new Map<string, Set<WebSocket>>();
  /** Per-client subscribed thread set (for cleanup) */
  private clientThreads = new WeakMap<WebSocket, Set<string>>();
  private clients = new WeakMap<WebSocket, ClientInfo>();
  private heartbeat?: NodeJS.Timeout;

  constructor(
    @Inject(DB_TOKEN) private readonly db: DbToken,
    private readonly authService: AuthService,
  ) {}

  /**
   * Main.ts'ten çağrılır — Fastify HTTP server'a upgrade handler bağlar.
   * `noServer: true` modunda ws kendi upgrade'ini handle eder, biz Fastify'ın
   * `server.on('upgrade', ...)` event'inden yönlendiririz.
   */
  attachToHttpServer(server: import('node:http').Server) {
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (req, socket, head) => {
      if (!req.url?.startsWith('/ws')) return;
      this.handleUpgrade(req, socket, head);
    });

    // Heartbeat — ölü bağlantıları kopar
    this.heartbeat = setInterval(() => {
      this.wss?.clients.forEach((ws) => {
        const wsAny = ws as WebSocket & { isAlive?: boolean };
        if (wsAny.isAlive === false) {
          ws.terminate();
          return;
        }
        wsAny.isAlive = false;
        ws.ping();
      });
    }, HEARTBEAT_INTERVAL);

    logger.info('realtime WebSocket gateway attached to /ws');
  }

  async onModuleDestroy() {
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.wss?.close();
  }

  private async handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer) {
    const client = await this.authenticate(req);
    if (!client) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    this.wss!.handleUpgrade(req, socket, head, (ws) => {
      this.handleConnection(ws, client);
    });
  }

  private handleConnection(ws: WebSocket, client: ClientInfo) {
    this.clients.set(ws, client);
    this.clientThreads.set(ws, new Set());
    const wsAny = ws as WebSocket & { isAlive?: boolean };
    wsAny.isAlive = true;
    ws.on('pong', () => {
      wsAny.isAlive = true;
    });

    this.send(ws, { type: 'connected', userId: client.userId });

    ws.on('message', async (data) => {
      let msg: InboundMessage;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        return this.send(ws, { type: 'error', error: 'Invalid JSON' });
      }
      if (msg.type === 'ping') {
        return this.send(ws, { type: 'pong' });
      }
      if (msg.type === 'subscribe') {
        const allowed = await this.canAccessThread(client, msg.threadId);
        if (!allowed) {
          return this.send(ws, { type: 'error', error: 'Forbidden thread' });
        }
        this.subscribe(ws, msg.threadId);
        return this.send(ws, { type: 'subscribed', threadId: msg.threadId });
      }
      if (msg.type === 'unsubscribe') {
        this.unsubscribe(ws, msg.threadId);
      }
    });

    ws.on('close', () => {
      this.cleanup(ws);
    });
    ws.on('error', (err) => {
      logger.warn({ err: err.message }, 'ws client error');
    });
  }

  /**
   * Cookie'den session çıkar, users tablosundan domain user yükle.
   * Satıcıysa sellerId de eklenir.
   */
  private async authenticate(req: IncomingMessage): Promise<ClientInfo | null> {
    try {
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) {
        if (typeof v === 'string') headers.set(k, v);
        else if (Array.isArray(v)) headers.set(k, v.join(','));
      }
      const session = await this.authService.auth.api.getSession({ headers });
      if (!session?.user) return null;
      const rows = await this.db
        .select({
          id: users.id,
          authUserId: users.authUserId,
          role: users.role,
        })
        .from(users)
        .where(and(eq(users.authUserId, session.user.id), isNull(users.deletedAt)))
        .limit(1);
      const u = rows[0];
      if (!u) return null;
      let sellerId: string | null = null;
      if (u.role === 'seller') {
        // sellers tablosundan seller id'yi bul
        const sellerRows = await this.db.execute<{ id: string }>(
          `SELECT id FROM sellers WHERE user_id = '${u.id}' AND deleted_at IS NULL LIMIT 1` as never,
        );
        const list = (sellerRows as unknown as Array<{ id: string }>);
        sellerId = list[0]?.id ?? null;
      }
      return { userId: u.id, authUserId: u.authUserId, role: u.role, sellerId };
    } catch (err) {
      logger.warn({ err: String(err) }, 'ws auth failed');
      return null;
    }
  }

  private async canAccessThread(client: ClientInfo, threadId: string): Promise<boolean> {
    const rows = await this.db
      .select({ userId: chatThreads.userId, sellerId: chatThreads.sellerId })
      .from(chatThreads)
      .where(eq(chatThreads.id, threadId))
      .limit(1);
    const t = rows[0];
    if (!t) return false;
    if (t.userId === client.userId) return true;
    if (client.sellerId && t.sellerId === client.sellerId) return true;
    return false;
  }

  private subscribe(ws: WebSocket, threadId: string) {
    const set = this.threadSubs.get(threadId) ?? new Set();
    set.add(ws);
    this.threadSubs.set(threadId, set);
    this.clientThreads.get(ws)?.add(threadId);
  }

  private unsubscribe(ws: WebSocket, threadId: string) {
    this.threadSubs.get(threadId)?.delete(ws);
    this.clientThreads.get(ws)?.delete(threadId);
  }

  private cleanup(ws: WebSocket) {
    const threads = this.clientThreads.get(ws);
    if (threads) {
      for (const t of threads) {
        this.threadSubs.get(t)?.delete(ws);
      }
    }
  }

  private send(ws: WebSocket, msg: OutboundMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  /**
   * ChatService bu fonksiyonu çağırır — yeni mesaj geldiğinde subscriber'lara
   * push eder.
   */
  broadcastNewMessage(
    threadId: string,
    message: {
      id: string;
      threadId: string;
      senderRole: 'user' | 'seller' | 'system';
      body: string;
      attachments: unknown;
      createdAt: Date;
    },
  ) {
    const set = this.threadSubs.get(threadId);
    if (!set || set.size === 0) return;
    const payload: OutboundMessage = {
      type: 'message',
      threadId,
      message: {
        ...message,
        createdAt: message.createdAt.toISOString(),
      },
    };
    const data = JSON.stringify(payload);
    for (const ws of set) {
      if (ws.readyState === WebSocket.OPEN) ws.send(data);
    }
  }
}
