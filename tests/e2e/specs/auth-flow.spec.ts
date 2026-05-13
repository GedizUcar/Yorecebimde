import { test, expect } from '@playwright/test';

test.describe('Auth flow', () => {
  test('giriş sayfası açılır, hatalı şifre red verir', async ({ page }) => {
    await page.goto('/giris');

    // Cookie banner bypass
    await page.getByRole('button', { name: /Sadece Zorunlu/i }).click().catch(() => {});

    await page.getByLabel(/E[- ]?posta/i).fill('test@example.com');
    await page.getByLabel(/Şifre/i).fill('WrongPassword!1');
    await page.getByRole('button', { name: /Giriş/i }).click();

    // Backend invalid credentials hatası göstermeli
    await expect(page.getByText(/şifre|geçersiz|hata/i).first()).toBeVisible({
      timeout: 5_000,
    });
  });

  test('kayıt sayfası KVKK checkbox zorunlu kontrolü', async ({ page }) => {
    await page.goto('/kayit');
    await page.getByRole('button', { name: /Sadece Zorunlu/i }).click().catch(() => {});

    // Form alanlarını doldur ama KVKK işaretleme
    await page.getByLabel(/Ad/i).first().fill('Test');
    await page.getByLabel(/Soyad/i).fill('User');
    await page.getByLabel(/E[- ]?posta/i).fill(`test+${Date.now()}@example.com`);
    await page.getByLabel(/Telefon/i).fill('05551234567');
    await page.getByLabel(/Şifre/i).fill('TestPassword!1');

    await page.getByRole('button', { name: /Kayıt|Kaydı/i }).click();

    // KVKK hatası görmeli
    await expect(page.getByText(/KVKK/i).first()).toBeVisible();
  });
});
