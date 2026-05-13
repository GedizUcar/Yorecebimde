import { test, expect } from '@playwright/test';

test.describe('Cookie banner', () => {
  test('ilk ziyarette gösterilir, "Sadece Zorunlu" kapatır', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');

    await expect(page.getByText(/çerez/i).first()).toBeVisible();

    await page.getByRole('button', { name: /Sadece Zorunlu/i }).click();
    await expect(page.getByText(/Tümünü Kabul/i)).not.toBeVisible();

    // Reload sonrası tekrar gösterilmemeli
    await page.reload();
    await expect(page.getByText(/Tümünü Kabul/i)).not.toBeVisible();
  });

  test('"Ayarla" kategori bazlı kontrol veriyor', async ({ page, context }) => {
    await context.clearCookies();
    // localStorage da temizle
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await page.getByRole('button', { name: /Ayarla/i }).click();

    await expect(page.getByText(/Zorunlu çerezler/i)).toBeVisible();
    await expect(page.getByText(/Analitik çerezler/i)).toBeVisible();
    await expect(page.getByText(/Pazarlama çerezleri/i)).toBeVisible();
  });
});
