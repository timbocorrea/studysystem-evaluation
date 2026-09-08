import { expect, Page, test } from '@playwright/test';

test.use({ screenshot: 'off', trace: 'off' });

const protectedRoutesForVisitor = [
  '/dashboard',
  '/courses',
  '/profile',
  '/buddy',
  '/admin/content',
  '/admin/users',
  '/admin/access',
  '/admin/files',
  '/admin/health',
  '/admin/settings',
  '/audit',
  '/instructor/interact',
];

const adminOnlyRoutes = [
  '/admin/content',
  '/admin/users',
  '/admin/access',
  '/admin/files',
  '/admin/health',
  '/admin/settings',
  '/audit',
  '/instructor/interact',
];

async function avoidLoginCacheReload(page: Page) {
  await page.addInitScript(() => {
    try {
      window.sessionStorage.setItem('login_cache_cleared', 'true');
    } catch {
      // Keep this non-destructive even if browser storage is unavailable.
    }
  });
}

async function expectLoginScreen(page: Page) {
  await expect(page.locator('input#email')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('input#password')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: /Entrar no Sistema/i })).toBeVisible({ timeout: 15000 });
}

async function expectNoObviousPrivateAdminData(page: Page) {
  const body = page.locator('body');

  await expect(body).not.toContainText(/Lista de Usu.rios/i);
  await expect(body).not.toContainText(/Logs de Auditoria/i);
  await expect(body).not.toContainText(/Configura..es do Sistema/i);
  await expect(body).not.toContainText(/Gerenciar Permiss.es/i);
  await expect(body).not.toContainText(/Arquivos Privados/i);
  await expect(body).not.toContainText(/Painel de Sa.de/i);
}

async function loginWithEnvCredentials(page: Page, emailEnv: string, passwordEnv: string) {
  const email = process.env[emailEnv];
  const password = process.env[passwordEnv];

  if (!email || !password) {
    test.skip(true, `${emailEnv}/${passwordEnv} not configured; authenticated check skipped safely.`);
    return;
  }

  await avoidLoginCacheReload(page);
  await page.goto('/');
  await expectLoginScreen(page);

  await page.locator('input#email').fill(email);
  await page.locator('input#password').fill(password);
  await page.getByRole('button', { name: /Entrar no Sistema/i }).click();

  await expect(page.locator('body')).not.toContainText(/Bem-vindo de volta/i, { timeout: 20000 });
}

test.describe('Access control - visitor without session', () => {
  test.beforeEach(async ({ page }) => {
    await avoidLoginCacheReload(page);
  });

  for (const route of protectedRoutesForVisitor) {
    test(`visitor is blocked from ${route}`, async ({ page }) => {
      await page.goto(route);

      await expectLoginScreen(page);
      await expectNoObviousPrivateAdminData(page);
    });
  }
});

test.describe('Access control - optional authenticated profile checks', () => {
  test('student cannot access obvious admin-only routes when E2E_STUDENT_* is configured', async ({ page }) => {
    await loginWithEnvCredentials(page, 'E2E_STUDENT_EMAIL', 'E2E_STUDENT_PASSWORD');

    for (const route of adminOnlyRoutes) {
      await page.goto(route);

      const body = page.locator('body');
      await expect(body).toContainText(/Acesso negado|Acesso restrito|Bem-vindo de volta/i, { timeout: 15000 });
      await expectNoObviousPrivateAdminData(page);
    }
  });

  test('instructor access is limited when E2E_INSTRUCTOR_* is configured', async ({ page }) => {
    await loginWithEnvCredentials(page, 'E2E_INSTRUCTOR_EMAIL', 'E2E_INSTRUCTOR_PASSWORD');

    for (const route of ['/admin/users', '/admin/access', '/audit']) {
      await page.goto(route);

      const body = page.locator('body');
      await expect(body).toContainText(/Acesso restrito|Acesso negado|Bem-vindo de volta/i, { timeout: 15000 });
    }
  });

  test('master route smoke runs only when E2E_MASTER_* is configured', async ({ page }) => {
    await loginWithEnvCredentials(page, 'E2E_MASTER_EMAIL', 'E2E_MASTER_PASSWORD');

    for (const route of ['/admin/content', '/admin/users', '/admin/access']) {
      await page.goto(route);

      const body = page.locator('body');
      await expect(body).not.toContainText(/Bem-vindo de volta/i, { timeout: 15000 });
      await expect(body).not.toContainText(/Carregando Login/i, { timeout: 15000 });
    }
  });
});
