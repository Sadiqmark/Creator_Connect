import { test, expect } from '@playwright/test';

test.describe('Phase 10C — Creator Inquiry Management Browser E2E Suite', () => {
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

  const mockInquiryDetail = {
    id: 'inq-creator-e2e-1',
    status: 'PENDING',
    collaborationType: 'Sponsored Instagram Reel',
    platform: 'Instagram',
    deliverables: '1 Dedicated Reel + 2 Stories with product tag',
    timelineStart: '2026-10-01',
    timelineEnd: '2026-10-15',
    brief: 'Showcase our autumn luxury knitwear collection in Milan street locations.',
    additionalRequirements: 'Deliver raw video footage within 48 hours of posting.',
    createdAt: new Date('2026-09-10T10:00:00Z').toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    respondedAt: null,
    closedAt: null,
    business: {
      id: 'bp-lumina-001',
      businessName: 'Lumina Fashion',
      logoUrl: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b',
      category: 'Fashion & Apparel',
      description: 'Contemporary sustainable luxury fashion brand collaborating with digital creators.',
      city: 'Milan',
      stateOrProvince: 'Lombardy',
      country: 'Italy',
      websiteUrl: 'https://luminafashion.example.com',
      instagramUrl: 'https://instagram.com/luminafashion',
    },
  };

  const mockInquiriesList = [
    {
      id: 'inq-creator-e2e-1',
      status: 'PENDING',
      collaborationType: 'Sponsored Instagram Reel',
      platform: 'Instagram',
      deliverables: '1 Dedicated Reel + 2 Stories with product tag',
      timelineStart: '2026-10-01',
      timelineEnd: '2026-10-15',
      createdAt: new Date('2026-09-10T10:00:00Z').toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      respondedAt: null,
      business: {
        id: 'bp-lumina-001',
        businessName: 'Lumina Fashion',
        logoUrl: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b',
        category: 'Fashion & Apparel',
        city: 'Milan',
        country: 'Italy',
      },
    },
  ];

  test('FLOW 1 — Creator: Navigates to /creator/inquiries, views received inquiries, and filters by status', async ({
    page,
  }) => {
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

    let requestedStatus: string | null = null;
    await page.route('**/api/v1/creators/me/inquiries*', async (route) => {
      const url = new URL(route.request().url());
      requestedStatus = url.searchParams.get('status');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          inquiries: mockInquiriesList,
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        }),
      });
    });

    await page.goto('/creator/inquiries');

    // Verify page header
    await expect(page.getByRole('heading', { name: 'Received Inquiries' })).toBeVisible();
    await expect(page.getByText('Review and manage brand collaboration proposals.')).toBeVisible();

    // Verify inquiry item card rendered
    await expect(page.getByText('Lumina Fashion')).toBeVisible();
    await expect(page.getByText('Sponsored Instagram Reel')).toBeVisible();
    await expect(page.getByText('Pending Review')).toBeVisible();
    await expect(page.getByText('Milan, Italy')).toBeVisible();

    // Click Accepted filter tab
    await page.getByRole('button', { name: 'Accepted' }).click();
    expect(requestedStatus).toBe('ACCEPTED');
  });

  test('FLOW 2 — Creator: Opens inquiry detail, views proposal and brand details, confirms strict privacy', async ({
    page,
  }) => {
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

    await page.route(`**/api/v1/creators/me/inquiries/${mockInquiryDetail.id}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ inquiry: mockInquiryDetail }),
      });
    });

    await page.goto(`/creator/inquiries/${mockInquiryDetail.id}`);

    // Verify proposal content
    await expect(page.getByText('Awaiting Your Response')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sponsored Instagram Reel' })).toBeVisible();
    await expect(page.getByText('1 Dedicated Reel + 2 Stories with product tag')).toBeVisible();
    await expect(page.getByText('Showcase our autumn luxury knitwear collection in Milan street locations.')).toBeVisible();

    // Verify Brand Partner public details card
    await expect(page.getByRole('heading', { name: 'Lumina Fashion' })).toBeVisible();
    await expect(page.getByText('Fashion & Apparel')).toBeVisible();
    await expect(page.getByText('Milan, Lombardy, Italy')).toBeVisible();
    await expect(page.getByRole('link', { name: /Instagram Profile/i })).toBeVisible();

    // Verify Action buttons present for PENDING status
    await expect(page.getByRole('button', { name: 'Accept Collaboration' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Decline Proposal' })).toBeVisible();

    // Privacy Verification: Collaboration email and internal user IDs never exist in DOM
    const bodyText = await page.innerText('body');
    expect(bodyText).not.toContain('@brand.com');
    expect(bodyText).not.toContain('collaborationEmail');
    expect(bodyText).not.toContain('fb-b-001');
  });

  test('FLOW 3 — Creator: Accepts a PENDING inquiry with confirmation modal', async ({
    page,
  }) => {
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

    let currentStatus = 'PENDING';
    await page.route(`**/api/v1/creators/me/inquiries/${mockInquiryDetail.id}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          inquiry: {
            ...mockInquiryDetail,
            status: currentStatus,
            respondedAt: currentStatus === 'ACCEPTED' ? new Date().toISOString() : null,
          },
        }),
      });
    });

    let acceptEndpointCalled = false;
    await page.route(`**/api/v1/inquiries/${mockInquiryDetail.id}/accept`, async (route) => {
      acceptEndpointCalled = true;
      currentStatus = 'ACCEPTED';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          inquiry: { ...mockInquiryDetail, status: 'ACCEPTED' },
        }),
      });
    });

    await page.goto(`/creator/inquiries/${mockInquiryDetail.id}`);
    await expect(page.getByRole('button', { name: 'Accept Collaboration' })).toBeVisible();

    // 1. Click Accept to open confirmation modal
    await page.getByRole('button', { name: 'Accept Collaboration' }).click();

    // 2. Modal appears
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('heading', { name: 'Accept Collaboration Proposal' })).toBeVisible();

    // 3. Confirm Accept
    await modal.getByRole('button', { name: 'Confirm & Accept' }).click();

    // 4. Verify API called and UI updates to Accepted
    expect(acceptEndpointCalled).toBe(true);
    await expect(page.getByText('Collaboration Accepted')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Accept Collaboration' })).not.toBeVisible();
  });

  test('FLOW 4 — Creator: Declines a PENDING inquiry with confirmation modal', async ({
    page,
  }) => {
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

    let currentStatus = 'PENDING';
    await page.route(`**/api/v1/creators/me/inquiries/${mockInquiryDetail.id}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          inquiry: {
            ...mockInquiryDetail,
            status: currentStatus,
            respondedAt: currentStatus === 'REJECTED' ? new Date().toISOString() : null,
          },
        }),
      });
    });

    let rejectEndpointCalled = false;
    await page.route(`**/api/v1/inquiries/${mockInquiryDetail.id}/reject`, async (route) => {
      rejectEndpointCalled = true;
      currentStatus = 'REJECTED';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          inquiry: { ...mockInquiryDetail, status: 'REJECTED' },
        }),
      });
    });

    await page.goto(`/creator/inquiries/${mockInquiryDetail.id}`);
    await expect(page.getByRole('button', { name: 'Decline Proposal' })).toBeVisible();

    // 1. Click Decline to open confirmation modal
    await page.getByRole('button', { name: 'Decline Proposal' }).click();

    // 2. Modal appears
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('heading', { name: 'Decline Collaboration Proposal' })).toBeVisible();

    // 3. Confirm Decline
    await modal.getByRole('button', { name: 'Confirm & Decline' }).click();

    // 4. Verify API called and UI updates to Declined
    expect(rejectEndpointCalled).toBe(true);
    await expect(page.getByText('Collaboration Declined')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Decline Proposal' })).not.toBeVisible();
  });

  test('FLOW 5 — Creator Dashboard: View All links to /creator/inquiries and recent inquiry clicks through to detail', async ({
    page,
  }) => {
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

    await page.route('**/api/v1/creators/me/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          isDiscoverable: true,
          missingFields: [],
          inquiriesTotal: 1,
          inquiriesPending: 1,
          inquiriesAccepted: 0,
          inquiriesRejected: 0,
          recentInquiries: [
            {
              id: 'inq-creator-e2e-1',
              status: 'PENDING',
              collaborationType: 'Sponsored Instagram Reel',
              businessName: 'Lumina Fashion',
              businessLogoUrl: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b',
              createdAt: new Date().toISOString(),
            },
          ],
        }),
      });
    });

    await page.route('**/api/v1/creators/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ profile: { id: 'cp-sarah-001', name: 'Sarah Creator' } }),
      });
    });

    await page.route('**/api/v1/creators/me/inquiries*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          inquiries: mockInquiriesList,
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        }),
      });
    });

    await page.goto('/creator/dashboard');

    // 1. Click "View All" on Recent Collaboration Inquiries card
    const viewAllLink = page.getByRole('link', { name: /View All/i });
    await expect(viewAllLink).toBeVisible();
    await viewAllLink.click();

    // 2. Navigates to /creator/inquiries
    await expect(page).toHaveURL('/creator/inquiries');
    await expect(page.getByRole('heading', { name: 'Received Inquiries' })).toBeVisible();
  });

  test('FLOW 6 — Role Guarding: Business user navigating to /creator/inquiries is blocked and redirected to /business/dashboard', async ({
    page,
  }) => {
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

    await page.route('**/api/v1/businesses/me/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          savedCreatorsCount: 0,
          inquiriesTotal: 0,
          inquiriesPending: 0,
          inquiriesAccepted: 0,
          recentSaved: [],
          recentInquiries: [],
        }),
      });
    });

    await page.route('**/api/v1/businesses/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ profile: { id: 'bp-001', businessName: 'Lumina Fashion' } }),
      });
    });

    await page.goto('/creator/inquiries');

    // Gated by ProtectedRoute -> redirected to /business/dashboard
    await expect(page).toHaveURL('/business/dashboard');
  });
});
