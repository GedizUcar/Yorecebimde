'use client';

import { useEffect, useRef, useState } from 'react';
import { ClientApiError } from '@/lib/api-client';

type HistoryEntry = {
  role: 'user' | 'model' | 'function';
  content: string;
  name?: string;
};

type Message = {
  id: string;
  role: 'user' | 'bot';
  content: string;
};

/**
 * AI bot widget. Sağ alt köşede sabit FAB + açılır chat panel.
 * Conversation history sadece component state'te — sayfa kapanınca silinir.
 */
export function BotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'bot',
      content:
        'Merhaba! Ben Yöre, Yörecebimde asistanı. Yöresel ürün aramaya, sepete eklemeye veya sipariş tamamlamaya yardımcı olabilirim. Ne arıyorsun?',
    },
  ]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setErr(null);
    setInput('');
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: text };
    const botMsgId = `b-${Date.now()}`;
    setMessages((m) => [...m, userMsg, { id: botMsgId, role: 'bot', content: '' }]);
    setBusy(true);

    try {
      const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
      const res = await fetch(`${base}/v1/bot/chat-stream`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'Accept-Language': 'tr' },
        body: JSON.stringify({ message: text, history, locale: 'tr' }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        // SSE event'leri parse et — \n\n ile ayrılır
        let idx;
        while ((idx = buf.indexOf('\n\n')) !== -1) {
          const eventBlock = buf.slice(0, idx);
          buf = buf.slice(idx + 2);

          let eventType = 'message';
          let data = '';
          for (const line of eventBlock.split('\n')) {
            if (line.startsWith('event: ')) eventType = line.slice(7);
            else if (line.startsWith('data: ')) data = line.slice(6);
          }
          if (!data) continue;

          try {
            const parsed = JSON.parse(data);
            if (eventType === 'token' && parsed.text) {
              accumulated += parsed.text;
              setMessages((m) =>
                m.map((msg) =>
                  msg.id === botMsgId ? { ...msg, content: accumulated } : msg,
                ),
              );
            } else if (eventType === 'done' && parsed.history) {
              setHistory(parsed.history);
            } else if (eventType === 'error') {
              setErr(parsed.message ?? 'Bot hatası');
            }
            // function + function_result event'leri şu an kullanıcıya gösterilmiyor (Faz 8: tool result kartları)
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (e) {
      setErr(e instanceof ClientApiError ? e.message : 'Bot şu an cevap veremiyor.');
      setMessages((m) => m.filter((msg) => msg.id !== botMsgId || msg.content));
    } finally {
      setBusy(false);
    }
  }

  function resetChat() {
    setMessages([
      {
        id: 'welcome-reset',
        role: 'bot',
        content: 'Sohbet sıfırlandı. Yardımcı olabileceğim başka bir konu var mı?',
      },
    ]);
    setHistory([]);
    setErr(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Yöre asistana sor"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-white shadow-lg hover:bg-primary-700 flex items-center justify-center text-2xl"
      >
        {open ? '×' : '💬'}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-3rem)] h-[520px] max-h-[calc(100vh-8rem)] rounded-lg bg-canvas border border-hairline shadow-2xl flex flex-col">
          <div className="px-4 py-3 border-b border-hairline flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">Yöre · Yörecebimde asistanı</p>
              <p className="text-xs text-ink-muted80">Geçmiş kaydedilmez</p>
            </div>
            <button
              type="button"
              onClick={resetChat}
              className="text-xs text-ink-muted80 hover:text-primary"
            >
              Sıfırla
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-primary text-white'
                      : 'bg-canvas-parchment text-ink'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="bg-canvas-parchment rounded-lg px-3 py-2 text-sm text-ink-muted80">
                  <span className="inline-block animate-pulse">●●●</span>
                </div>
              </div>
            )}
            {err && (
              <div className="text-xs text-red-700 bg-red-50 rounded-md p-2">{err}</div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
            className="border-t border-hairline p-3 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Soru sor…"
              disabled={busy}
              maxLength={2000}
              className="flex-1 px-3 py-2 border border-hairline rounded-md text-sm focus:border-primary-focus focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="px-4 py-2 rounded-pill bg-primary text-white text-sm hover:bg-primary-700 disabled:opacity-50"
            >
              →
            </button>
          </form>
        </div>
      )}
    </>
  );
}
