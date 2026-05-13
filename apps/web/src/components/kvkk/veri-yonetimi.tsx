'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, ClientApiError } from '@/lib/api-client';
import { authClient } from '@/lib/auth-client';
import { useToast } from '@/components/toast';

export function VeriYonetimi() {
  const router = useRouter();
  const { show } = useToast();
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function downloadExport() {
    setExporting(true);
    try {
      const data = await apiClient.get<Record<string, unknown>>('/v1/kvkk-me/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `yorecebimde-verilerim-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      show('Verileriniz indirildi', 'success');
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'İndirme başarısız', 'error');
    } finally {
      setExporting(false);
    }
  }

  async function confirmDelete() {
    if (confirmText !== 'HESABIMI SİL') {
      show('Onay metnini tam yazın', 'error');
      return;
    }
    setDeleting(true);
    try {
      await apiClient.post('/v1/kvkk-me/delete-account', { confirm: true });
      await authClient.signOut();
      show('Hesabınız silindi. Verileriniz anonimleştirildi.', 'info');
      router.push('/');
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'Silme başarısız', 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg bg-canvas border border-hairline p-6 space-y-3">
        <h2 className="font-semibold">📦 Verilerimi İndir</h2>
        <p className="text-sm text-ink-muted80">
          Profil, adres, sipariş, puan, yorum, soru ve davet bilgilerinizi içeren tam veri
          paketinizi JSON formatında indirin. KVKK madde 11/d kapsamında erişim hakkınız.
        </p>
        <button
          type="button"
          onClick={downloadExport}
          disabled={exporting}
          className="px-4 py-2 rounded-pill bg-primary text-white text-sm hover:bg-primary-700 disabled:opacity-60"
        >
          {exporting ? 'Hazırlanıyor…' : 'JSON İndir'}
        </button>
      </section>

      <section className="rounded-lg bg-red-50 border border-red-200 p-6 space-y-3">
        <h2 className="font-semibold text-red-700">⚠ Hesabımı Sil</h2>
        <p className="text-sm text-red-700/80">
          Hesabınız kapatılır, isim/adres/iletişim bilgileriniz anonimleştirilir. <strong>Bu işlem
          geri alınamaz.</strong> Sipariş ve fatura kayıtları yasal saklama yükümlülüğü gereği
          anonim olarak tutulur (KVKK madde 28).
        </p>

        {!deleteOpen ? (
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="px-4 py-2 rounded-pill border border-red-700 text-red-700 text-sm hover:bg-red-100"
          >
            Hesabımı Silmek İstiyorum
          </button>
        ) : (
          <div className="space-y-3 pt-3 border-t border-red-200">
            <p className="text-sm">
              Devam etmek için aşağıdaki kutuya <code className="font-mono bg-canvas px-1">HESABIMI SİL</code> yazın:
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="HESABIMI SİL"
              className="w-full px-3 py-2 border border-red-300 rounded-md text-sm font-mono"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteOpen(false);
                  setConfirmText('');
                }}
                className="px-4 py-2 rounded-pill border border-hairline text-sm hover:bg-canvas"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={confirmText !== 'HESABIMI SİL' || deleting}
                className="px-4 py-2 rounded-pill bg-red-700 text-white text-sm hover:bg-red-800 disabled:opacity-60"
              >
                {deleting ? 'Siliniyor…' : 'Hesabı Kalıcı Olarak Sil'}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
