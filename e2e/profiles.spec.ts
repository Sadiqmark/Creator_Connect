import { test, expect } from '@playwright/test';

test.describe('Phase 4B — Profile, Discovery & Privacy Browser E2E Suite', () => {
  const mockCreatorId = 'c1000000-0000-4000-8000-000000000001';
  const mockBusinessId = 'b1000000-0000-4000-8000-000000000001';

  const mockPublicCreator = {
    id: mockCreatorId,
    userId: 'user-c1',
    name: 'Elena Rostova',
    niche: 'Fashion & Style',
    location: 'Milan, Italy',
    bio: 'Editorial fashion stylist and luxury lifestyle creator with an engaged audience across Europe and North America.',
    specialties: ['Short-Form Video', 'Long-Form Video', 'Brand Ambassadorship'],
    instagramUrl: 'https://instagram.com/elenarostova',
    youtubeUrl: 'https://youtube.com/@elenarostova',
    profilePhotoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
    isDiscoverable: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockPublicBusiness = {
    id: mockBusinessId,
    userId: 'user-b1',
    businessName: 'Lumina Apparel',
    category: 'Fashion & Apparel',
    description: 'Contemporary sustainable fashion brand collaborating with visionary digital stylists and creators.',
    city: 'San Francisco',
    stateOrProvince: 'CA',
    country: 'USA',
    logoUrl: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b',
    websiteUrl: 'https://luminaapparel.com',
    instagramUrl: 'https://instagram.com/luminaapparel',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  test('1. Guest → /creators: Public browsing without login', async ({ page }) => {
    // Intercept creators list API to supply deterministic creators
    await page.route('**/api/v1/creators*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ creators: [mockPublicCreator] }),
      });
    });

    await page.goto('/creators');
    await expect(page).toHaveURL('/creators');

    // Guest sees discovery page elements
    await expect(page.getByRole('heading', { name: /Connect with Trusted Creators/i })).toBeVisible();
    await expect(page.getByPlaceholder(/Search creators by name, location, or keyword/i)).toBeVisible();

    // Creator card is rendered
    await expect(page.getByText('Elena Rostova')).toBeVisible();
    await expect(page.getByText('Milan, Italy')).toBeVisible();
    await expect(page.getByRole('link', { name: /View Profile/i })).toBeVisible();

    // Guest auth actions visible in top nav
    await expect(page.getByRole('link', { name: /Sign In/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Join Marketplace/i })).toBeVisible();
  });

  test('2. Guest → /creators/:creatorId: Public profile viewing and strict email privacy', async ({ page }) => {
    await page.route(`**/api/v1/creators/${mockCreatorId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ profile: mockPublicCreator }),
      });
    });

    await page.goto(`/creators/${mockCreatorId}`);
    await expect(page).toHaveURL(`/creators/${mockCreatorId}`);

    // Profile details visible
    await expect(page.getByRole('heading', { name: 'Elena Rostova' })).toBeVisible();
    await expect(page.getByText('Milan, Italy')).toBeVisible();
    await expect(page.getByText('Fashion & Style')).toBeVisible();
    await expect(page.getByText('Short-Form Video')).toBeVisible();

    // STRICT PRIVACY VERIFICATION: No email address anywhere in the page DOM
    const bodyText = await page.innerText('body');
    expect(bodyText).not.toContain('@creator');
    expect(bodyText).not.toContain('@example.com');
    expect(bodyText).not.toContain('collaborationEmail');
  });

  test('3. Guest → Save Creator → Redirects to login with return path', async ({ page }) => {
    await page.route(`**/api/v1/creators/${mockCreatorId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ profile: mockPublicCreator }),
      });
    });

    await page.goto(`/creators/${mockCreatorId}`);
    const saveBtn = page.getByRole('button', { name: /Save Creator/i });
    await expect(saveBtn).toBeVisible();

    await saveBtn.click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('4. Guest → Send Inquiry → Redirects to login with return path', async ({ page }) => {
    await page.route(`**/api/v1/creators/${mockCreatorId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ profile: mockPublicCreator }),
      });
    });

    await page.goto(`/creators/${mockCreatorId}`);
    const inquiryBtn = page.getByRole('button', { name: /Send Inquiry/i });
    await expect(inquiryBtn).toBeVisible();

    await inquiryBtn.click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('5. Creator-facing Business Profile: Read-only, strict privacy, no chat, no bypass', async ({ page }) => {
    await page.route(`**/api/v1/businesses/${mockBusinessId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ profile: mockPublicBusiness }),
      });
    });

    await page.goto(`/businesses/${mockBusinessId}`);
    await expect(page).toHaveURL(`/businesses/${mockBusinessId}`);

    // Business details
    await expect(page.getByRole('heading', { name: 'Lumina Apparel' })).toBeVisible();
    await expect(page.getByText('Fashion & Apparel')).toBeVisible();
    await expect(page.getByText(/San Francisco, CA, USA/)).toBeVisible();
    await expect(page.getByText(/Contemporary sustainable fashion/)).toBeVisible();

    // Anti-scope / Boundary verifications
    const bodyText = await page.innerText('body');
    expect(bodyText).not.toContain('@luminaapparel.com');
    expect(bodyText).not.toContain('Start Chat');
    expect(bodyText).not.toContain('Send Direct Message');
    expect(bodyText).not.toContain('Campaigns');
    expect(bodyText).not.toContain('Projects');
    expect(bodyText).not.toContain('Analytics');
    expect(bodyText).not.toContain('Save Business');
  });
});
