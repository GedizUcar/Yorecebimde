'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, ClientApiError } from '@/lib/api-client';
import type { ProductWithRelations } from '@/lib/api-types';
import { useToast } from '@/components/toast';
import { ImageUploader } from './image-uploader';
import { VariationEditor } from './variation-editor';
import { DiscountEditor } from './discount-editor';
import { StockEditor } from './stock-editor';

type Section = 'general' | 'variations' | 'discounts' | 'stock' | 'images';

export function EditProductForm({ product }: { product: ProductWithRelations }) {
  const router = useRouter();
  const { show } = useToast();
  const [section, setSection] = useState<Section>('general');

  const [form, setForm] = useState({
    nameTr: product.nameTr,
    shortDescriptionTr: product.shortDescriptionTr ?? '',
    descriptionTr: product.descriptionTr ?? '',
    baseUnitPrice: product.baseUnitPrice,
    kdvRate: product.kdvRate,
    kdvIncluded: product.kdvIncluded,
    isColdChain: product.isColdChain,
    variationMode: product.variationMode,
    stepperMin: product.stepperMin ?? '',
    stepperMax: product.stepperMax ?? '',
    stepperStep: product.stepperStep ?? '',
    isActive: product.isActive,
  });
  const [saving, setSaving] = useState(false);

  function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function saveGeneral() {
    setSaving(true);
    try {
      const patch: Record<string, unknown> = {
        nameTr: form.nameTr,
        shortDescriptionTr: form.shortDescriptionTr || undefined,
        descriptionTr: form.descriptionTr || undefined,
        baseUnitPrice: Number(form.baseUnitPrice),
        kdvRate: Number(form.kdvRate),
        kdvIncluded: form.kdvIncluded,
        isColdChain: form.isColdChain,
        variationMode: form.variationMode,
      };
      if (form.variationMode === 'stepper') {
        patch.stepperMin = Number(form.stepperMin);
        patch.stepperMax = Number(form.stepperMax);
        patch.stepperStep = Number(form.stepperStep);
      }
      await apiClient.patch(`/v1/seller/products/${product.id}`, patch);
      show('Ürün bilgileri kaydedildi', 'success');
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'Kaydedilemedi', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish() {
    setSaving(true);
    try {
      if (form.isActive) {
        await apiClient.post(`/v1/seller/products/${product.id}/unpublish`);
        update('isActive', false);
        show('Ürün yayından kaldırıldı', 'info');
      } else {
        await apiClient.post(`/v1/seller/products/${product.id}/publish`);
        update('isActive', true);
        show('Ürün yayına alındı', 'success');
      }
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'İşlem başarısız', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct() {
    if (!confirm('Bu ürünü silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return;
    try {
      await apiClient.delete(`/v1/seller/products/${product.id}`);
      show('Ürün silindi', 'success');
      router.push('/seller/products');
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'Silinemedi', 'error');
    }
  }

  const tabs: { id: Section; label: string }[] = [
    { id: 'general', label: 'Genel' },
    { id: 'variations', label: 'Varyasyonlar' },
    { id: 'discounts', label: 'İndirimler' },
    { id: 'stock', label: 'Stok' },
    { id: 'images', label: 'Görseller' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>{product.nameTr}</h1>
          <p className="text-sm text-ink-muted80">
            {form.isActive ? '🟢 Yayında' : '⚪ Taslak'} · {product.unit} bazında
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={togglePublish}
            disabled={saving}
            className="px-4 py-2 rounded-pill border border-hairline text-sm font-medium hover:bg-canvas-parchment disabled:opacity-50"
          >
            {form.isActive ? 'Yayından kaldır' : 'Yayına al'}
          </button>
          <button
            type="button"
            onClick={deleteProduct}
            className="px-4 py-2 rounded-pill border border-red-200 text-red-700 text-sm font-medium hover:bg-red-50"
          >
            Sil
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-hairline">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSection(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              section === t.id
                ? 'border-primary text-primary'
                : 'border-transparent text-ink-muted80 hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {section === 'general' && (
        <div className="space-y-4 bg-canvas border border-hairline rounded-lg p-6">
          <div>
            <label className="block text-sm font-medium mb-1">Ürün adı</label>
            <input
              type="text"
              value={form.nameTr}
              onChange={(e) => update('nameTr', e.target.value)}
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
              className="w-full px-3 py-2 border border-hairline rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Uzun açıklama</label>
            <textarea
              value={form.descriptionTr}
              onChange={(e) => update('descriptionTr', e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-hairline rounded-md"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Fiyat (₺)</label>
              <input
                type="number"
                step="0.01"
                value={form.baseUnitPrice}
                onChange={(e) => update('baseUnitPrice', e.target.value)}
                className="w-full px-3 py-2 border border-hairline rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">KDV (%)</label>
              <input
                type="number"
                step="0.01"
                value={form.kdvRate}
                onChange={(e) => update('kdvRate', e.target.value)}
                className="w-full px-3 py-2 border border-hairline rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Varyasyon modu</label>
              <select
                value={form.variationMode}
                onChange={(e) => update('variationMode', e.target.value as typeof form.variationMode)}
                className="w-full px-3 py-2 border border-hairline rounded-md"
              >
                <option value="none">Yok</option>
                <option value="discrete">Sabit seçenekler</option>
                <option value="stepper">Müşteri seçer (min/max/step)</option>
              </select>
            </div>
          </div>
          {form.variationMode === 'stepper' && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Min miktar</label>
                <input
                  type="number"
                  step="0.001"
                  value={form.stepperMin}
                  onChange={(e) => update('stepperMin', e.target.value)}
                  className="w-full px-3 py-2 border border-hairline rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Max miktar</label>
                <input
                  type="number"
                  step="0.001"
                  value={form.stepperMax}
                  onChange={(e) => update('stepperMax', e.target.value)}
                  className="w-full px-3 py-2 border border-hairline rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Adım</label>
                <input
                  type="number"
                  step="0.001"
                  value={form.stepperStep}
                  onChange={(e) => update('stepperStep', e.target.value)}
                  className="w-full px-3 py-2 border border-hairline rounded-md"
                />
              </div>
            </div>
          )}
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
              Soğuk zincir
            </label>
          </div>
          <div className="pt-4 border-t border-hairline">
            <button
              type="button"
              onClick={saveGeneral}
              disabled={saving}
              className="px-6 py-2 rounded-pill bg-primary text-white font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </div>
      )}

      {section === 'variations' && (
        <VariationEditor
          productId={product.id}
          variationMode={form.variationMode}
          initial={product.variations.map((v) => ({
            id: v.id,
            label: v.label,
            quantity: v.quantity,
            priceOverride: v.priceOverride,
            sku: v.sku,
            sortOrder: v.sortOrder,
            isActive: v.isActive,
          }))}
        />
      )}

      {section === 'discounts' && (
        <DiscountEditor productId={product.id} initial={product.discounts} />
      )}

      {section === 'stock' && (
        <StockEditor
          productId={product.id}
          currentStock={product.stockQuantity}
          unit={product.unit}
        />
      )}

      {section === 'images' && (
        <div className="bg-canvas border border-hairline rounded-lg p-6">
          <ImageUploader productId={product.id} />
        </div>
      )}
    </div>
  );
}
