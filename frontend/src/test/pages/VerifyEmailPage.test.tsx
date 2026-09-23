import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { VerifyEmailPage } from '../../pages/auth/VerifyEmailPage';

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

describe('VerifyEmailPage Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <VerifyEmailPage />
      </MemoryRouter>
    );

  it('1. renders verification email details and action buttons', () => {
    mockUseAuth.mockReturnValue({
      firebaseUser: { email: 'user@example.com' },
      reloadUser: vi.fn(),
      sendVerificationEmail: vi.fn(),
      signOut: vi.fn().mockResolvedValue(undefined),
    });

    renderComponent();

    expect(screen.getByRole('heading', { level: 2, name: /Verify your email/i })).toBeInTheDocument();
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /I've Verified My Email/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Resend Verification Email/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Log out or use a different account/i })
    ).toBeInTheDocument();
  });

  it('2. clicking "Log out or use a different account" awaits signOut() before navigating to /login', async () => {
    let resolveSignOut!: () => void;
    const signOutPromise = new Promise<void>((resolve) => {
      resolveSignOut = resolve;
    });

    const mockSignOut = vi.fn().mockImplementation(() => signOutPromise);

    mockUseAuth.mockReturnValue({
      firebaseUser: { email: 'user@example.com' },
      reloadUser: vi.fn(),
      sendVerificationEmail: vi.fn(),
      signOut: mockSignOut,
    });

    renderComponent();

    const logoutBtn = screen.getByRole('button', {
      name: /Log out or use a different account/i,
    });
    expect(logoutBtn).toBeInTheDocument();

    fireEvent.click(logoutBtn);

    // 1. signOut() is invoked immediately
    expect(mockSignOut).toHaveBeenCalledTimes(1);

    // 2. navigate has NOT been called yet while signOut() is pending (proving await)
    expect(mockNavigate).not.toHaveBeenCalled();

    // 3. Resolve signOut()
    resolveSignOut();

    // 4. navigate is called with /login and { replace: true } only after signOut resolves
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    });
  });
});
