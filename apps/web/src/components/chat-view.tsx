'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient, ClientApiError } from '@/lib/api-client';
import { useChatSocket, type ChatSocketMessage } from '@/lib/chat-socket';
import { useToast } from '@/components/toast';

type Thread = {
  thread?: {
    id: string;
    kind: 'order' | 'direct';
    sellerId: string;
    userId: string;
    lastMessageAt: string;
    orderId: string | null;
  };
  id?: string;
  kind?: string;
  sellerId?: string;
  userId?: string;
  lastMessageAt?: string;
  seller?: { slug: string; displayName: string };
};

type Message = {
  id: string;
  threadId: string;
  senderRole: 'user' | 'seller' | 'system';
  body: string;
  createdAt: string;
};

export function ChatView({ scope }: { scope: 'customer' | 'seller' }) {
  const { show } = useToast();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiClient
      .get<Thread[]>('/v1/chat/threads')
      .then((list) => {
        setThreads(list);
        if (list.length > 0 && !activeId) {
          const firstId = list[0]!.thread?.id ?? list[0]!.id ?? null;
          if (firstId) setActiveId(firstId);
        }
      })
      .catch(() => setThreads([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMessages = useCallback(async (id: string) => {
    try {
      const data = await apiClient.get<{ thread: unknown; messages: Message[] }>(
        `/v1/chat/threads/${id}/messages`,
      );
      setMessages(data.messages);
      setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 50);
    } catch {
      // sessizce
    }
  }, []);

  useEffect(() => {
    if (!activeId) return;
    void loadMessages(activeId);
    apiClient.post(`/v1/chat/threads/${activeId}/read`).catch(() => undefined);
  }, [activeId, loadMessages]);

  const handleWsMessage = useCallback((msg: ChatSocketMessage) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [
        ...prev,
        {
          id: msg.id,
          threadId: msg.threadId,
          senderRole: msg.senderRole,
          body: msg.body,
          createdAt: msg.createdAt,
        },
      ];
    });
    setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 50);
  }, []);

  const { state: wsState } = useChatSocket(activeId, { onMessage: handleWsMessage });

  // Fallback polling — WS bağlı değilse her 6 sn
  useEffect(() => {
    if (!activeId || wsState === 'open') return;
    const handle = setInterval(() => loadMessages(activeId), 6000);
    return () => clearInterval(handle);
  }, [activeId, wsState, loadMessages]);

  async function send() {
    if (!activeId || !body.trim()) return;
    setBusy(true);
    try {
      const inserted = await apiClient.post<Message>(
        `/v1/chat/threads/${activeId}/messages`,
        { body, attachments: [] },
      );
      setMessages((prev) => (prev.some((m) => m.id === inserted.id) ? prev : [...prev, inserted]));
      setBody('');
      setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 50);
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'Gönderilemedi', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid md:grid-cols-3 gap-4 h-[600px]">
      <aside className="md:col-span-1 rounded-lg bg-canvas border border-hairline overflow-y-auto">
        {threads.length === 0 ? (
          <p className="p-6 text-sm text-ink-muted80">Henüz konuşma yok.</p>
        ) : (
          <ul className="divide-y divide-hairline">
            {threads.map((t, i) => {
              const id = t.thread?.id ?? t.id;
              const lastAt = t.thread?.lastMessageAt ?? t.lastMessageAt;
              const sellerName = t.seller?.displayName ?? 'Konuşma';
              if (!id) return null;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(id)}
                    className={`w-full text-left px-4 py-3 hover:bg-canvas-parchment transition-colors ${
                      activeId === id ? 'bg-canvas-parchment' : ''
                    }`}
                  >
                    <p className="font-medium text-sm line-clamp-1">
                      {scope === 'customer' ? sellerName : `#${i + 1}`}
                    </p>
                    {lastAt && (
                      <p className="text-xs text-ink-muted80">
                        {new Date(lastAt).toLocaleString('tr-TR')}
                      </p>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>
      <section className="md:col-span-2 rounded-lg bg-canvas border border-hairline flex flex-col">
        {!activeId ? (
          <p className="m-auto text-sm text-ink-muted80">Bir konuşma seçin</p>
        ) : (
          <>
            <div className="px-4 py-2 border-b border-hairline text-xs text-ink-muted80">
              {wsState === 'open'
                ? '🟢 Canlı (WebSocket)'
                : wsState === 'connecting'
                  ? '🟡 Bağlanıyor…'
                  : '⚪ Polling moduna düşüldü'}
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.map((m) => {
                const mine =
                  (scope === 'customer' && m.senderRole === 'user') ||
                  (scope === 'seller' && m.senderRole === 'seller');
                return (
                  <div
                    key={m.id}
                    className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                      mine ? 'ml-auto bg-primary text-white' : 'bg-canvas-parchment'
                    }`}
                  >
                    <p className="whitespace-pre-line">{m.body}</p>
                    <p className={`text-xs mt-1 ${mine ? 'text-white/70' : 'text-ink-muted80'}`}>
                      {new Date(m.createdAt).toLocaleTimeString('tr-TR')}
                    </p>
                  </div>
                );
              })}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
              className="border-t border-hairline p-3 flex gap-2"
            >
              <input
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Mesaj yaz…"
                className="flex-1 px-3 py-2 border border-hairline rounded-md text-sm"
              />
              <button
                type="submit"
                disabled={busy || !body.trim()}
                className="px-4 py-2 rounded-pill bg-primary text-white text-sm font-medium disabled:opacity-60"
              >
                Gönder
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
