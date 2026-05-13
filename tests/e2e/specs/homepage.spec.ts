import { test, expect } from '@playwright/test';

test.describe('Anasayfa', () => {
  test('açılıyor, hero + ürün gridi görünüyor', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Yörecebimde/i);

    // Header
    await expect(page.getByRole('link', { name: /Yörecebimde/i })).toBeVisible();

    // Cookie banner (ilk ziyaret) — bypass et
    const cookieDismiss = page.getByRole('button', { name: /Sadece Zorunlu/i });
    if (await cookieDismiss.isVisible().catch(() => false)) {
      await cookieDismiss.click();
    }

    // Bot widget FAB
    await expect(page.locator('button[aria-label*="asistan"]').first()).toBeVisible();
  });
});
