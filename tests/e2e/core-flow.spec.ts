import { test, expect } from '@playwright/test';

test.describe('Core User Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app before each test
    await page.goto('/');
  });

  test('should show login form correctly', async ({ page }) => {
    // Branding check
    await expect(page.locator('body')).toContainText(/StudySystem/i);
    await expect(page.locator('body')).toContainText(/Sua jornada de conhecimento/i);
    
    // Form elements check
    await expect(page.locator('h2')).toContainText(/Bem-vindo de volta/i);
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    
    // Main button check
    const loginButton = page.getByRole('button', { name: /Entrar no Sistema/i });
    await expect(loginButton).toBeVisible();
  });

  test('should prevent unauthorized access to courses', async ({ page }) => {
    // Attempt to navigate to courses directly
    await page.goto('/courses');
    
    // Verify unauthorized users are shown the login screen.
    // The route guard may render login in place without changing the URL.
    await expect(page.locator('h2')).toContainText(/Bem-vindo de volta/i);
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.getByRole('button', { name: /Entrar no Sistema/i })).toBeVisible();
  });

  /* 
    Note: To test the full flow (accessing a course), 
    we would need valid credentials or a mock auth state.
    For this setup verification, we focus on the landing state.
  */
});
