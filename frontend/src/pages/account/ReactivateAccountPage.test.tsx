import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ReactivateAccountPage } from './ReactivateAccountPage';
import { UserRole, AccountStatus } from '@creator-connect/shared';

const mockUseAuth = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('ReactivateAccountPage Component Tests', () => {
  const mockReactivateAccount = vi.fn();
  const mockSignOut = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <ReactivateAccountPage />
      </MemoryRouter>
    );

  it('1. renders deactivated account details, days remaining, and scheduled deletion date', () => {
    mockUseAuth.mockReturnValue({
      appUser: {
        id: 'user-deactivated-1',
        email: 'creator@test.com',
        role: UserRole.CREATOR,
        status: AccountStatus.DEACTIVATED,
        createdAt: '2026-01-01T00:00:00.000Z',
        deactivatedAt: '2026-09-01T00:00:00.000Z',
        deletionScheduledAt: '2026-10-01T00:00:00.000Z',
        daysRemaining: 18,
        isReactivatable: true,
      },
      reactivateAccount: mockReactivateAccount,
      signOut: mockSignOut,
    });

    renderComponent();

    expect(screen.getByRole('heading', { level: 1, name: /Account Deactivated/i })).toBeInTheDocument();
    expect(screen.getByText(/18 days left/i)).toBeInTheDocument();
    expect(screen.getByText('creator@test.com')).toBeInTheDocument();
    expect(screen.getByText('Creator')).toBeInTheDocument();
    expect(screen.getByText(/October 1, 2026/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reactivate Account/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Sign Out/i })).toBeEnabled();
  });

  it('2. clicking Reactivate Account triggers reactivateAccount and navigates to creator dashboard on success', async () => {
    mockReactivateAccount.mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({
      appUser: {
        id: 'creator-deactivated-1',
        email: 'creator@test.com',
        role: UserRole.CREATOR,
        status: AccountStatus.DEACTIVATED,
        daysRemaining: 20,
        isReactivatable: true,
      },
      reactivateAccount: mockReactivateAccount,
      signOut: mockSignOut,
    });

    renderComponent();

    const reactivateBtn = screen.getByRole('button', { name: /Reactivate Account/i });
    fireEvent.click(reactivateBtn);

    await waitFor(() => {
      expect(mockReactivateAccount).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/creator/dashboard', {
        replace: true,
        state: { accountReactivated: true },
      });
    });
  });

  it('3. clicking Reactivate Account navigates to business dashboard for BUSINESS role', async () => {
    mockReactivateAccount.mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({
      appUser: {
        id: 'business-deactivated-1',
        email: 'biz@test.com',
        role: UserRole.BUSINESS,
        status: AccountStatus.DEACTIVATED,
        daysRemaining: 15,
        isReactivatable: true,
      },
      reactivateAccount: mockReactivateAccount,
      signOut: mockSignOut,
    });

    renderComponent();

    const reactivateBtn = screen.getByRole('button', { name: /Reactivate Account/i });
    fireEvent.click(reactivateBtn);

    await waitFor(() => {
      expect(mockReactivateAccount).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/business/dashboard', {
        replace: true,
        state: { accountReactivated: true },
      });
    });
  });

  it('4. clicking Sign Out calls signOut and navigates to /login', async () => {
    mockSignOut.mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({
      appUser: {
        id: 'creator-deactivated-1',
        email: 'creator@test.com',
        role: UserRole.CREATOR,
        status: AccountStatus.DEACTIVATED,
        daysRemaining: 20,
        isReactivatable: true,
      },
      reactivateAccount: mockReactivateAccount,
      signOut: mockSignOut,
    });

    renderComponent();

    const signOutBtn = screen.getByRole('button', { name: /Sign Out/i });
    fireEvent.click(signOutBtn);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    });
  });

  it('5. displays error message if reactivation fails (e.g. grace period expired 410)', async () => {
    const expiredError = new Error('The 30-day reactivation grace period has expired.');
    (expiredError as any).code = 'GRACE_PERIOD_EXPIRED';
    (expiredError as any).status = 410;

    mockReactivateAccount.mockRejectedValue(expiredError);
    mockUseAuth.mockReturnValue({
      appUser: {
        id: 'creator-deactivated-1',
        email: 'creator@test.com',
        role: UserRole.CREATOR,
        status: AccountStatus.DEACTIVATED,
        daysRemaining: 5,
        isReactivatable: true,
      },
      reactivateAccount: mockReactivateAccount,
      signOut: mockSignOut,
    });

    renderComponent();

    const reactivateBtn = screen.getByRole('button', { name: /Reactivate Account/i });
    fireEvent.click(reactivateBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/grace period has expired/i);
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('6. disables reactivate button when isReactivatable is false or daysRemaining is 0', () => {
    mockUseAuth.mockReturnValue({
      appUser: {
        id: 'creator-deactivated-1',
        email: 'creator@test.com',
        role: UserRole.CREATOR,
        status: AccountStatus.DEACTIVATED,
        daysRemaining: 0,
        isReactivatable: false,
      },
      reactivateAccount: mockReactivateAccount,
      signOut: mockSignOut,
    });

    renderComponent();

    const reactivateBtn = screen.getByRole('button', { name: /Reactivate Account/i });
    expect(reactivateBtn).toBeDisabled();
  });
});
