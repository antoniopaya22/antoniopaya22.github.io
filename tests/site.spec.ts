import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/** Collects console errors and CSP violations while a page is open. */
function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

const run = async (page: Page, cmd: string) => {
  const input = page.locator('#term-input');
  await input.fill(cmd);
  await input.press('Enter');
};

test.describe('home', () => {
  test('renders ES and EN without console or CSP errors', async ({ page }) => {
    const errors = trackErrors(page);
    for (const path of ['/', '/en/']) {
      await page.goto(path);
      await expect(page.locator('h1')).toContainText('Antonio Payá');
      await expect(page.locator('main section[id]')).toHaveCount(9);
    }
    expect(errors).toEqual([]);
  });

  test('has no serious accessibility violations', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const results = await new AxeBuilder({ page })
      .exclude('#net')
      .disableRules(['color-contrast']) // gradient/animated text is reported as false positives
      .analyze();
    const serious = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''));
    expect(serious.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
});

test.describe('terminal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('#term-input').click();
  });

  test('help lists the commands', async ({ page }) => {
    await run(page, 'help');
    await expect(page.locator('#term-out')).toContainText('publications');
  });

  test('publications lists every paper with a DOI link', async ({ page }) => {
    await run(page, 'publications');
    await expect(page.locator('#term-out a[href^="https://doi.org/"]')).toHaveCount(5);
  });

  test('unknown commands are reported', async ({ page }) => {
    await run(page, 'rmdir everything');
    await expect(page.locator('#term-out')).toContainText('comando no encontrado');
  });

  test('the hidden CTF can be solved', async ({ page }) => {
    await run(page, 'ls -a');
    await expect(page.locator('#term-out')).toContainText('.flag.enc');
    await run(page, 'base64 -d U1lOVHttcmViX2dlaGZnX2FyaXJlX2dlaGZnfQ==');
    await expect(page.locator('#term-out')).toContainText('SYNT{');
    await run(page, 'submit FLAG{nope}');
    await expect(page.locator('#term-out')).toContainText('incorrecta');
    await run(page, 'submit FLAG{zero_trust_never_trust}');
    await expect(page.locator('#term-out')).toContainText('Flag correcta');
  });
});

test('command palette filters and navigates', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Control+k');
  const dialog = page.locator('#palette');
  await expect(dialog).toBeVisible();
  await page.locator('#pal-input').fill('docencia');
  await expect(dialog.locator('.pal-item:not([hidden])')).toHaveCount(1);
  await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden();
  await expect(page.locator('#docencia')).toBeInViewport();
});

test('theme toggle persists', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-theme-toggle]').first().click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('CV pages render two A4 pages and link their PDF', async ({ page, request }) => {
  for (const [path, pdf] of [['/cv/', '/cv-antonio-paya.pdf'], ['/en/cv/', '/cv-antonio-paya-en.pdf']]) {
    await page.goto(path);
    await expect(page.locator('.page')).toHaveCount(2);
    await expect(page.locator(`a[href="${pdf}"]`)).toBeVisible();
    expect((await request.get(pdf)).status()).toBe(200);
  }
});

test('404 page echoes the requested path', async ({ page }) => {
  await page.goto('/404.html');
  await expect(page.locator('#nf-path')).toHaveText('/404.html');
});

test('security.txt is published', async ({ request }) => {
  const res = await request.get('/.well-known/security.txt');
  expect(res.status()).toBe(200);
  expect(await res.text()).toContain('Contact: mailto:');
});
