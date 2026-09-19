import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { HeaderNotificationDropdown } from '../components/notification/HeaderNotificationDropdown';
import * as notificationsApiModule from '../services/api/notifications';
import { NotificationType, NotificationDTO, UserRole } from '@creator-connect/shared';

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock AuthContext
let mockAuthState = {
  appUser: {
    id: 'u100',
    email: 'creator@example.com',
    role: UserRole.CREATOR,
  } as any,
  status: 'AUTHENTICATED',
};

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

// Mock notifications API
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

describe('Phase 12 Frontend HeaderNotificationDropdown Test Suite', () => {
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

  const mockNotificationItem3: NotificationDTO = {
    id: 'n3',
    type: NotificationType.INQUIRY_REJECTED,
    referenceId: 'inq-103',
    readAt: null,
    createdAt: new Date().toISOString(),
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
    };
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <HeaderNotificationDropdown />
        </MemoryRouter>
      </QueryClientProvider>
    );

  it('renders nothing when user is unauthenticated', () => {
    mockAuthState = {
      appUser: null,
      status: 'UNAUTHENTICATED',
    };

    renderComponent();
    expect(screen.queryByRole('button', { name: /notifications/i })).not.toBeInTheDocument();
  });

  it('renders bell with unread badge counter when unreadCount > 0', async () => {
    vi.mocked(notificationsApiModule.notificationsApi.getNotifications).mockResolvedValue({
      notifications: [mockNotificationItem1, mockNotificationItem2],
      unreadCount: 1,
    });

    renderComponent();

    const trigger = await screen.findByRole('button', { name: /notifications/i });
    expect(trigger).toBeInTheDocument();

    const badge = await screen.findByText('1');
    expect(badge).toBeInTheDocument();
  });

  it('renders bell without badge counter when unreadCount is 0', async () => {
    vi.mocked(notificationsApiModule.notificationsApi.getNotifications).mockResolvedValue({
      notifications: [mockNotificationItem2],
      unreadCount: 0,
    });

    renderComponent();

    const trigger = await screen.findByRole('button', { name: /notifications/i });
    expect(trigger).toBeInTheDocument();

    expect(screen.queryByLabelText(/unread notifications/i)).not.toBeInTheDocument();
  });

  it('toggles dropdown popover and displays notification items with neutral inquiry terminology', async () => {
    vi.mocked(notificationsApiModule.notificationsApi.getNotifications).mockResolvedValue({
      notifications: [mockNotificationItem1, mockNotificationItem2],
      unreadCount: 1,
    });

    renderComponent();

    const trigger = await screen.findByRole('button', { name: /notifications/i });
    fireEvent.click(trigger);

    // Popover is displayed
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('1 new')).toBeInTheDocument();

    // Neutral inquiry copy
    expect(screen.getByText('New inquiry received')).toBeInTheDocument();
    expect(screen.getByText('Review the collaboration details')).toBeInTheDocument();
    expect(screen.getByText('Inquiry accepted')).toBeInTheDocument();
    expect(screen.getByText('Contact details are now available')).toBeInTheDocument();

    // Verify "Campaign" terminology is NOT present
    expect(screen.queryByText(/campaign/i)).not.toBeInTheDocument();
  });

  it('closes dropdown popover on Escape key press', async () => {
    vi.mocked(notificationsApiModule.notificationsApi.getNotifications).mockResolvedValue({
      notifications: [mockNotificationItem1],
      unreadCount: 1,
    });

    renderComponent();

    const trigger = await screen.findByRole('button', { name: /notifications/i });
    fireEvent.click(trigger);

    expect(screen.getByText('Notifications')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
    });
  });

  it('calls markNotificationAsRead mutation and navigates to role-specific inquiry route on click', async () => {
    vi.mocked(notificationsApiModule.notificationsApi.getNotifications).mockResolvedValue({
      notifications: [mockNotificationItem1],
      unreadCount: 1,
    });
    vi.mocked(notificationsApiModule.notificationsApi.markNotificationAsRead).mockResolvedValue({
      notification: { ...mockNotificationItem1, readAt: new Date().toISOString() },
    });

    renderComponent();

    const trigger = await screen.findByRole('button', { name: /notifications/i });
    fireEvent.click(trigger);

    const notifButton = screen.getByText('New inquiry received').closest('button')!;
    fireEvent.click(notifButton);

    // Verify markAsRead was called for unread item
    await waitFor(() => {
      expect(notificationsApiModule.notificationsApi.markNotificationAsRead).toHaveBeenCalledWith('n1');
    });

    // Verify navigation destination for CREATOR role
    expect(mockNavigate).toHaveBeenCalledWith('/creator/inquiries/inq-101');
  });

  it('navigates to business inquiry route on click when role is BUSINESS', async () => {
    mockAuthState = {
      appUser: {
        id: 'b100',
        email: 'biz@example.com',
        role: UserRole.BUSINESS,
      },
      status: 'AUTHENTICATED',
    };

    vi.mocked(notificationsApiModule.notificationsApi.getNotifications).mockResolvedValue({
      notifications: [mockNotificationItem2], // Already read
      unreadCount: 0,
    });

    renderComponent();

    const trigger = await screen.findByRole('button', { name: /notifications/i });
    fireEvent.click(trigger);

    const notifButton = screen.getByText('Inquiry accepted').closest('button')!;
    fireEvent.click(notifButton);

    // Already read, so markNotificationAsRead is NOT called
    expect(notificationsApiModule.notificationsApi.markNotificationAsRead).not.toHaveBeenCalled();

    // Verify navigation destination for BUSINESS role
    expect(mockNavigate).toHaveBeenCalledWith('/business/inquiries/inq-102');
  });

  it('calls markAllNotificationsAsRead mutation when clicking Mark all read', async () => {
    vi.mocked(notificationsApiModule.notificationsApi.getNotifications).mockResolvedValue({
      notifications: [mockNotificationItem1],
      unreadCount: 1,
    });
    vi.mocked(notificationsApiModule.notificationsApi.markAllNotificationsAsRead).mockResolvedValue({
      updatedCount: 1,
    });

    renderComponent();

    const trigger = await screen.findByRole('button', { name: /notifications/i });
    fireEvent.click(trigger);

    const markAllButton = screen.getByRole('button', { name: /mark all read/i });
    expect(markAllButton).not.toBeDisabled();

    fireEvent.click(markAllButton);

    await waitFor(() => {
      expect(notificationsApiModule.notificationsApi.markAllNotificationsAsRead).toHaveBeenCalledTimes(1);
    });
  });

  it('renders clean empty state when notifications array is empty', async () => {
    vi.mocked(notificationsApiModule.notificationsApi.getNotifications).mockResolvedValue({
      notifications: [],
      unreadCount: 0,
    });

    renderComponent();

    const trigger = await screen.findByRole('button', { name: /notifications/i });
    fireEvent.click(trigger);

    expect(screen.getByText('No notifications yet')).toBeInTheDocument();
    expect(screen.getByText('Inquiry and collaboration updates will appear here.')).toBeInTheDocument();
  });

  it('1 unread → click → unread count drops to 0 and badge disappears', async () => {
    let unreadCount = 1;
    let notifs: NotificationDTO[] = [mockNotificationItem1];

    vi.mocked(notificationsApiModule.notificationsApi.getNotifications).mockImplementation(async () => ({
      notifications: notifs,
      unreadCount,
    }));
    vi.mocked(notificationsApiModule.notificationsApi.markNotificationAsRead).mockImplementation(async (id) => {
      notifs = notifs.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
      unreadCount = notifs.filter((n) => !n.readAt).length;
      return {
        notification: notifs.find((n) => n.id === id)!,
      };
    });

    renderComponent();

    // 1. Initial state: badge shows '1'
    const badge = await screen.findByText('1');
    expect(badge).toBeInTheDocument();

    const trigger = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(trigger);

    // 2. Click unread notification
    const notifButton = screen.getByText('New inquiry received').closest('button')!;
    fireEvent.click(notifButton);

    // 3. markNotificationAsRead was invoked with 'n1'
    await waitFor(() => {
      expect(notificationsApiModule.notificationsApi.markNotificationAsRead).toHaveBeenCalledWith('n1');
    });

    // 4. Optimistic update / settled refetch: unreadCount is 0, badge is removed from DOM
    await waitFor(() => {
      expect(screen.queryByLabelText(/unread notifications/i)).not.toBeInTheDocument();
    });

    // 5. Navigated to target inquiry
    expect(mockNavigate).toHaveBeenCalledWith('/creator/inquiries/inq-101');
  });

  it('2 unread → click one → unread count drops to 1 and badge updates', async () => {
    let unreadCount = 2;
    let notifs: NotificationDTO[] = [mockNotificationItem1, mockNotificationItem3];

    vi.mocked(notificationsApiModule.notificationsApi.getNotifications).mockImplementation(async () => ({
      notifications: notifs,
      unreadCount,
    }));
    vi.mocked(notificationsApiModule.notificationsApi.markNotificationAsRead).mockImplementation(async (id) => {
      notifs = notifs.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
      unreadCount = notifs.filter((n) => !n.readAt).length;
      return {
        notification: notifs.find((n) => n.id === id)!,
      };
    });

    renderComponent();

    // 1. Initial state: badge shows '2'
    const badge = await screen.findByText('2');
    expect(badge).toBeInTheDocument();

    const trigger = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(trigger);

    // 2. Click the first unread notification ('n1')
    const notifButton = screen.getByText('New inquiry received').closest('button')!;
    fireEvent.click(notifButton);

    // 3. markNotificationAsRead was called for 'n1'
    await waitFor(() => {
      expect(notificationsApiModule.notificationsApi.markNotificationAsRead).toHaveBeenCalledWith('n1');
    });

    // 4. Optimistic update / settled refetch: unreadCount drops to 1, badge now shows '1'
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    // 5. Navigated to target inquiry
    expect(mockNavigate).toHaveBeenCalledWith('/creator/inquiries/inq-101');
  });

  it('already-read notification remains read and does not trigger mutation or alter unread count', async () => {
    vi.mocked(notificationsApiModule.notificationsApi.getNotifications).mockResolvedValue({
      notifications: [mockNotificationItem1, mockNotificationItem2],
      unreadCount: 1,
    });

    renderComponent();

    // 1. Initial state: badge shows '1'
    expect(await screen.findByText('1')).toBeInTheDocument();

    const trigger = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(trigger);

    // 2. Click the already-read notification ('n2')
    const alreadyReadButton = screen.getByText('Inquiry accepted').closest('button')!;
    fireEvent.click(alreadyReadButton);

    // 3. markNotificationAsRead was NOT called
    expect(notificationsApiModule.notificationsApi.markNotificationAsRead).not.toHaveBeenCalled();

    // 4. Unread count remains 1
    expect(screen.getByText('1')).toBeInTheDocument();

    // 5. Navigated to target inquiry
    expect(mockNavigate).toHaveBeenCalledWith('/creator/inquiries/inq-102');
  });

  it('rolls back optimistic unread count when markNotificationAsRead mutation fails', async () => {
    vi.mocked(notificationsApiModule.notificationsApi.getNotifications).mockResolvedValue({
      notifications: [mockNotificationItem1],
      unreadCount: 1,
    });
    vi.mocked(notificationsApiModule.notificationsApi.markNotificationAsRead).mockRejectedValue(
      new Error('Network error')
    );

    renderComponent();

    // 1. Initial state: badge shows '1'
    expect(await screen.findByText('1')).toBeInTheDocument();

    const trigger = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(trigger);

    // 2. Click unread notification
    const notifButton = screen.getByText('New inquiry received').closest('button')!;
    fireEvent.click(notifButton);

    // 3. Mutation was attempted
    await waitFor(() => {
      expect(notificationsApiModule.notificationsApi.markNotificationAsRead).toHaveBeenCalledWith('n1');
    });

    // 4. On error, optimistic rollback restores badge to '1'
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });
});
