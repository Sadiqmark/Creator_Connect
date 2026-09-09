import { test, expect } from '@playwright/test';

test.describe('Phase 7B — Inquiry Creation Browser E2E Suite', () => {
  const mockCreator = {
    id: 'cp-elena-001',
    name: 'Elena Rostova',
    profilePhotoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
    niche: 'Fashion',
    location: 'Milan, Italy',
    bio: 'High-fashion editorial stylist and visual creator.',
    specialties: ['Fashion Styling', 'Photography'],
    instagramUrl: 'https://instagram.com/elenarostova',
    youtubeUrl: null,
  };

  const mockBusinessAuth = {
    user: {
      id: 'b-user-001',
      firebaseUid: 'fb-b-001',
      email: 'business-a@brand.com',
      role: 'BUSINESS',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    },
    profile: {
      id: 'bp-001',
      businessName: 'Lumina Fashion',
    },
    onboardingCompleted: true,
  };

  const mockCreatorAuth = {
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
  };

  test('FLOW 1 — Guest: Clicking Send Inquiry redirects to login with return path', async ({ page }) => {
    await page.route(`**/api/v1/creators/${mockCreator.id}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ profile: mockCreator }),
      });
    });

    await page.goto(`/creators/${mockCreator.id}`);
    await expect(page.getByRole('heading', { name: 'Elena Rostova' })).toBeVisible();

    const inquiryBtn = page.getByRole('button', { name: /Send Inquiry/i });
    await expect(inquiryBtn).toBeVisible();
    await inquiryBtn.click();

    // Guest redirected to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('FLOW 2 — Creator: Send Inquiry button is completely unavailable on public profile', async ({ page }) => {
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
        body: JSON.stringify(mockCreatorAuth),
      });
    });

    await page.route(`**/api/v1/creators/${mockCreator.id}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ profile: mockCreator }),
      });
    });

    await page.goto(`/creators/${mockCreator.id}`);
    await expect(page.getByRole('heading', { name: 'Elena Rostova' })).toBeVisible();

    // Verify Send Inquiry button is NOT rendered for creators
    await expect(page.getByRole('button', { name: /Send Inquiry/i })).not.toBeVisible();
  });

  test('FLOW 3 — Business: Opens modal, validates required fields, and submits inquiry successfully', async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__MOCK_FIREBASE_USER__ = {
        uid: 'fb-b-001',
        email: 'business-a@brand.com',
        emailVerified: true,
        getIdToken: async () => 'mock-token',
      };
    });

    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockBusinessAuth),
      });
    });

    await page.route(`**/api/v1/creators/${mockCreator.id}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ profile: mockCreator }),
      });
    });

    await page.route('**/api/v1/saved-creators/ids', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ids: [] }),
      });
    });

    let capturedPayload: any = null;
    await page.route('**/api/v1/inquiries', async (route) => {
      if (route.request().method() === 'POST') {
        capturedPayload = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            inquiry: {
              id: 'inq-e2e-1',
              creatorId: mockCreator.id,
              status: 'PENDING',
              collaborationType: capturedPayload.collaborationType,
              platform: capturedPayload.platform,
              deliverables: capturedPayload.deliverables,
              brief: capturedPayload.brief,
              createdAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
            },
          }),
        });
      }
    });

    await page.goto(`/creators/${mockCreator.id}`);
    await expect(page.getByRole('heading', { name: 'Elena Rostova' })).toBeVisible();

    // 1. Click Send Inquiry
    await page.getByRole('button', { name: /Send Inquiry/i }).click();

    // 2. Modal appears
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: /Send Inquiry to Elena Rostova/i })).toBeVisible();

    // 3. Test validation by clicking submit empty inside dialog
    await dialog.getByRole('button', { name: /Send Inquiry/i }).click();
    await expect(dialog.getByText(/Collaboration type is required/i)).toBeVisible();

    // 4. Fill valid data
    await dialog.getByLabel(/Collaboration Type/i).fill('Sponsored Editorial Campaign');
    await dialog.getByLabel(/Expected Deliverables/i).fill('1 Dedicated 60s Reel and 3 Stories with Link');
    await dialog.getByLabel(/Collaboration Brief/i).fill(
      'We are showcasing our sustainable autumn line with luxury styling in Milan street locations.'
    );

    // 5. Submit form inside dialog
    await dialog.getByRole('button', { name: /Send Inquiry/i }).click();

    // 6. Success confirmation visible
    await expect(dialog.getByText(/Inquiry Sent Successfully/i)).toBeVisible();

    // 7. Verify intercepted API payload
    expect(capturedPayload.creatorId).toBe(mockCreator.id);
    expect(capturedPayload.collaborationType).toBe('Sponsored Editorial Campaign');
    expect(capturedPayload.platform).toBe('Instagram');
  });

  test('FLOW 4 — Duplicate Active Inquiry: Business receives 409 conflict and sees inline duplicate alert', async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__MOCK_FIREBASE_USER__ = {
        uid: 'fb-b-001',
        email: 'business-a@brand.com',
        emailVerified: true,
        getIdToken: async () => 'mock-token',
      };
    });

    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockBusinessAuth),
      });
    });

    await page.route(`**/api/v1/creators/${mockCreator.id}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ profile: mockCreator }),
      });
    });

    await page.route('**/api/v1/saved-creators/ids', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ids: [] }),
      });
    });

    // Mock 409 Conflict
    await page.route('**/api/v1/inquiries', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            error: {
              code: 'DUPLICATE_ACTIVE_INQUIRY',
              message: 'You already have an active inquiry with this creator.',
            },
          }),
        });
      }
    });

    await page.goto(`/creators/${mockCreator.id}`);
    await page.getByRole('button', { name: /Send Inquiry/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Fill valid data
    await dialog.getByLabel(/Collaboration Type/i).fill('Sponsored Reel');
    await dialog.getByLabel(/Expected Deliverables/i).fill('1 Reel showcasing apparel.');
    await dialog.getByLabel(/Collaboration Brief/i).fill('Spring launch campaign focusing on sustainability.');

    // Submit inside dialog
    await dialog.getByRole('button', { name: /Send Inquiry/i }).click();

    // Verify 409 inline alert
    await expect(
      dialog.getByText(/You already have an active inquiry with this creator/i)
    ).toBeVisible();
    await expect(
      dialog.getByText(/cannot submit a new inquiry while an existing one is Pending or Accepted/i)
    ).toBeVisible();
  });

  test('FLOW 5 — Privacy: collaborationEmail is strictly absent from DOM and network responses', async ({ page }) => {
    let interceptedInquiryResponse: any = null;

    await page.addInitScript(() => {
      (window as any).__MOCK_FIREBASE_USER__ = {
        uid: 'fb-b-001',
        email: 'business-a@brand.com',
        emailVerified: true,
        getIdToken: async () => 'mock-token',
      };
    });

    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockBusinessAuth),
      });
    });

    await page.route(`**/api/v1/creators/${mockCreator.id}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ profile: mockCreator }),
      });
    });

    await page.route('**/api/v1/saved-creators/ids', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ids: [] }),
      });
    });

    await page.route('**/api/v1/inquiries', async (route) => {
      if (route.request().method() === 'POST') {
        const payload = {
          inquiry: {
            id: 'inq-privacy-1',
            creatorId: mockCreator.id,
            status: 'PENDING',
            collaborationType: 'Sponsored Post',
            platform: 'Instagram',
            deliverables: '1 Photo post and 2 stories.',
            brief: 'Brand awareness campaign for minimalist watches.',
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          },
        };
        interceptedInquiryResponse = payload;
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(payload),
        });
      }
    });

    await page.goto(`/creators/${mockCreator.id}`);
    await page.getByRole('button', { name: /Send Inquiry/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.getByLabel(/Collaboration Type/i).fill('Sponsored Post');
    await dialog.getByLabel(/Expected Deliverables/i).fill('1 Photo post and 2 stories.');
    await dialog.getByLabel(/Collaboration Brief/i).fill('Brand awareness campaign for minimalist watches.');

    await dialog.getByRole('button', { name: /Send Inquiry/i }).click();
    await expect(dialog.getByText(/Inquiry Sent Successfully/i)).toBeVisible();

    // Verify response privacy: No emails, no internal user IDs
    expect(interceptedInquiryResponse.inquiry.collaborationEmail).toBeUndefined();
    expect(interceptedInquiryResponse.inquiry.businessId).toBeUndefined();
    expect(interceptedInquiryResponse.inquiry.userId).toBeUndefined();

    // Verify DOM privacy: No email anywhere in the page body
    const bodyText = await page.innerText('body');
    expect(bodyText).not.toContain('@agency.com');
    expect(bodyText).not.toContain('collaborationEmail');
  });
});
