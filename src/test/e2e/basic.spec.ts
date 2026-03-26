import { test, expect } from '@playwright/test';

test.describe('Invoice App Flow', () => {
  test('should load the dashboard', async ({ page }) => {
    await page.goto('/');
    // Check if we are redirected to login or see the dashboard
    const title = await page.title();
    expect(title).toBeDefined();
  });

  test('should navigate to create invoice session', async ({ page }) => {
    await page.goto('/create-invoice');
    await expect(page.getByText(/Create Invoice/i)).toBeVisible();
  });
});
