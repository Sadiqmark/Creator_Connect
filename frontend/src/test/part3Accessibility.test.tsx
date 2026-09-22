import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { CreatorDiscoveryPage } from '../pages/public/CreatorDiscoveryPage';
import { SpecialtiesSelect } from '../components/ui/SpecialtiesSelect';
import { PhotoUpload } from '../components/ui/PhotoUpload';
import { LoginPage } from '../pages/auth/LoginPage';
import { HeaderNotificationDropdown } from '../components/notification/HeaderNotificationDropdown';
import { useAuth } from '../context/AuthContext';
import * as notificationsApiModule from '../services/api/notifications';
import * as creatorsApi from '../services/api/creators';
import * as savedCreatorsApi from '../services/api/savedCreators';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../services/api/creators');
vi.mock('../services/api/savedCreators');
vi.mock('../services/api/notifications');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Phase 18 Part 3 — Accessibility Hardening Test Suite', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    vi.mocked(useAuth).mockReturnValue({
      user: null,
      appUser: null,
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      sendPasswordReset: vi.fn(),
      refreshAppUser: vi.fn(),
    } as any);

    vi.mocked(creatorsApi.listCreators).mockResolvedValue({
      creators: [],
      pagination: {
        page: 1,
        limit: 24,
        total: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    });
    vi.mocked(savedCreatorsApi.getSavedCreatorIds).mockResolvedValue([]);
  });

  // ============================================================================
  // 1. Niche Filters (CreatorDiscoveryPage)
  // ============================================================================
  describe('Niche Filters Accessibility', () => {
    it('exposes group semantics and aria-pressed states on niche filter buttons', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <CreatorDiscoveryPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      // Verify wrapping container has role="group" and accessible label
      const filterGroup = screen.getByRole('group', { name: /Filter creators by niche/i });
      expect(filterGroup).toBeInTheDocument();

      // By default, "All" is the active/selected niche
      const allButton = screen.getByRole('button', { name: 'All' });
      expect(allButton).toHaveAttribute('aria-pressed', 'true');

      // Other niches default to aria-pressed="false"
      const fashionButton = screen.getByRole('button', { name: 'Fashion' });
      expect(fashionButton).toHaveAttribute('aria-pressed', 'false');

      const techButton = screen.getByRole('button', { name: 'Technology' });
      expect(techButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('updates aria-pressed on click and remains keyboard activatable via Enter/Space', async () => {
      const user = userEvent.setup();

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <CreatorDiscoveryPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      const allButton = screen.getByRole('button', { name: 'All' });
      const fashionButton = screen.getByRole('button', { name: 'Fashion' });

      // Click Fashion niche
      await user.click(fashionButton);
      expect(fashionButton).toHaveAttribute('aria-pressed', 'true');
      expect(allButton).toHaveAttribute('aria-pressed', 'false');

      // Keyboard activation via Space on Technology
      const techButton = screen.getByRole('button', { name: 'Technology' });
      techButton.focus();
      expect(document.activeElement).toBe(techButton);

      await user.keyboard(' ');
      expect(techButton).toHaveAttribute('aria-pressed', 'true');
      expect(fashionButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('search clear button has comfortable hit padding (p-1.5)', async () => {
      const user = userEvent.setup();

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <CreatorDiscoveryPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      const searchInput = screen.getByLabelText(/Search creators/i);
      await user.type(searchInput, 'Elena');

      const clearBtn = screen.getByRole('button', { name: /Clear search text/i });
      expect(clearBtn).toBeInTheDocument();
      expect(clearBtn).toHaveClass('p-1.5');
    });
  });

  // ============================================================================
  // 2. SpecialtiesSelect Accessibility
  // ============================================================================
  describe('SpecialtiesSelect Accessibility', () => {
    it('exposes aria-pressed on popular specialty toggle chips', () => {
      const onChange = vi.fn();
      render(
        <SpecialtiesSelect
          value={['Short-Form Video']}
          onChange={onChange}
          max={10}
        />
      );

      // 'Short-Form Video' is selected => aria-pressed="true"
      const selectedChip = screen.getByRole('button', { name: /✓ Short-Form Video/i });
      expect(selectedChip).toHaveAttribute('aria-pressed', 'true');

      // 'Long-Form Video' is unselected => aria-pressed="false"
      const unselectedChip = screen.getByRole('button', { name: /\+ Long-Form Video/i });
      expect(unselectedChip).toHaveAttribute('aria-pressed', 'false');
    });

    it('custom specialty input has accessible name "Add custom specialty"', () => {
      render(
        <SpecialtiesSelect
          value={[]}
          onChange={vi.fn()}
          max={10}
        />
      );

      const customInput = screen.getByLabelText('Add custom specialty');
      expect(customInput).toBeInTheDocument();
      expect(customInput).toHaveAttribute('placeholder', 'Add custom content specialty...');
    });

    it('validation error has role="alert"', () => {
      render(
        <SpecialtiesSelect
          value={[]}
          onChange={vi.fn()}
          max={10}
          error="Please select at least 1 specialty."
        />
      );

      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toBeInTheDocument();
      expect(errorAlert).toHaveTextContent('Please select at least 1 specialty.');
    });
  });

  // ============================================================================
  // 3. PhotoUpload Accessibility
  // ============================================================================
  describe('PhotoUpload Accessibility', () => {
    it('associates label with hidden file input via htmlFor and exposes aria-label', () => {
      render(
        <PhotoUpload
          value={null}
          onChange={vi.fn()}
          label="Profile Photo"
        />
      );

      // Label is associated with file input by htmlFor="photo-upload-input"
      const fileInput = screen.getByLabelText(/Profile Photo/i);
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveAttribute('id', 'photo-upload-input');
      expect(fileInput).toHaveAttribute('type', 'file');
      expect(fileInput).toHaveAttribute('aria-label', 'Profile Photo');
    });
  });

  // ============================================================================
  // 4. LoginPage Error Announcement
  // ============================================================================
  describe('LoginPage Error Accessibility', () => {
    it('announces authentication errors with role="alert"', async () => {
      const mockSignIn = vi.fn().mockRejectedValue({
        code: 'auth/invalid-credential',
        message: 'Invalid email or password. Please try again.',
      });

      vi.mocked(useAuth).mockReturnValue({
        user: null,
        appUser: null,
        loading: false,
        signIn: mockSignIn,
        signUp: vi.fn(),
        signOut: vi.fn(),
        sendPasswordReset: vi.fn(),
        refreshAppUser: vi.fn(),
      } as any);

      const user = userEvent.setup();

      render(
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText(/Email address/i);
      const passwordInput = screen.getByLabelText(/Password/i);
      const submitBtn = screen.getByRole('button', { name: /Sign In/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitBtn);

      await waitFor(() => {
        const alertBanner = screen.getByRole('alert');
        expect(alertBanner).toBeInTheDocument();
        expect(alertBanner).toHaveTextContent('Invalid email or password. Please try again.');
      });
    });
  });

  // ============================================================================
  // 5. Notification Trigger Accessible Name
  // ============================================================================
  describe('Notification Trigger Accessible Name', () => {
    it('exposes "Notifications" accessible name when unread count is zero', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { uid: 'u-1' },
        appUser: { id: 'u-1', role: 'CREATOR' },
        status: 'AUTHENTICATED',
        loading: false,
      } as any);

      vi.mocked(notificationsApiModule.notificationsApi.getNotifications).mockResolvedValue({
        notifications: [],
        unreadCount: 0,
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <HeaderNotificationDropdown />
          </MemoryRouter>
        </QueryClientProvider>
      );

      const trigger = await screen.findByRole('button', { name: 'Notifications' });
      expect(trigger).toBeInTheDocument();
      expect(trigger).toHaveAttribute('aria-label', 'Notifications');

      // Unread badge is not present
      expect(screen.queryByText(/unread/i)).not.toBeInTheDocument();
    });

    it('exposes "Notifications, N unread" when unread count > 0, and unread badge is aria-hidden', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { uid: 'u-1' },
        appUser: { id: 'u-1', role: 'CREATOR' },
        status: 'AUTHENTICATED',
        loading: false,
      } as any);

      vi.mocked(notificationsApiModule.notificationsApi.getNotifications).mockResolvedValue({
        notifications: [
          {
            id: 'notif-1',
            userId: 'u-1',
            type: 'NEW_INQUIRY',
            referenceId: 'inq-1',
            readAt: null,
            createdAt: new Date().toISOString(),
          } as any,
        ],
        unreadCount: 3,
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <HeaderNotificationDropdown />
          </MemoryRouter>
        </QueryClientProvider>
      );

      // Trigger button accessible name includes the unread count
      const trigger = await screen.findByRole('button', { name: 'Notifications, 3 unread' });
      expect(trigger).toBeInTheDocument();
      expect(trigger).toHaveAttribute('aria-label', 'Notifications, 3 unread');

      // Inner badge span is aria-hidden to prevent redundant screen reader announcements
      const badge = screen.getByText('3');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('aria-hidden', 'true');
    });
  });
});
