'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, ClientApiError } from '@/lib/api-client';
import type { Category, Product } from '@/lib/api-types';
import { ImageUploader } from './image-uploader';

type Step = 'info' | 'images' | 'review';

type FormState = {
  nameTr: string;
  shortDescriptionTr: string;
  descriptionTr: string;
  unit: 'kg' | 'g' | 'lt' | 'ml' | 'adet' | 'paket' | 'kasa' | 'demet' | 'tane';
  baseUnitPrice: string;
  kdvRate: string;
  kdvIncluded: boolean;
  stockQuantity: string;
  isColdChain: boolean;
  categoryIds: string[];
  primaryCategoryId: string;
};

export function NewProductForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('info');
  const [submitting, setSubmitting] = useState(false);
  const [createdProduct, setCreatedProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    nameTr: '',
    shortDescriptionTr: '',
    descriptionTr: '',
    unit: 'kg',
    baseUnitPrice: '',
    kdvRate: '8.00',
    kdvIncluded: true,
    stockQuantity: '0',
    isColdChain: false,
    categoryIds: [],
    primaryCategoryId: '',
  });

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleCategory(id: string) {
    setForm((f) => {
      const exists = f.categoryIds.includes(id);
      const next = exists ? f.categoryIds.filter((x) => x !== id) : [...f.categoryIds, id];
      const primary =
        f.primaryCategoryId === id && exists
          ? (next[0] ?? '')
          : f.primaryCategoryId || (next[0] ?? '');
      return { ...f, categoryIds: next, primaryCategoryId: primary };
    });
  }

  async function handleCreate() {
    setError(null);
    if (form.nameTr.length < 3) {
      setError('Ürün adı en az 3 karakter olmalı');
      return;
    }
    if (!form.baseUnitPrice || Number(form.baseUnitPrice) <= 0) {
      setError('Geçerli bir fiyat girin');
      return;
    }
    if (form.categoryIds.length === 0) {
      setError('En az bir kategori seçin');
      return;
    }
    setSubmitting(true);
    try {
      const product = await apiClient.post<Product>('/v1/seller/products', {
        nameTr: form.nameTr,
        shortDescriptionTr: form.shortDescriptionTr || undefined,
        descriptionTr: form.descriptionTr || undefined,
        unit: form.unit,
        baseUnitPrice: Number(form.baseUnitPrice),
        kdvRate: Number(form.kdvRate),
        kdvIncluded: form.kdvIncluded,
        stockQuantity: Number(form.stockQuantity),
        isColdChain: form.isColdChain,
        variationMode: 'none',
        categoryIds: form.categoryIds,
        primaryCategoryId: form.primaryCategoryId,
      });
      setCreatedProduct(product);
      setStep('images');
    } catch (e) {
      setError(
        e instanceof ClientApiError ? e.message : 'Ürün oluşturulamadı, lütfen tekrar deneyin',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePublish() {
    if (!createdProduct) return;
    setSubmitting(true);
    try {
      await apiClient.post(`/v1/seller/products/${createdProduct.id}/publish`);
      router.push('/seller/products');
    } catch (e) {
      setError(
        e instanceof ClientApiError ? e.message : 'Yayına alınamadı, lütfen tekrar deneyin',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <StepIndicator current={step} />

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 text-red-800 px-4 py-2 text-sm">
          {error}
        </div>
      )}

      {step === 'info' && (
        <div className="space-y-6 bg-canvas border border-hairline rounded-lg p-6">
          <div>
            <label className="block text-sm font-medium mb-1">Ürün adı *</label>
            <input
              type="text"
              value={form.nameTr}
              onChange={(e) => update('nameTr', e.target.value)}
              placeholder="Örn: Ezine Beyaz Peyniri - Tam Yağlı"
              className="w-full px-3 py-2 border border-hairline rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Kısa açıklama</label>
            <input
              type="text"
              value={form.shortDescriptionTr}
              onChange={(e) => update('shortDescriptionTr', e.target.value)}
              maxLength={500}
              placeholder="Tek satırlık özet (max 500 karakter)"
              className="w-full px-3 py-2 border border-hairline rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Uzun açıklama</label>
            <textarea
              value={form.descriptionTr}
              onChange={(e) => update('descriptionTr', e.target.value)}
              rows={5}
              placeholder="Üretim hikayesi, içerik, kullanım önerileri..."
              className="w-full px-3 py-2 border border-hairline rounded-md"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Birim *</label>
              <select
                value={form.unit}
                onChange={(e) => update('unit', e.target.value as FormState['unit'])}
                className="w-full px-3 py-2 border border-hairline rounded-md"
              >
                <option value="kg">Kilogram (kg)</option>
                <option value="g">Gram (g)</option>
                <option value="lt">Litre (lt)</option>
                <option value="ml">Mililitre (ml)</option>
                <option value="adet">Adet</option>
                <option value="paket">Paket</option>
                <option value="kasa">Kasa</option>
                <option value="demet">Demet</option>
                <option value="tane">Tane</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fiyat (₺/birim) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.baseUnitPrice}
                onChange={(e) => update('baseUnitPrice', e.target.value)}
                className="w-full px-3 py-2 border border-hairline rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">KDV oranı (%) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="50"
                value={form.kdvRate}
                onChange={(e) => update('kdvRate', e.target.value)}
                className="w-full px-3 py-2 border border-hairline rounded-md"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.kdvIncluded}
                onChange={(e) => update('kdvIncluded', e.target.checked)}
              />
              Fiyata KDV dahil
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isColdChain}
                onChange={(e) => update('isColdChain', e.target.checked)}
              />
              Soğuk zincir gerektirir
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Başlangıç stoğu *</label>
            <input
              type="number"
              step="0.001"
              min="0"
              value={form.stockQuantity}
              onChange={(e) => update('stockQuantity', e.target.value)}
              className="w-full px-3 py-2 border border-hairline rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Kategoriler *</label>
            <p className="text-xs text-ink-muted80 mb-2">
              En fazla 5 kategori seçebilirsiniz. Birincil kategoriyi yıldız ile işaretleyin.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-72 overflow-y-auto border border-hairline rounded-md p-3">
              {categories.map((c) => {
                const checked = form.categoryIds.includes(c.id);
                const isPrimary = form.primaryCategoryId === c.id;
                return (
                  <div key={c.id} className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm flex-1">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCategory(c.id)}
                      />
                      <span className={c.depth > 0 ? 'text-ink-muted80' : ''}>
                        {'  '.repeat(c.depth)}
                        {c.nameTr}
                      </span>
                    </label>
                    {checked && (
                      <button
                        type="button"
                        onClick={() => update('primaryCategoryId', c.id)}
                        className={`text-xs px-2 py-0.5 rounded ${
                          isPrimary
                            ? 'bg-primary text-white'
                            : 'border border-hairline text-ink-muted80'
                        }`}
                        title="Birincil kategori"
                      >
                        ★
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-hairline">
            <button
              type="button"
              onClick={handleCreate}
              disabled={submitting}
              className="px-6 py-2 rounded-pill bg-primary text-white font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Kaydediliyor…' : 'Devam → Görseller'}
            </button>
          </div>
        </div>
      )}

      {step === 'images' && createdProduct && (
        <div className="space-y-6 bg-canvas border border-hairline rounded-lg p-6">
          <div>
            <h2 className="text-lg font-semibold">Görseller</h2>
            <p className="text-sm text-ink-muted80">
              En fazla 3 görsel ekleyebilirsiniz. JPG, PNG, WebP veya AVIF formatında 10 MB'a kadar.
            </p>
          </div>
          <ImageUploader productId={createdProduct.id} />
          <div className="flex justify-between pt-4 border-t border-hairline">
            <button
              type="button"
              onClick={() => router.push('/seller/products')}
              className="px-6 py-2 rounded-pill border border-hairline font-medium hover:bg-canvas-parchment transition-colors"
            >
              Taslak olarak kaydet
            </button>
            <button
              type="button"
              onClick={() => setStep('review')}
              className="px-6 py-2 rounded-pill bg-primary text-white font-medium hover:bg-primary-700 transition-colors"
            >
              Devam → Önizleme
            </button>
          </div>
        </div>
      )}

      {step === 'review' && createdProduct && (
        <div className="space-y-6 bg-canvas border border-hairline rounded-lg p-6">
          <div>
            <h2 className="text-lg font-semibold">Önizleme</h2>
            <p className="text-sm text-ink-muted80">
              Yayına almadan önce ürün bilgilerinizi kontrol edin.
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-ink-muted80">Ad:</dt>
            <dd>{form.nameTr}</dd>
            <dt className="text-ink-muted80">Fiyat:</dt>
            <dd>
              {form.baseUnitPrice} ₺ / {form.unit} ({form.kdvIncluded ? 'KDV dahil' : 'KDV hariç'})
            </dd>
            <dt className="text-ink-muted80">Stok:</dt>
            <dd>
              {form.stockQuantity} {form.unit}
            </dd>
            <dt className="text-ink-muted80">Soğuk zincir:</dt>
            <dd>{form.isColdChain ? 'Evet ❄' : 'Hayır'}</dd>
          </dl>
          <div className="flex justify-between pt-4 border-t border-hairline">
            <button
              type="button"
              onClick={() => setStep('images')}
              className="px-6 py-2 rounded-pill border border-hairline font-medium hover:bg-canvas-parchment transition-colors"
            >
              ← Geri
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={submitting}
              className="px-6 py-2 rounded-pill bg-primary text-white font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Yayına alınıyor…' : 'Yayına al'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StepIndicator({ current }: { current: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: 'info', label: '1. Ürün bilgileri' },
    { id: 'images', label: '2. Görseller' },
    { id: 'review', label: '3. Yayına al' },
  ];
  const currentIdx = steps.findIndex((s) => s.id === current);

  return (
    <div className="flex items-center gap-4">
      {steps.map((s, i) => {
        const isActive = i === currentIdx;
        const isDone = i < currentIdx;
        return (
          <div key={s.id} className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                isActive || isDone ? 'bg-primary text-white' : 'bg-canvas-parchment text-ink-muted80'
              }`}
            >
              {isDone ? '✓' : i + 1}
            </span>
            <span className={isActive ? 'font-medium' : 'text-ink-muted80'}>{s.label}</span>
            {i < steps.length - 1 && <span className="text-ink-muted80">›</span>}
          </div>
        );
      })}
    </div>
  );
}
