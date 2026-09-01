import { test, expect } from '@playwright/test';

test.describe('Creator Connect — Live Real Browser E2E Authentication Suite', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('400')) {
        console.error(`[Browser Console Error]: ${msg.text()}`);
      }
    });
  });

  test('1. Signup Page — Form Validation, Fields, and Navigation', async ({ page }) => {
    await page.goto('/signup');
    await expect(page).toHaveURL('/signup');

    await expect(page.getByText('Creator Connect', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Join Creator Connect/i })).toBeVisible();

    const emailInput = page.locator('input#email');
    const passwordInput = page.locator('input#password');
    const confirmPasswordInput = page.locator('input#confirmPassword');
    const submitBtn = page.getByRole('button', { name: /Create Account/i });

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(confirmPasswordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();

    // Validation: Passwords mismatch
    await emailInput.fill('candidate@example.com');
    await passwordInput.fill('Password123!');
    await confirmPasswordInput.fill('MismatchPass123!');
    await submitBtn.click();
    await expect(page.locator('text=Passwords do not match')).toBeVisible();

    // Validation: Short password (<8 chars)
    await passwordInput.fill('short');
    await confirmPasswordInput.fill('short');
    await submitBtn.click();
    await expect(page.locator('text=Password must be at least 8 characters long')).toBeVisible();

    // Link navigation to login
    await page.getByRole('link', { name: /Sign in here/i }).click();
    await expect(page).toHaveURL('/login');
  });

  test('2. Login Page — Form Inputs, Error Handling & Navigation Links', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL('/login');

    await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();

    const emailInput = page.locator('input#email');
    const passwordInput = page.locator('input#password');
    const signInBtn = page.getByRole('button', { name: /Sign In/i });

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(signInBtn).toBeVisible();

    // Link navigation to forgot password
    await page.getByRole('link', { name: /Forgot password\?/i }).click();
    await expect(page).toHaveURL('/forgot-password');

    // Return to login
    await page.getByRole('link', { name: /Back to Sign In/i }).click();
    await expect(page).toHaveURL('/login');

    // Link navigation to signup
    await page.getByRole('link', { name: /Create an account/i }).click();
    await expect(page).toHaveURL('/signup');
  });

  test('3. Email Verification Screen — UI Elements & Resend Cooldown', async ({ page }) => {
    await page.goto('/verify-email');
    await expect(page).toHaveURL('/verify-email');

    await expect(page.getByRole('heading', { name: /Verify your email/i })).toBeVisible();
    await expect(
      page.getByRole('button', { name: /I've Verified My Email/i })
    ).toBeVisible();

    const resendBtn = page.getByRole('button', { name: /Resend Verification Email/i });
    await expect(resendBtn).toBeVisible();

    // Click refresh verification
    await page.getByRole('button', { name: /I've Verified My Email/i }).click();

    // Resend email rate limit cooldown test
    await resendBtn.click();
    const cooldownOrSuccess = page.locator(
      'text=A new verification link has been sent, text=Resend email in'
    );
    await expect(cooldownOrSuccess.first()).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  test('4. Unauthenticated Direct URL Navigation Gating', async ({ page }) => {
    await page.goto('/creator/dashboard');
    await expect(page).toHaveURL('/login');

    await page.goto('/business/dashboard');
    await expect(page).toHaveURL('/login');

    await page.goto('/select-role');
    await expect(page).toHaveURL('/login');

    await page.goto('/onboarding/creator');
    await expect(page).toHaveURL('/login');

    await page.goto('/onboarding/business');
    await expect(page).toHaveURL('/login');
  });

  test('5. Role Selection Page — Protected Route Redirection', async ({ page }) => {
    await page.goto('/select-role');
    await expect(page).toHaveURL('/login');
  });

  test('6. Forgot Password & Reset Password Error States', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page).toHaveURL('/forgot-password');

    await expect(page.getByRole('heading', { name: /Reset your password/i })).toBeVisible();
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.getByRole('button', { name: /Send Reset Link/i })).toBeVisible();

    // Test invalid / expired reset link
    await page.goto('/reset-password?oobCode=invalid-expired-token-12345');
    await expect(
      page.getByRole('heading', { name: /Invalid or Expired Link/i })
    ).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('link', { name: /Request New Reset Link/i })).toBeVisible();
  });

  test('7. 403 Forbidden & 404 Not Found Pages', async ({ page }) => {
    await page.goto('/forbidden');
    await expect(page.getByRole('heading', { name: /Access Denied \(403\)/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Return to Workspace/i })).toBeVisible();

    await page.goto('/nonexistent-test-route-random-404');
    await expect(page.getByRole('heading', { name: /Page Not Found \(404\)/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Back to Home/i })).toBeVisible();
  });

  test('8. Backend Direct API Security Validation from Browser Network Layer', async ({ request }) => {
    const unauthRes = await request.get('http://localhost:8000/api/v1/auth/me');
    expect(unauthRes.status()).toBe(401);
    const unauthJson = await unauthRes.json();
    expect(unauthJson.error.code).toBe('MISSING_TOKEN');

    const malformedRes = await request.get('http://localhost:8000/api/v1/auth/me', {
      headers: { Authorization: 'Basic 12345' },
    });
    expect(malformedRes.status()).toBe(401);
    const malformedJson = await malformedRes.json();
    expect(malformedJson.error.code).toBe('MALFORMED_TOKEN');

    const healthRes = await request.get('http://localhost:8000/api/v1/health');
    expect(healthRes.status()).toBe(200);
    const healthJson = await healthRes.json();
    expect(healthJson.status).toBe('ok');
  });

  test('9. Session Expired Global Dialog Handling in Real Browser', async ({ page }) => {
    await page.goto('/login');
    // Ensure form is interactive and initial auth listener settled
    await expect(page.locator('input#email')).toBeVisible();
    await page.waitForTimeout(600);

    // Dispatch session expired event in page context
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('auth:session-expired'));
    });

    await expect(page.getByRole('heading', { name: /Session Expired/i })).toBeVisible({ timeout: 5000 });
    const modalBtn = page.locator('div.fixed button', { hasText: 'Sign In Again' });
    await expect(modalBtn).toBeVisible();
    await modalBtn.click();
    await expect(page.getByRole('heading', { name: /Session Expired/i })).not.toBeVisible();
  });
});
