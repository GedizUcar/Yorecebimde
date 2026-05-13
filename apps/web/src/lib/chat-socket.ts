'use client';

import { useEffect, useRef, useState } from 'react';

type IncomingMessage =
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

export type ChatSocketMessage = Extract<IncomingMessage, { type: 'message' }>['message'];

type Options = {
  /** WS connected, subscribe başarılı sonrası tetiklenir. */
  onConnected?: () => void;
  /** Yeni mesaj geldiğinde — duplicate'leri caller filtrele. */
  onMessage?: (msg: ChatSocketMessage) => void;
  /** Auth/forbidden fail durumu. */
  onError?: (err: string) => void;
};

export type ChatSocketState = 'connecting' | 'open' | 'closed';

const RECONNECT_DELAY = 2_000;

function wsUrl(): string {
  // Same-origin: wss:// + host + /ws
  if (typeof window === 'undefined') return '';
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws`;
}

/**
 * Thread-based chat socket. Otomatik reconnect + heartbeat içerir.
 * threadId değişirse re-subscribe yapar.
 */
export function useChatSocket(threadId: string | null, options: Options = {}) {
  const [state, setState] = useState<ChatSocketState>('closed');
  const wsRef = useRef<WebSocket | null>(null);
  const subscribedThreadRef = useRef<string | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const optsRef = useRef(options);
  optsRef.current = options;

  useEffect(() => {
    if (!threadId) return;
    let cancelled = false;

    function connect() {
      if (cancelled) return;
      setState('connecting');
      const ws = new WebSocket(wsUrl());
      wsRef.current = ws;

      ws.addEventListener('open', () => {
        setState('open');
        if (threadId) {
          ws.send(JSON.stringify({ type: 'subscribe', threadId }));
          subscribedThreadRef.current = threadId;
        }
        // Heartbeat
        if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25_000);
      });

      ws.addEventListener('message', (e) => {
        try {
          const msg = JSON.parse(e.data) as IncomingMessage;
          if (msg.type === 'message' && msg.threadId === threadId) {
            optsRef.current.onMessage?.(msg.message);
          } else if (msg.type === 'subscribed') {
            optsRef.current.onConnected?.();
          } else if (msg.type === 'error') {
            optsRef.current.onError?.(msg.error);
          }
        } catch {
          // ignore
        }
      });

      ws.addEventListener('close', () => {
        setState('closed');
        if (heartbeatTimerRef.current) {
          clearInterval(heartbeatTimerRef.current);
          heartbeatTimerRef.current = null;
        }
        if (!cancelled) {
          // Auto reconnect
          reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY);
        }
      });

      ws.addEventListener('error', () => {
        // Close zaten tetiklenecek
      });
    }

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({ type: 'unsubscribe', threadId: subscribedThreadRef.current }),
        );
        wsRef.current.close();
      }
      wsRef.current = null;
      subscribedThreadRef.current = null;
    };
  }, [threadId]);

  return { state };
}
