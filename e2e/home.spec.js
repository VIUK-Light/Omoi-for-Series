const { test, expect } = require('@playwright/test');

test('hub opens a series and renders its setup screen', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Omoi for Series/);
  await expect(page.getByRole('heading', { name: 'Omoi for Series' })).toBeVisible();
  await page.getByRole('link', { name: /Couples/ }).click();

  await expect(page).toHaveURL(/\/couples\/$/);
  await expect(page.getByRole('heading', { name: 'ふたりを、もう少し知る' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lite' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Deep' })).toBeVisible();
});
