import { test, expect } from '@playwright/test';

test.describe('Phase 12 — Header Notifications & Inquiry Navigation E2E Suite', () => {
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
      profilePhotoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
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
      logoUrl: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b',
    },
    onboardingCompleted: true,
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

  test('1 unread → click → unread count 0, navigates to target inquiry, and persists across refresh', async ({
    page,
  }) => {
    await setupAuth(page, mockCreatorAuth);

    const mockNotifications = {
      notifications: [
        {
          id: 'n-001',
          type: 'INQUIRY_RECEIVED',
          referenceId: 'inq-creator-123',
          readAt: null as string | null,
          createdAt: new Date().toISOString(),
        },
      ],
      unreadCount: 1,
    };

    let patchCallCount = 0;

    await page.route(/\/api\/v1\/notifications/, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockNotifications),
        });
      } else if (route.request().method() === 'PATCH') {
        patchCallCount++;
        mockNotifications.notifications[0].readAt = new Date().toISOString();
        mockNotifications.unreadCount = 0;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            notification: { ...mockNotifications.notifications[0] },
          }),
        });
      }
    });

    await page.route('**/api/v1/creators/me/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          inquiries: { pending: 1, accepted: 0, rejected: 0, expired: 0, total: 1 },
          recentInquiries: [],
        }),
      });
    });

    await page.route('**/api/v1/creators/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockCreatorAuth.profile),
      });
    });

    await page.route('**/api/v1/creators/me/inquiries/inq-creator-123', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          inquiry: {
            id: 'inq-creator-123',
            status: 'PENDING',
            collaborationType: 'Sponsored Reel',
            platform: 'Instagram',
            deliverables: '1 Dedicated Reel',
            timelineStart: null,
            timelineEnd: null,
            brief: 'Collaboration proposal for spring showcase.',
            additionalRequirements: null,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString(),
            respondedAt: null,
            closedAt: null,
            business: {
              id: 'bp-001',
              businessName: 'Lumina Brand',
              logoUrl: null,
              category: 'Fashion',
              description: 'Brand description',
              city: 'Mumbai',
              stateOrProvince: 'MH',
              country: 'India',
              websiteUrl: null,
              instagramUrl: null,
            },
            contact: null,
          },
        }),
      });
    });

    // 1. Navigate to Creator Dashboard
    await page.goto('/creator/dashboard');
    await page.waitForLoadState('networkidle');

    // Initial state: badge displays '1'
    const bellButton = page.getByRole('button', { name: /Notifications, 1 unread/i });
    await expect(bellButton).toBeVisible();
    await expect(bellButton.locator('span[aria-hidden="true"]')).toHaveText('1');

    // 2. Open popover dropdown
    await bellButton.click();
    await expect(page.getByText('Notifications')).toBeVisible();
    await expect(page.getByText('New inquiry received')).toBeVisible();
    await expect(page.getByText('Review the collaboration details')).toBeVisible();

    // Verify neutral copy (no Campaign)
    await expect(page.getByText(/campaign/i)).toHaveCount(0);

    // 3. Click notification item -> marks as read and navigates to inquiry detail
    await page.getByText('New inquiry received').click();
    await page.waitForURL('**/creator/inquiries/inq-creator-123');
    await expect(page.getByText('Collaboration proposal for spring showcase.')).toBeVisible();

    // 4. Verify PATCH was invoked exactly once
    expect(patchCallCount).toBe(1);

    // 5. Verify detail page has NO standalone notification bell (removed per UX correction)
    await expect(page.getByRole('button', { name: /Notifications/i })).toHaveCount(0);

    // 6. Navigate back to Creator Dashboard
    await page.goto('/creator/dashboard');
    await page.waitForLoadState('networkidle');

    // 7. On dashboard: bell is visible, and unread badge is now gone (unreadCount: 0)
    const dashBellButton = page.getByRole('button', { name: /^Notifications$/i });
    await expect(dashBellButton).toBeVisible();
    await expect(dashBellButton.locator('span[aria-hidden="true"]')).toHaveCount(0);

    // 8. Refresh persistence: reload dashboard page and confirm unread count remains 0
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /^Notifications$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Notifications$/i }).locator('span[aria-hidden="true"]')).toHaveCount(0);
  });

  test('2 unread → click one → unread count 1, refresh persistence, and already-read notification remains read', async ({
    page,
  }) => {
    await setupAuth(page, mockBusinessAuth);

    const mockNotifications = {
      notifications: [
        {
          id: 'n-001',
          type: 'INQUIRY_ACCEPTED',
          referenceId: 'inq-biz-456',
          readAt: null as string | null,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'n-002',
          type: 'INQUIRY_REJECTED',
          referenceId: 'inq-biz-789',
          readAt: null as string | null,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
      ],
      unreadCount: 2,
    };

    let patchCalls: string[] = [];

    await page.route(/\/api\/v1\/notifications/, async (route) => {
      const url = route.request().url();
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockNotifications),
        });
      } else if (route.request().method() === 'PATCH') {
        const notifId = url.split('/notifications/')[1]?.split('/')[0];
        if (notifId) patchCalls.push(notifId);

        const target = mockNotifications.notifications.find((n) => n.id === notifId);
        if (target && !target.readAt) {
          target.readAt = new Date().toISOString();
          mockNotifications.unreadCount = mockNotifications.notifications.filter((n) => !n.readAt).length;
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ notification: target }),
        });
      }
    });

    await page.route('**/api/v1/businesses/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockBusinessAuth.profile),
      });
    });

    await page.route('**/api/v1/inquiries/inq-biz-456', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          inquiry: {
            id: 'inq-biz-456',
            status: 'ACCEPTED',
            collaborationType: 'Dedicated Reel',
            platform: 'Instagram',
            deliverables: '1 Dedicated Reel',
            timelineStart: null,
            timelineEnd: null,
            brief: 'Spring launch collaboration.',
            additionalRequirements: null,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString(),
            respondedAt: new Date().toISOString(),
            closedAt: null,
            creator: {
              id: 'cp-001',
              name: 'Elena Rostova',
              profilePhotoUrl: null,
              niche: 'Fashion',
              location: 'Mumbai',
              bio: 'Bio text',
              specialties: ['Fashion'],
              instagramUrl: 'https://instagram.com/elena',
              youtubeUrl: null,
            },
            contact: {
              name: 'Elena Rostova',
              collaborationEmail: 'elena@collab.com',
              instagramUrl: 'https://instagram.com/elena',
              youtubeUrl: null,
            },
          },
        }),
      });
    });

    // 1. Navigate to Business Dashboard
    await page.goto('/business/dashboard');
    await page.waitForLoadState('networkidle');

    // Initial state: badge shows '2'
    const bellButton = page.getByRole('button', { name: /Notifications, 2 unread/i });
    await expect(bellButton).toBeVisible();
    await expect(bellButton.locator('span[aria-hidden="true"]')).toHaveText('2');

    // 2. Open popover dropdown
    await bellButton.click();
    await expect(page.getByText('Inquiry accepted')).toBeVisible();
    await expect(page.getByText('Inquiry declined')).toBeVisible();

    // 3. Click first unread notification (n-001) -> marks as read and navigates
    await page.getByText('Inquiry accepted').click();
    await page.waitForURL('**/business/inquiries/inq-biz-456');

    // 4. Contact details are displayed on detail page
    await expect(page.getByText('elena@collab.com')).toBeVisible();

    // 5. Verify PATCH was called for n-001
    expect(patchCalls).toContain('n-001');

    // 6. Verify detail page has NO standalone notification bell (removed per UX correction)
    await expect(page.getByRole('button', { name: /Notifications/i })).toHaveCount(0);

    // 7. Navigate back to Business Dashboard
    await page.goto('/business/dashboard');
    await page.waitForLoadState('networkidle');

    // 8. Dashboard notification bell shows badge '1' (unreadCount dropped by 1 to 1)
    const returnBellButton = page.getByRole('button', { name: /Notifications, 1 unread/i });
    await expect(returnBellButton).toBeVisible();
    await expect(returnBellButton.locator('span[aria-hidden="true"]')).toHaveText('1');

    // 9. Refresh persistence: reload dashboard page -> unread badge remains '1'
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /Notifications, 1 unread/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Notifications, 1 unread/i }).locator('span[aria-hidden="true"]')).toHaveText('1');

    // 10. Already-read notification remains read:
    // Open dropdown on dashboard and click the already-read notification (n-001)
    const reloadedBell = page.getByRole('button', { name: /Notifications, 1 unread/i });
    await reloadedBell.click();
    await expect(page.getByText('Notifications')).toBeVisible();

    const patchCountBefore = patchCalls.length;
    await page.getByText('Inquiry accepted').click();
    await page.waitForURL('**/business/inquiries/inq-biz-456');

    // Verify NO new PATCH request was sent for the already-read notification
    expect(patchCalls.length).toBe(patchCountBefore);

    // 11. Navigate back to dashboard -> unread badge remains '1'
    await page.goto('/business/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /Notifications, 1 unread/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Notifications, 1 unread/i }).locator('span[aria-hidden="true"]')).toHaveText('1');
  });
});
