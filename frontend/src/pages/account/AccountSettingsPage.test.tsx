import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AccountSettingsPage } from './AccountSettingsPage';
import { UserRole, AccountStatus } from '@creator-connect/shared';

const mockUseAuth = vi.fn();
const mockNavigate = vi.fn();
const mockQueryClientClear = vi.fn();

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    clear: mockQueryClientClear,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('AccountSettingsPage Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <AccountSettingsPage />
      </MemoryRouter>
    );

  it('renders read-only account information for a CREATOR user', () => {
    mockUseAuth.mockReturnValue({
      appUser: {
        id: 'creator-user-1',
        email: 'creator@test.com',
        role: UserRole.CREATOR,
        status: AccountStatus.ACTIVE,
        createdAt: '2026-01-15T12:00:00.000Z',
      },
      deactivateAccount: vi.fn(),
    });

    renderComponent();

    expect(screen.getByRole('heading', { level: 1, name: /Account Settings/i })).toBeInTheDocument();
    expect(screen.getByText('creator@test.com')).toBeInTheDocument();
    expect(screen.getByText('Creator')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText(/January 15, 2026/i)).toBeInTheDocument();

    // Creator gets /creator/profile link and /creator/dashboard back link
    const editProfileLink = screen.getByRole('link', { name: /Edit Profile/i });
    expect(editProfileLink).toHaveAttribute('href', '/creator/profile');

    const backLink = screen.getByRole('link', { name: /Back to Dashboard/i });
    expect(backLink).toHaveAttribute('href', '/creator/dashboard');
  });

  it('renders read-only account information and links for a BUSINESS user', () => {
    mockUseAuth.mockReturnValue({
      appUser: {
        id: 'business-user-1',
        email: 'brand@test.com',
        role: UserRole.BUSINESS,
        status: AccountStatus.ACTIVE,
        createdAt: '2026-02-20T10:00:00.000Z',
      },
      deactivateAccount: vi.fn(),
    });

    renderComponent();

    expect(screen.getByText('brand@test.com')).toBeInTheDocument();
    expect(screen.getByText('Brand Partner (Business)')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText(/February 20, 2026/i)).toBeInTheDocument();

    // Business gets /business/profile link and /business/dashboard back link
    const editProfileLink = screen.getByRole('link', { name: /Edit Profile/i });
    expect(editProfileLink).toHaveAttribute('href', '/business/profile');

    const backLink = screen.getByRole('link', { name: /Back to Dashboard/i });
    expect(backLink).toHaveAttribute('href', '/business/dashboard');
  });

  it('opens DeactivateAccountModal when Deactivate Account button is clicked', () => {
    mockUseAuth.mockReturnValue({
      appUser: {
        id: 'creator-user-1',
        email: 'creator@test.com',
        role: UserRole.CREATOR,
        status: AccountStatus.ACTIVE,
        createdAt: '2026-01-15T12:00:00.000Z',
      },
      deactivateAccount: vi.fn(),
    });

    renderComponent();

    // Modal should initially not be in the DOM
    expect(screen.queryByRole('dialog')).toBeNull();

    // Click Danger Zone Deactivate Account button
    const deactivateBtn = screen.getByRole('button', { name: /Deactivate Account/i });
    fireEvent.click(deactivateBtn);

    // Modal is now open
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Deactivate Account' })).toBeInTheDocument();
  });

  it('completes full account deactivation flow from settings page through modal to /login', async () => {
    const mockDeactivateAccount = vi.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({
      appUser: {
        id: 'creator-user-1',
        email: 'creator@test.com',
        role: UserRole.CREATOR,
        status: AccountStatus.ACTIVE,
        createdAt: '2026-01-15T12:00:00.000Z',
      },
      deactivateAccount: mockDeactivateAccount,
    });

    renderComponent();

    // 1. Click Deactivate Account in Danger Zone
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Deactivate Account/i }));
    });
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();

    // 2. Type DEACTIVATE
    const input = screen.getByPlaceholderText('DEACTIVATE');
    act(() => {
      fireEvent.change(input, { target: { value: 'DEACTIVATE' } });
    });

    // 3. Confirm Deactivation
    const confirmDeactivateBtn = within(dialog).getByRole('button', { name: /Deactivate Account/i });
    expect(confirmDeactivateBtn).toBeEnabled();
    await act(async () => {
      fireEvent.click(confirmDeactivateBtn);
    });

    // 4. Verify deactivateAccount, cache clear, and navigation
    expect(mockDeactivateAccount).toHaveBeenCalledTimes(1);
    expect(mockQueryClientClear).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/login', {
      replace: true,
      state: { accountDeactivated: true },
    });
  });
});
