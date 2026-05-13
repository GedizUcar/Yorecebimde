'use client';

import { useEffect, useState } from 'react';
import { apiClient, ClientApiError } from '@/lib/api-client';
import { useToast } from '@/components/toast';

type Question = {
  id: string;
  productId: string;
  body: string;
  createdAt: string;
};

export function SellerQuestions() {
  const { show } = useToast();
  const [items, setItems] = useState<Question[] | null>(null);
  const [active, setActive] = useState<Question | null>(null);
  const [answer, setAnswer] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [busy, setBusy] = useState(false);

  function load() {
    apiClient
      .get<Question[]>('/v1/seller/questions/pending')
      .then(setItems)
      .catch(() => setItems([]));
  }
  useEffect(load, []);

  async function submit() {
    if (!active) return;
    if (answer.trim().length < 2) {
      show('Cevap çok kısa', 'error');
      return;
    }
    setBusy(true);
    try {
      await apiClient.post(`/v1/seller/questions/${active.id}/answer`, {
        answer: answer.trim(),
        isPublic,
      });
      show(isPublic ? 'Cevap yayınlandı' : 'Cevap kaydedildi (sadece müşteri görür)', 'success');
      setActive(null);
      setAnswer('');
      setIsPublic(true);
      load();
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'Cevap kaydedilemedi', 'error');
    } finally {
      setBusy(false);
    }
  }

  if (!items) return <p className="text-sm text-ink-muted80">Yükleniyor…</p>;
  if (items.length === 0) {
    return (
      <p className="text-sm text-ink-muted80 rounded-lg bg-canvas-parchment p-8 text-center">
        Şu an cevap bekleyen soru yok. 🎉
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((q) => (
        <div key={q.id} className="rounded-lg bg-canvas border border-hairline p-4 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-sm">{q.body}</p>
              <p className="text-xs text-ink-muted80 mt-1">
                {new Date(q.createdAt).toLocaleString('tr-TR')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActive(q)}
              className="px-4 py-2 rounded-pill bg-primary text-white text-sm hover:bg-primary-700 whitespace-nowrap"
            >
              Cevapla
            </button>
          </div>
        </div>
      ))}

      {active && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 p-4">
          <div className="bg-canvas rounded-lg max-w-lg w-full p-6 space-y-4">
            <h3 className="font-semibold">Soruyu Cevapla</h3>
            <div className="rounded-md bg-canvas-parchment p-3 text-sm">
              <span className="font-mono text-primary">S:</span> {active.body}
            </div>

            <div>
              <label htmlFor="answer" className="text-sm font-medium">
                Cevabınız:
              </label>
              <textarea
                id="answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="Soruya yanıt verin…"
                className="w-full mt-1 px-3 py-2 border border-hairline rounded-md text-sm"
              />
            </div>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="mt-1"
              />
              <span>
                <strong>Yayınla</strong> — ürün sayfasında soru-cevap olarak herkese görünsün
                <span className="block text-xs text-ink-muted80 mt-1">
                  İşaretlemezseniz sadece soruyu soran müşteri görür.
                </span>
              </span>
            </label>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActive(null)}
                className="px-4 py-2 rounded-pill border border-hairline text-sm hover:bg-canvas-parchment"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className="px-4 py-2 rounded-pill bg-primary text-white text-sm hover:bg-primary-700 disabled:opacity-60"
              >
                {busy ? 'Kaydediliyor…' : 'Cevabı Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
