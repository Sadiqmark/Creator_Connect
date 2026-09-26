import { test, expect } from '@playwright/test';

test.describe('CreatorSpot — Public Informational Pages & Legal Documentation E2E Suite', () => {
  test('1. Guest navigates from Discovery footer through all public legal and informational pages', async ({
    page,
  }) => {
    // 1. Visit /creators and verify footer presence
    await page.goto('/creators');
    await expect(page).toHaveURL('/creators');

    const footer = page.locator('footer[role="contentinfo"]');
    await expect(footer).toBeVisible();
    await expect(footer.getByRole('link', { name: /CreatorSpot Home/i })).toBeVisible();

    // 2. Click Privacy Policy in footer
    await footer.getByRole('link', { name: /Privacy Policy/i }).click();
    await expect(page).toHaveURL('/privacy');
    await expect(page.getByRole('heading', { level: 1, name: /Privacy Policy/i })).toBeVisible();
    await expect(page.getByText(/October 8, 2026/i)).toBeVisible();
    await expect(page.getByText(/60 days/i).first()).toBeVisible();
    await expect(page.getByText(/30-day period/i).first()).toBeVisible();
    await expect(page.getByText(/180 days/i).first()).toBeVisible();
    await expect(page.getByText(/18 years of age or older/i).first()).toBeVisible();

    // 3. Click Terms & Conditions in footer
    const privacyFooter = page.locator('footer[role="contentinfo"]');
    await privacyFooter.getByRole('link', { name: /Terms & Conditions/i }).click();
    await expect(page).toHaveURL('/terms');
    await expect(page.getByRole('heading', { level: 1, name: /Terms & Conditions/i })).toBeVisible();
    await expect(page.getByText(/October 8, 2026/i)).toBeVisible();
    await expect(page.getByText(/laws applicable in India/i)).toBeVisible();

    // 4. Click Contact Us in footer
    const termsFooter = page.locator('footer[role="contentinfo"]');
    await termsFooter.getByRole('link', { name: /Contact Us/i }).click();
    await expect(page).toHaveURL('/contact');
    await expect(page.getByRole('heading', { level: 1, name: /Contact CreatorSpot/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /creatorspot08@gmail\.com/i }).first()).toBeVisible();

    // 5. Navigate via header to How It Works
    await page.getByRole('navigation', { name: /Main Navigation/i }).getByRole('link', { name: /How It Works/i }).click();
    await expect(page).toHaveURL('/how-it-works');
    await expect(page.getByRole('heading', { level: 1, name: /How CreatorSpot Works/i })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: /FOR BUSINESSES/i })).toBeVisible();

    // Switch tabs on How It Works
    await page.getByRole('button', { name: /For Creators/i }).click();
    await expect(page.getByRole('heading', { level: 2, name: /FOR CREATORS/i })).toBeVisible();

    // 6. Navigate via header to About
    await page.getByRole('navigation', { name: /Main Navigation/i }).getByRole('link', { name: /About/i }).click();
    await expect(page).toHaveURL('/about');
    await expect(page.getByRole('heading', { level: 1, name: /About CreatorSpot/i })).toBeVisible();
    await expect(page.getByText(/structured discovery and collaboration platform/i).first()).toBeVisible();
  });

  test('2. Mobile 375px viewport responsiveness and drawer navigation', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/privacy');
    await expect(page).toHaveURL('/privacy');

    // Confirm no horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // 1px rounding margin

    // Open mobile hamburger menu
    const menuBtn = page.getByRole('button', { name: /Open Menu/i });
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();

    // Mobile nav drawer is visible
    const mobileNav = page.getByRole('navigation', { name: /Mobile Navigation/i });
    await expect(mobileNav).toBeVisible();
    await mobileNav.getByRole('link', { name: /How It Works/i }).click();

    await expect(page).toHaveURL('/how-it-works');
  });

  test('3. Authenticated workspaces and login pages do NOT render the public footer', async ({ page }) => {
    // 1. Login page must not have the public footer
    await page.goto('/login');
    await expect(page).toHaveURL('/login');
    await expect(page.locator('footer[role="contentinfo"]')).not.toBeVisible();

    // 2. Creator dashboard must not have the public footer
    await page.addInitScript(() => {
      (window as any).__MOCK_FIREBASE_USER__ = {
        uid: 'fb-c-001',
        email: 'creator-sarah@agency.com',
        emailVerified: true,
        getIdToken: async () => 'mock-token',
      };
    });

    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'c-user-001',
            firebaseUid: 'fb-c-001',
            email: 'creator-sarah@agency.com',
            role: 'CREATOR',
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
          },
          profile: {
            id: 'cp-sarah-001',
            name: 'Sarah Creator',
          },
          onboardingCompleted: true,
        }),
      });
    });

    await page.route('**/api/v1/creators/me/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          inquiryCounts: { pending: 0, accepted: 0, rejected: 0, expired: 0, total: 0 },
          recentInquiries: [],
        }),
      });
    });

    await page.route('**/api/v1/creators/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          profile: {
            id: 'cp-sarah-001',
            userId: 'c-user-001',
            name: 'Sarah Creator',
            niche: 'Fashion',
            location: 'Mumbai, India',
            bio: 'Fashion creator based in Mumbai',
            specialties: ['Reels'],
            collaborationEmail: 'sarah@agency.com',
          },
        }),
      });
    });

    await page.goto('/creator/dashboard');
    await expect(page).toHaveURL('/creator/dashboard');
    await expect(page.getByRole('heading', { level: 1, name: /Welcome back, Sarah Creator!/i })).toBeVisible();

    // Confirm footer is strictly absent on workspace
    await expect(page.locator('footer[role="contentinfo"]')).toHaveCount(0);
  });
});
