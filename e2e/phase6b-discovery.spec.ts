import { test, expect } from '@playwright/test';

test.describe('Phase 6B — Discovery, Saved Creators & Privacy E2E Suite', () => {
  const creatorElena = {
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

  const creatorMarco = {
    id: 'cp-marco-002',
    name: 'Marco Rossi',
    profilePhotoUrl: null,
    niche: 'Food & Beverage',
    location: 'Rome, Italy',
    bio: 'Artisanal culinary storyteller.',
    specialties: ['Food & Recipes'],
    instagramUrl: null,
    youtubeUrl: 'https://youtube.com/@marcocooks',
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
      businessName: 'Business Brand',
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

  test('FLOW 1 — Guest Discovery: browse, search, filter, paginate, open profile', async ({ page }) => {
    // Intercept discovery API
    await page.route('**/api/v1/creators*', async (route) => {
      const url = new URL(route.request().url());
      const searchParam = url.searchParams.get('q');
      const nicheParam = url.searchParams.get('niche');

      let list = [creatorElena, creatorMarco];
      if (nicheParam === 'Fashion') {
        list = [creatorElena];
      }
      if (searchParam === 'Marco') {
        list = [creatorMarco];
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          creators: list,
          pagination: {
            page: 1,
            limit: 24,
            total: list.length,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          },
        }),
      });
    });

    // Intercept single creator details
    await page.route(`**/api/v1/creators/${creatorElena.id}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ profile: creatorElena }),
      });
    });

    // 1. Open /creators
    await page.goto('/creators');
    await expect(page).toHaveURL('/creators');

    // 2. Both creators visible
    await expect(page.getByText('Elena Rostova')).toBeVisible();
    await expect(page.getByText('Marco Rossi')).toBeVisible();

    // 3. Search for Marco
    await page.getByPlaceholder(/Search creators by name/i).fill('Marco');
    await expect(page.getByText('Marco Rossi')).toBeVisible();

    // Clear search
    await page.getByPlaceholder(/Search creators by name/i).fill('');

    // 4. Click Niche filter "Fashion"
    await page.getByRole('button', { name: 'Fashion' }).click();
    await expect(page.getByText('Elena Rostova')).toBeVisible();

    // 5. Open creator Elena's profile
    await page.getByRole('link', { name: /View Profile/i }).first().click();
    await expect(page).toHaveURL(`/creators/${creatorElena.id}`);
    await expect(page.getByRole('heading', { name: 'Elena Rostova' })).toBeVisible();
    await expect(page.getByText('Milan, Italy')).toBeVisible();
  });

  test('FLOW 2 — Guest Save: clicking Save redirects to authentication flow', async ({ page }) => {
    await page.route('**/api/v1/creators*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          creators: [creatorElena],
          pagination: {
            page: 1,
            limit: 24,
            total: 1,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          },
        }),
      });
    });

    await page.goto('/creators');
    await expect(page.getByText('Elena Rostova')).toBeVisible();

    // Guest clicks Save button on card
    await page.getByLabel('Save Elena Rostova').click();

    // Verifies redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('FLOW 3 — Business Save & Saved List: Save on discovery, view in saved, and unsave', async ({ page }) => {
    let savedIds: string[] = [];

    // Inject mock Firebase user into browser context
    await page.addInitScript(() => {
      (window as any).__MOCK_FIREBASE_USER__ = {
        uid: 'fb-b-001',
        email: 'business-a@brand.com',
        emailVerified: true,
        getIdToken: async () => 'mock-token',
      };
    });

    // Mock auth/me as Business
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockBusinessAuth),
      });
    });

    // Mock discovery
    await page.route('**/api/v1/creators*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          creators: [creatorElena],
          pagination: {
            page: 1,
            limit: 24,
            total: 1,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          },
        }),
      });
    });

    // Mock saved IDs endpoint
    await page.route('**/api/v1/saved-creators/ids', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ids: savedIds }),
      });
    });

    // Mock save endpoint
    await page.route(`**/api/v1/saved-creators/${creatorElena.id}`, async (route) => {
      if (route.request().method() === 'POST') {
        savedIds.push(creatorElena.id);
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            savedCreator: {
              id: 'sc-1',
              savedAt: new Date().toISOString(),
              creator: creatorElena,
            },
          }),
        });
      } else if (route.request().method() === 'DELETE') {
        savedIds = savedIds.filter((id) => id !== creatorElena.id);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'Unsaved' }),
        });
      }
    });

    // Mock saved list endpoint
    await page.route(/\/api\/v1\/saved-creators(\?.*)?$/, async (route) => {
      const items = savedIds.includes(creatorElena.id)
        ? [{ id: 'sc-1', savedAt: new Date().toISOString(), creator: creatorElena }]
        : [];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          savedCreators: items,
          pagination: {
            page: 1,
            limit: 24,
            total: items.length,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          },
        }),
      });
    });

    await page.goto('/creators');
    await expect(page.getByText('Elena Rostova')).toBeVisible();

    // 1. Business saves creator
    await page.getByLabel('Save Elena Rostova').click();

    // 2. Saved state appears
    await expect(page.getByLabel('Unsave Elena Rostova')).toBeVisible();

    // 3. Open Saved Creators page
    await page.getByRole('link', { name: /Saved Creators/i }).first().click();
    await expect(page).toHaveURL('/business/saved-creators');
    await expect(page.getByText('Elena Rostova')).toBeVisible();

    // 4. Click Unsave button
    await page.getByLabel('Unsave Elena Rostova').click();

    // 5. Creator disappears, empty state appears
    await expect(page.getByText(/No saved creators yet/i)).toBeVisible();
  });

  test('FLOW 4 — Creator: Can browse but Save button is completely unavailable', async ({ page }) => {
    // Inject mock Firebase user for creator into browser context
    await page.addInitScript(() => {
      (window as any).__MOCK_FIREBASE_USER__ = {
        uid: 'fb-c-001',
        email: 'creator-sarah@agency.com',
        emailVerified: true,
        getIdToken: async () => 'mock-token',
      };
    });

    // Mock auth/me as Creator
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockCreatorAuth),
      });
    });

    // Mock discovery
    await page.route('**/api/v1/creators*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          creators: [creatorElena],
          pagination: {
            page: 1,
            limit: 24,
            total: 1,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          },
        }),
      });
    });

    // Mock public creator profile
    await page.route(`**/api/v1/creators/${creatorElena.id}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ profile: creatorElena }),
      });
    });

    // 1. Creator visits /creators
    await page.goto('/creators');
    await expect(page.getByText('Elena Rostova')).toBeVisible();

    // 2. Save button is NOT displayed on cards for creators
    await expect(page.getByLabel(/Save Elena Rostova/i)).not.toBeVisible();
    await expect(page.getByLabel(/Unsave Elena Rostova/i)).not.toBeVisible();

    // 3. Open profile
    await page.getByRole('link', { name: /View Profile/i }).first().click();
    await expect(page).toHaveURL(`/creators/${creatorElena.id}`);

    // 4. Save button is NOT displayed on profile page for creators
    await expect(page.getByRole('button', { name: /Save Creator/i })).not.toBeVisible();
  });

  test('FLOW 5 — Privacy: collaborationEmail is strictly absent from API responses and DOM', async ({ page }) => {
    let capturedApiResponse: any = null;

    await page.route('**/api/v1/creators*', async (route) => {
      const payload = {
        creators: [creatorElena],
        pagination: {
          page: 1,
          limit: 24,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
      capturedApiResponse = payload;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(payload),
      });
    });

    await page.goto('/creators');
    await expect(page.getByText('Elena Rostova')).toBeVisible();

    // 1. Inspect intercepted API payload
    expect(capturedApiResponse.creators[0].collaborationEmail).toBeUndefined();
    expect(capturedApiResponse.creators[0].userId).toBeUndefined();
    expect(capturedApiResponse.creators[0].createdAt).toBeUndefined();
    expect(capturedApiResponse.creators[0].updatedAt).toBeUndefined();

    // 2. Verify text does not appear in rendered DOM
    const bodyContent = await page.innerText('body');
    expect(bodyContent).not.toContain('@agency.com');
    expect(bodyContent).not.toContain('collaborationEmail');
  });

  test('FLOW 6 — Business Isolation: Business A saved creators do not appear for Business B', async ({ page }) => {
    // Inject mock Firebase user for Business B into browser context
    await page.addInitScript(() => {
      (window as any).__MOCK_FIREBASE_USER__ = {
        uid: 'fb-b-002',
        email: 'business-b@otherbrand.com',
        emailVerified: true,
        getIdToken: async () => 'mock-token',
      };
    });

    // Mock auth as Business B
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'b-user-002', // Business B
            firebaseUid: 'fb-b-002',
            email: 'business-b@otherbrand.com',
            role: 'BUSINESS',
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
          },
          profile: {
            id: 'bp-002',
            businessName: 'Other Brand',
          },
          onboardingCompleted: true,
        }),
      });
    });

    // Mock saved list for Business B (empty list, because only Business A saved Elena)
    await page.route(/\/api\/v1\/saved-creators(\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          savedCreators: [],
          pagination: {
            page: 1,
            limit: 24,
            total: 0,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          },
        }),
      });
    });

    await page.goto('/business/saved-creators');

    // Business B does NOT see Elena Rostova
    await expect(page.getByText('Elena Rostova')).not.toBeVisible();
    await expect(page.getByText(/No saved creators yet/i)).toBeVisible();
  });
});
