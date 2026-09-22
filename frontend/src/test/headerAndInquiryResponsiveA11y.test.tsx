import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import { HeaderNotificationDropdown } from '../components/notification/HeaderNotificationDropdown';
import { CreatorContactCard, BusinessContactCard } from '../components/inquiry/InquiryContactCard';
import { BusinessDashboard } from '../pages/dashboards/BusinessDashboard';
import { CreatorDashboard } from '../pages/dashboards/CreatorDashboard';
import { CreatorInquiryDetailPage } from '../pages/creator/CreatorInquiryDetailPage';
import { ToastProvider } from '../components/ui/Toast';
import * as notificationsApiModule from '../services/api/notifications';
import * as inquiriesApiModule from '../services/api/inquiries';
import { NotificationType, NotificationDTO, UserRole } from '@creator-connect/shared';

// Mocks
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

let mockAuthState = {
  appUser: {
    id: 'u100',
    email: 'creator@example.com',
    role: UserRole.CREATOR,
  } as any,
  status: 'AUTHENTICATED',
  signOut: vi.fn(),
};

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

vi.mock('../services/api/notifications', async () => {
  const actual = await vi.importActual('../services/api/notifications');
  return {
    ...actual,
    notificationsApi: {
      getNotifications: vi.fn(),
      markNotificationAsRead: vi.fn(),
      markAllNotificationsAsRead: vi.fn(),
    },
  };
});

vi.mock('../services/api/creators', async () => {
  const actual = await vi.importActual('../services/api/creators');
  return {
    ...actual,
    getCreatorDashboard: vi.fn().mockResolvedValue({
      inquiriesSummary: { pending: 1, accepted: 2, rejected: 0, total: 3 },
      recentInquiries: [],
    }),
    getMyCreatorProfile: vi.fn().mockResolvedValue({
      id: 'cp-100',
      name: 'Elena Rostova',
      profilePhotoUrl: null,
      niche: 'Fashion',
      location: 'Milan',
    }),
  };
});

vi.mock('../services/api/business', async () => {
  const actual = await vi.importActual('../services/api/business');
  return {
    ...actual,
    getBusinessDashboard: vi.fn().mockResolvedValue({
      inquiriesSummary: { pending: 1, accepted: 1, rejected: 0, total: 2 },
      recentInquiries: [],
      savedCreatorsCount: 5,
    }),
    getMyBusinessProfile: vi.fn().mockResolvedValue({
      id: 'bp-100',
      businessName: 'Luxe Brands',
      profilePhotoUrl: null,
      industry: 'Fashion',
      location: 'Paris',
    }),
  };
});

vi.mock('../services/api/inquiries', async () => {
  const actual = await vi.importActual('../services/api/inquiries');
  return {
    ...actual,
    getCreatorInquiryDetail: vi.fn(),
    acceptInquiry: vi.fn(),
    rejectInquiry: vi.fn(),
  };
});

describe('Phase 18 Part 2 — Responsive & Shared Header Accessibility Suite', () => {
  let queryClient: QueryClient;

  const mockNotificationItem1: NotificationDTO = {
    id: 'n1',
    type: NotificationType.INQUIRY_RECEIVED,
    referenceId: 'inq-101',
    readAt: null,
    createdAt: new Date().toISOString(),
  };

  const mockNotificationItem2: NotificationDTO = {
    id: 'n2',
    type: NotificationType.INQUIRY_ACCEPTED,
    referenceId: 'inq-102',
    readAt: new Date(Date.now() - 3600000).toISOString(),
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    mockAuthState = {
      appUser: {
        id: 'u100',
        email: 'creator@example.com',
        role: UserRole.CREATOR,
      },
      status: 'AUTHENTICATED',
      signOut: vi.fn(),
    };

    // Mock clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // 1. HeaderNotificationDropdown Accessibility & Semantics
  // ============================================================================
  describe('HeaderNotificationDropdown Semantics & Accessibility', () => {
    const renderDropdown = () =>
      render(
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <MemoryRouter>
              <div data-testid="page-wrapper">
                <HeaderNotificationDropdown />
                <button id="external-page-btn">Next Header Item</button>
              </div>
            </MemoryRouter>
          </ToastProvider>
        </QueryClientProvider>
      );

    it('renders with role="region" and aria-label="Notifications" instead of menu semantics', async () => {
      vi.mocked(notificationsApiModule.notificationsApi.getNotifications).mockResolvedValue({
        notifications: [mockNotificationItem1, mockNotificationItem2],
        unreadCount: 1,
      });

      renderDropdown();

      const trigger = await screen.findByRole('button', { name: /notifications/i });
      const user = userEvent.setup();
      await user.click(trigger);

      // Region & List semantics
      const region = screen.getByRole('region', { name: /notifications/i });
      expect(region).toBeInTheDocument();
      expect(screen.getByRole('list')).toBeInTheDocument();

      // Ensure invalid menu/menuitem roles are NOT present
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
    });

    it('renders concise visually hidden text "Unread: " for unread notifications', async () => {
      vi.mocked(notificationsApiModule.notificationsApi.getNotifications).mockResolvedValue({
        notifications: [mockNotificationItem1, mockNotificationItem2],
        unreadCount: 1,
      });

      renderDropdown();

      const trigger = await screen.findByRole('button', { name: /notifications/i });
      const user = userEvent.setup();
      await user.click(trigger);

      // Verify unread indicator has sr-only announcement
      const unreadIndicator = screen.getByText('Unread:');
      expect(unreadIndicator).toBeInTheDocument();
      expect(unreadIndicator).toHaveClass('sr-only');
    });

    it('uses responsive fluid width class for small mobile viewports (w-[calc(100vw-2rem)])', async () => {
      vi.mocked(notificationsApiModule.notificationsApi.getNotifications).mockResolvedValue({
        notifications: [mockNotificationItem1],
        unreadCount: 1,
      });

      renderDropdown();

      const trigger = await screen.findByRole('button', { name: /notifications/i });
      const user = userEvent.setup();
      await user.click(trigger);

      const popover = screen.getByRole('region', { name: /notifications/i });
      expect(popover).toHaveClass('w-[calc(100vw-2rem)]');
      expect(popover).toHaveClass('sm:w-96');
      expect(popover).toHaveClass('max-w-sm');
    });

    it('closes popover on Escape and restores focus to the trigger button', async () => {
      vi.mocked(notificationsApiModule.notificationsApi.getNotifications).mockResolvedValue({
        notifications: [mockNotificationItem1],
        unreadCount: 1,
      });

      renderDropdown();

      const trigger = await screen.findByRole('button', { name: /notifications/i });
      const user = userEvent.setup();
      await user.click(trigger);

      expect(screen.getByRole('region', { name: /notifications/i })).toBeInTheDocument();

      // Focus an item inside popover
      const markAllBtn = screen.getByRole('button', { name: /Mark all read/i });
      markAllBtn.focus();
      expect(document.activeElement).toBe(markAllBtn);

      // Press Escape
      await user.keyboard('{Escape}');

      // Popover is closed and focus restored to trigger
      await waitFor(() => {
        expect(screen.queryByRole('region', { name: /notifications/i })).not.toBeInTheDocument();
        expect(document.activeElement).toBe(trigger);
      });
    });

    it('does NOT create a focus trap: Tab navigation flows naturally through and out of popover', async () => {
      vi.mocked(notificationsApiModule.notificationsApi.getNotifications).mockResolvedValue({
        notifications: [mockNotificationItem1],
        unreadCount: 1,
      });

      renderDropdown();

      const trigger = await screen.findByRole('button', { name: /notifications/i });
      const nextHeaderBtn = screen.getByRole('button', { name: /Next Header Item/i });
      const user = userEvent.setup();
      await user.click(trigger);

      const notifItem = screen.getByText('New inquiry received').closest('button')!;
      notifItem.focus();
      expect(document.activeElement).toBe(notifItem);

      // Tabbing from the last element inside popover exits naturally to the next header item
      await user.tab();
      expect(document.activeElement).toBe(nextHeaderBtn);
      // Confirms NO cyclic focus trapping back to trigger
      expect(document.activeElement).not.toBe(trigger);
    });

    it('trigger button has comfortable touch target size (w-10 h-10)', async () => {
      vi.mocked(notificationsApiModule.notificationsApi.getNotifications).mockResolvedValue({
        notifications: [],
        unreadCount: 0,
      });

      renderDropdown();

      const trigger = await screen.findByRole('button', { name: /notifications/i });
      expect(trigger).toHaveClass('w-10');
      expect(trigger).toHaveClass('h-10');
    });

    it('"Mark all read" button has adequate padding and remains a button', async () => {
      vi.mocked(notificationsApiModule.notificationsApi.getNotifications).mockResolvedValue({
        notifications: [mockNotificationItem1],
        unreadCount: 1,
      });

      renderDropdown();

      const trigger = await screen.findByRole('button', { name: /notifications/i });
      const user = userEvent.setup();
      await user.click(trigger);

      const markAllBtn = screen.getByRole('button', { name: /Mark all read/i });
      expect(markAllBtn).toBeInTheDocument();
      expect(markAllBtn).toHaveClass('py-1.5');
      expect(markAllBtn).toHaveClass('px-2.5');
    });
  });

  // ============================================================================
  // 2. Dashboard Headers Responsive Contract & Accessible Labels
  // ============================================================================
  describe('Dashboard Headers Responsive Accessibility Contract', () => {
    it('BusinessDashboard header preserves accessible names on collapsed controls and hides workspace badge on mobile', async () => {
      mockAuthState = {
        appUser: {
          id: 'b100',
          email: 'biz@example.com',
          role: UserRole.BUSINESS,
        },
        status: 'AUTHENTICATED',
        signOut: vi.fn(),
      };

      render(
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <MemoryRouter>
              <BusinessDashboard />
            </MemoryRouter>
          </ToastProvider>
        </QueryClientProvider>
      );

      // Verify workspace badge is hidden on mobile screens (hidden md:inline-flex)
      const badge = screen.getByText('Brand Workspace');
      expect(badge).toHaveClass('hidden');
      expect(badge).toHaveClass('md:inline-flex');

      // Verify all 7 controls remain accessible by their accessible names
      expect(screen.getByRole('link', { name: 'Find Creators' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Saved Creators' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Inquiries' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Brand Profile' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sign Out' })).toBeInTheDocument();
    });

    it('CreatorDashboard header preserves accessible names and hides workspace badge on mobile', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <MemoryRouter>
              <CreatorDashboard />
            </MemoryRouter>
          </ToastProvider>
        </QueryClientProvider>
      );

      // Verify workspace badge is hidden on mobile screens (hidden md:inline-flex)
      const badge = screen.getByText('Creator Workspace');
      expect(badge).toHaveClass('hidden');
      expect(badge).toHaveClass('md:inline-flex');

      // Verify all actions have accessible names
      expect(screen.getByRole('link', { name: 'My Profile' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sign Out' })).toBeInTheDocument();
    });
  });

  // ============================================================================
  // 3. Copy Email Feedback Accessibility
  // ============================================================================
  describe('Copy Email Feedback Accessibility', () => {
    const mockCreatorContact = {
      name: 'Elena Rostova',
      collaborationEmail: 'elena@example.com',
      instagramUrl: 'https://instagram.com/elena',
      youtubeUrl: null,
    };

    const mockBusinessContact = {
      businessName: 'Luxe Brands',
      collaborationEmail: 'contact@luxebrands.com',
      websiteUrl: 'https://luxebrands.com',
      instagramUrl: null,
    };

    it('CreatorContactCard: copy button triggers clipboard write, updates copied state, and fires Toast success feedback', async () => {
      const user = userEvent.setup();
      const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText');

      render(
        <ToastProvider>
          <CreatorContactCard contact={mockCreatorContact} />
        </ToastProvider>
      );

      const copyBtn = screen.getByRole('button', { name: /Copy email address/i });
      expect(copyBtn).toBeInTheDocument();

      await user.click(copyBtn);

      // Clipboard was called with collaboration email
      expect(writeTextSpy).toHaveBeenCalledWith('elena@example.com');

      // Toast feedback appears in the DOM
      expect(await screen.findByText('Email copied to clipboard')).toBeInTheDocument();

      // Button state updates visually and via aria-label
      expect(screen.getByRole('button', { name: /Email copied/i })).toBeInTheDocument();
    });

    it('BusinessContactCard: copy button triggers clipboard write, updates copied state, and fires Toast success feedback', async () => {
      const user = userEvent.setup();
      const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText');

      render(
        <ToastProvider>
          <BusinessContactCard contact={mockBusinessContact} />
        </ToastProvider>
      );

      const copyBtn = screen.getByRole('button', { name: /Copy email address/i });
      expect(copyBtn).toBeInTheDocument();

      await user.click(copyBtn);

      expect(writeTextSpy).toHaveBeenCalledWith('contact@luxebrands.com');
      expect(await screen.findByText('Email copied to clipboard')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Email copied/i })).toBeInTheDocument();
    });
  });

  // ============================================================================
  // 4. Creator Inquiry Detail Responsive Actions
  // ============================================================================
  describe('Creator Inquiry Detail Responsive Actions', () => {
    it('renders proposal action buttons in a responsive stacking container (flex-col sm:flex-row w-full sm:w-auto)', async () => {
      vi.mocked(inquiriesApiModule.getCreatorInquiryDetail).mockResolvedValue({
        inquiry: {
          id: 'inq-creator-101',
          status: 'PENDING',
          collaborationType: 'Sponsored Instagram Reel',
          platform: 'Instagram',
          deliverables: '1 Dedicated Reel',
          timelineStart: null,
          timelineEnd: null,
          brief: 'Test campaign brief with sufficient characters',
          additionalRequirements: null,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          respondedAt: null,
          business: {
            id: 'bp-100',
            businessName: 'Lumina Fashion',
            logoUrl: null,
            category: 'Fashion',
            city: 'Milan',
            country: 'Italy',
          },
        },
      } as any);

      render(
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <MemoryRouter initialEntries={['/creator/inquiries/inq-creator-101']}>
              <Routes>
                <Route path="/creator/inquiries/:inquiryId" element={<CreatorInquiryDetailPage />} />
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </QueryClientProvider>
      );

      const declineBtn = await screen.findByRole('button', { name: /Decline Proposal/i });
      const acceptBtn = await screen.findByRole('button', { name: /Accept Collaboration/i });

      expect(declineBtn).toBeInTheDocument();
      expect(acceptBtn).toBeInTheDocument();

      // Check responsive full-width mobile classes on buttons
      expect(declineBtn).toHaveClass('w-full');
      expect(declineBtn).toHaveClass('sm:w-auto');
      expect(acceptBtn).toHaveClass('w-full');
      expect(acceptBtn).toHaveClass('sm:w-auto');

      // Check responsive stacking classes on parent container
      const actionContainer = declineBtn.parentElement;
      expect(actionContainer).toHaveClass('flex-col');
      expect(actionContainer).toHaveClass('sm:flex-row');
      expect(actionContainer).toHaveClass('w-full');
      expect(actionContainer).toHaveClass('sm:w-auto');
    });
  });
});
