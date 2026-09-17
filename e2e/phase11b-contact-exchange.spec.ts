import { test, expect } from '@playwright/test';

test.describe('Phase 11B — Controlled Contact Exchange Browser E2E Suite', () => {
  const mockCreatorAuth = {
    user: {
      id: 'c-user-001',
      firebaseUid: 'fb-c-001',
      email: 'creator-secret-auth@firebase.com',
      role: 'CREATOR',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    },
    profile: {
      id: 'cp-elena-001',
      name: 'Elena Rostova',
    },
    onboardingCompleted: true,
  };

  const mockBusinessAuth = {
    user: {
      id: 'b-user-001',
      firebaseUid: 'fb-b-001',
      email: 'business-secret-auth@firebase.com',
      role: 'BUSINESS',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    },
    profile: {
      id: 'bp-lumina-001',
      businessName: 'Lumina Fashion',
    },
    onboardingCompleted: true,
  };

  const mockAcceptedBusinessDetail = {
    id: 'inq-biz-accepted-1',
    status: 'ACCEPTED',
    collaborationType: 'Sponsored Instagram Reel',
    platform: 'Instagram',
    deliverables: '1 Dedicated Reel + 2 Stories',
    timelineStart: '2026-10-01',
    timelineEnd: '2026-10-15',
    brief: 'Campaign brief for luxury autumn collection in Milan.',
    additionalRequirements: 'Raw footage in 48h.',
    createdAt: new Date('2026-09-10T10:00:00Z').toISOString(),
    expiresAt: new Date('2026-11-09T10:00:00Z').toISOString(),
    respondedAt: new Date('2026-09-11T12:00:00Z').toISOString(),
    closedAt: null,
    creator: {
      id: 'cp-elena-001',
      name: 'Elena Rostova',
      profilePhotoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
      niche: 'Fashion',
      location: 'Milan, Italy',
      bio: 'Fashion stylist and creative director.',
      specialties: ['Editorial', 'Styling'],
      instagramUrl: 'https://instagram.com/elenarostova',
      youtubeUrl: 'https://youtube.com/@elenarostova',
    },
    contact: {
      name: 'Elena Rostova',
      collaborationEmail: 'elena.collab@agency.com',
      instagramUrl: 'https://instagram.com/elenarostova',
      youtubeUrl: 'https://youtube.com/@elenarostova',
    },
  };

  const mockAcceptedCreatorDetail = {
    id: 'inq-creat-accepted-1',
    status: 'ACCEPTED',
    collaborationType: 'Sponsored Instagram Reel',
    platform: 'Instagram',
    deliverables: '1 Dedicated Reel + 2 Stories',
    timelineStart: '2026-10-01',
    timelineEnd: '2026-10-15',
    brief: 'Showcase our autumn luxury knitwear collection.',
    additionalRequirements: 'Deliver raw video footage within 48h.',
    createdAt: new Date('2026-09-10T10:00:00Z').toISOString(),
    expiresAt: new Date('2026-11-09T10:00:00Z').toISOString(),
    respondedAt: new Date('2026-09-11T12:00:00Z').toISOString(),
    closedAt: null,
    business: {
      id: 'bp-lumina-001',
      businessName: 'Lumina Fashion',
      logoUrl: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b',
      category: 'Fashion & Apparel',
      description: 'Contemporary sustainable luxury fashion brand.',
      city: 'Milan',
      stateOrProvince: 'Lombardy',
      country: 'Italy',
      websiteUrl: 'https://luminafashion.example.com',
      instagramUrl: 'https://instagram.com/luminafashion',
    },
    contact: {
      businessName: 'Lumina Fashion',
      collaborationEmail: 'partnerships@luminafashion.example.com',
      websiteUrl: 'https://luminafashion.example.com',
      instagramUrl: 'https://instagram.com/luminafashion',
    },
  };

  const setupAuth = async (page: any, authPayload: any) => {
    await page.addInitScript((authData: any) => {
      (window as any).__MOCK_FIREBASE_USER__ = {
        uid: authData.user.firebaseUid,
        email: authData.user.email,
        emailVerified: true,
        getIdToken: async () => 'mock-token',
      };
    }, authPayload);

    await page.route('**/api/v1/auth/me', async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(authPayload),
      });
    });
  };

  // FLOW 1: Business views ACCEPTED inquiry and sees complete Creator Contact card
  test('FLOW 1 — Business: Views ACCEPTED inquiry detail and accesses Creator Contact card with mailto and socials', async ({
    page,
  }) => {
    await setupAuth(page, mockBusinessAuth);

    await page.route('**/api/v1/inquiries/inq-biz-accepted-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ inquiry: mockAcceptedBusinessDetail }),
      });
    });

    await page.goto('/business/inquiries/inq-biz-accepted-1');

    // Verify status banner indicates accepted collaboration
    await expect(page.locator('h3:has-text("Proposal Accepted")')).toBeVisible();

    // Verify Creator Contact card is rendered
    const contactCard = page.locator('div[aria-labelledby="creator-contact-heading"]');
    await expect(contactCard).toBeVisible();
    await expect(page.locator('#creator-contact-heading')).toHaveText('Creator Contact');
    await expect(contactCard).toContainText('Elena Rostova');

    // Verify collaboration email link with mailto:
    const emailLink = contactCard.locator('a[href="mailto:elena.collab@agency.com"]');
    await expect(emailLink).toBeVisible();
    await expect(emailLink).toHaveText('elena.collab@agency.com');

    // Verify copy button exists
    const copyButton = contactCard.locator('button[aria-label="Copy email address"]');
    await expect(copyButton).toBeVisible();

    // Verify social links have safe target and rel attributes
    const igLink = contactCard.locator('a[href="https://instagram.com/elenarostova"]');
    await expect(igLink).toBeVisible();
    await expect(igLink).toHaveAttribute('target', '_blank');
    await expect(igLink).toHaveAttribute('rel', 'noopener noreferrer');

    const ytLink = contactCard.locator('a[href="https://youtube.com/@elenarostova"]');
    await expect(ytLink).toBeVisible();
    await expect(ytLink).toHaveAttribute('target', '_blank');
    await expect(ytLink).toHaveAttribute('rel', 'noopener noreferrer');

    // Verify private auth email is NEVER rendered
    const bodyContent = await page.content();
    expect(bodyContent).not.toContain('creator-secret-auth@firebase.com');
    expect(bodyContent).not.toContain('business-secret-auth@firebase.com');
  });

  // FLOW 2: Creator views ACCEPTED inquiry and sees complete Business Contact card
  test('FLOW 2 — Creator: Views ACCEPTED inquiry detail and accesses Business Contact card with mailto and website', async ({
    page,
  }) => {
    await setupAuth(page, mockCreatorAuth);

    await page.route('**/api/v1/creators/me/inquiries/inq-creat-accepted-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ inquiry: mockAcceptedCreatorDetail }),
      });
    });

    await page.goto('/creator/inquiries/inq-creat-accepted-1');

    // Verify status banner indicates proposal accepted
    await expect(page.locator('h3:has-text("Collaboration Accepted")')).toBeVisible();

    // Verify Business Contact card is rendered
    const contactCard = page.locator('div[aria-labelledby="business-contact-heading"]');
    await expect(contactCard).toBeVisible();
    await expect(page.locator('#business-contact-heading')).toHaveText('Business Contact');
    await expect(contactCard).toContainText('Lumina Fashion');

    // Verify collaboration email link with mailto:
    const emailLink = contactCard.locator(
      'a[href="mailto:partnerships@luminafashion.example.com"]'
    );
    await expect(emailLink).toBeVisible();
    await expect(emailLink).toHaveText('partnerships@luminafashion.example.com');

    // Verify copy button exists
    const copyButton = contactCard.locator('button[aria-label="Copy email address"]');
    await expect(copyButton).toBeVisible();

    // Verify website and Instagram links
    const webLink = contactCard.locator('a[href="https://luminafashion.example.com"]');
    await expect(webLink).toBeVisible();
    await expect(webLink).toHaveAttribute('target', '_blank');
    await expect(webLink).toHaveAttribute('rel', 'noopener noreferrer');

    const igLink = contactCard.locator('a[href="https://instagram.com/luminafashion"]');
    await expect(igLink).toBeVisible();
    await expect(igLink).toHaveAttribute('target', '_blank');
    await expect(igLink).toHaveAttribute('rel', 'noopener noreferrer');

    // Verify private auth email is NEVER rendered
    const bodyContent = await page.content();
    expect(bodyContent).not.toContain('creator-secret-auth@firebase.com');
    expect(bodyContent).not.toContain('business-secret-auth@firebase.com');
  });

  // FLOW 3: Non-accepted inquiry states do NOT reveal contact card
  test('FLOW 3 — Non-accepted inquiries (PENDING) strictly suppress contact cards', async ({
    page,
  }) => {
    await setupAuth(page, mockCreatorAuth);

    const pendingInquiry = {
      ...mockAcceptedCreatorDetail,
      id: 'inq-pending-1',
      status: 'PENDING',
      respondedAt: null,
      contact: null,
    };

    await page.route('**/api/v1/creators/me/inquiries/inq-pending-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ inquiry: pendingInquiry }),
      });
    });

    await page.goto('/creator/inquiries/inq-pending-1');

    await expect(page.locator('h3:has-text("Awaiting Your Response")')).toBeVisible();

    // Business Contact card MUST NOT be present
    await expect(page.locator('#business-contact-heading')).not.toBeVisible();
    await expect(page.locator('text=Direct Communication')).not.toBeVisible();
  });
});
