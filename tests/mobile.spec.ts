import { test, expect } from '@playwright/test';

test('mobile menu opens and navigates', async ({ page }) => {
  await page.goto('/');
  await page.locator('#menu-toggle').click();
  await expect(page.locator('#mobile-menu')).toBeVisible();
  await page.locator('#mobile-menu a[href="#proyectos"]').click();
  await expect(page.locator('#mobile-menu')).toBeHidden();
  await expect(page.locator('#proyectos')).toBeInViewport();
});

test('no horizontal overflow on mobile', async ({ page }) => {
  await page.goto('/');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
