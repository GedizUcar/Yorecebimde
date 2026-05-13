'use client';

import { useEffect, useState } from 'react';
import { apiClient, ClientApiError } from '@/lib/api-client';
import { authClient } from '@/lib/auth-client';

type Question = {
  id: string;
  body: string;
  answer: string | null;
  answeredAt: string | null;
  createdAt: string;
  askerName: string;
};

export function ProductQuestions({ productId }: { productId: string }) {
  const { data: session } = authClient.useSession();
  const [items, setItems] = useState<Question[] | null>(null);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function load() {
    apiClient
      .get<Question[]>(`/v1/questions/product/${productId}`)
      .then(setItems)
      .catch(() => setItems([]));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (body.trim().length < 5) {
      setErr('Soru en az 5 karakter olmalı');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post('/v1/questions', { productId, body });
      setBody('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (e) {
      setErr(e instanceof ClientApiError ? e.message : 'Soru gönderilemedi');
    } finally {
      setSubmitting(false);
    }
  }

  if (!items) return <p className="text-sm text-ink-muted80">Yükleniyor…</p>;

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <p className="text-sm text-ink-muted80">Bu ürün için henüz soru yok.</p>
      ) : (
        <div className="space-y-3">
          {items.map((q) => (
            <div key={q.id} className="rounded-lg bg-canvas border border-hairline p-4 space-y-2">
              <div className="flex items-start gap-2">
                <span className="font-mono text-primary text-sm">S:</span>
                <div className="flex-1">
                  <p className="text-sm">{q.body}</p>
                  <p className="text-xs text-ink-muted80 mt-1">
                    {q.askerName} · {new Date(q.createdAt).toLocaleDateString('tr-TR')}
                  </p>
                </div>
              </div>
              {q.answer && (
                <div className="flex items-start gap-2 pt-2 border-t border-hairline">
                  <span className="font-mono text-green-700 text-sm">C:</span>
                  <div className="flex-1">
                    <p className="text-sm">{q.answer}</p>
                    {q.answeredAt && (
                      <p className="text-xs text-ink-muted80 mt-1">
                        Satıcı · {new Date(q.answeredAt).toLocaleDateString('tr-TR')}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {session?.user ? (
        <form onSubmit={submit} className="space-y-2 pt-4 border-t border-hairline">
          <label htmlFor="question-body" className="text-sm font-medium">
            Soru sorun:
          </label>
          <textarea
            id="question-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="Bu ürün hakkında sorunuz nedir?"
            className="w-full px-3 py-2 border border-hairline rounded-md text-sm"
            maxLength={1000}
          />
          {err && <p className="text-xs text-red-700">{err}</p>}
          {success && (
            <p className="text-xs text-green-700">
              ✓ Sorunuz alındı. Satıcı yanıtladığında burada görünecek.
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded-pill bg-primary text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-60"
          >
            {submitting ? 'Gönderiliyor…' : 'Soru gönder'}
          </button>
        </form>
      ) : (
        <p className="text-xs text-ink-muted80 pt-4 border-t border-hairline">
          Soru sormak için <a href="/giris" className="text-primary hover:underline">giriş yapın</a>.
        </p>
      )}
    </div>
  );
}
