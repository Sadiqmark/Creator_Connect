import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { AuthProvider } from './context/AuthContext';
import * as firebaseAuth from 'firebase/auth';

// Mock Firebase Client SDK at boundary
vi.mock('./config/firebase', () => ({
  auth: {
    currentUser: null,
  },
  default: {},
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ currentUser: null })),
  onAuthStateChanged: vi.fn((_auth, callback) => {
    callback(null); // Unauthenticated by default
    return vi.fn();
  }),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  sendEmailVerification: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  verifyPasswordResetCode: vi.fn(),
  confirmPasswordReset: vi.fn(),
}));

vi.mock('./services/api/auth', () => ({
  authApi: {
    getMe: vi.fn(),
    provision: vi.fn(),
    deleteAccount: vi.fn(),
  },
}));

const renderApp = (initialRoute = '/login') => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Phase 3B Comprehensive Frontend E2E & Flow Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Unauthenticated Route Guards & Public Pages (Section 8 & 9)', () => {
    it('renders the finalized Login screen on /login', async () => {
      renderApp('/login');
      expect(screen.getByRole('heading', { name: /Welcome back/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
    });

    it('renders the finalized Signup screen on /signup', async () => {
      renderApp('/signup');
      expect(screen.getByRole('heading', { name: /Join Creator Connect/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create Account/i })).toBeInTheDocument();
    });

    it('renders the finalized Forgot Password screen on /forgot-password', async () => {
      renderApp('/forgot-password');
      expect(screen.getByRole('heading', { name: /Reset your password/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Send Reset Link/i })).toBeInTheDocument();
    });

    it('redirects unauthenticated user accessing /creator/dashboard to /login', async () => {
      renderApp('/creator/dashboard');
      expect(screen.getByRole('heading', { name: /Welcome back/i })).toBeInTheDocument();
    });

    it('redirects unauthenticated user accessing /business/dashboard to /login', async () => {
      renderApp('/business/dashboard');
      expect(screen.getByRole('heading', { name: /Welcome back/i })).toBeInTheDocument();
    });

    it('redirects unauthenticated user accessing /select-role to /login', async () => {
      renderApp('/select-role');
      expect(screen.getByRole('heading', { name: /Welcome back/i })).toBeInTheDocument();
    });

    it('renders 404 Not Found screen for unknown URLs', async () => {
      renderApp('/unknown-test-route');
      expect(screen.getByRole('heading', { name: /Page Not Found/i })).toBeInTheDocument();
    });
  });

  describe('2. Signup, Explicit Email Verification & Locked Verification Gate (Section 8 & 13)', () => {
    it('executes signup and explicitly calls sendEmailVerification before routing to /verify-email', async () => {
      const mockNewUser = {
        uid: 'new-user-123',
        email: 'creator.candidate@example.com',
        emailVerified: false,
      };

      vi.mocked(firebaseAuth.createUserWithEmailAndPassword).mockResolvedValue({
        user: mockNewUser,
      } as any);

      vi.mocked(firebaseAuth.sendEmailVerification).mockResolvedValue(undefined);

      renderApp('/signup');

      fireEvent.change(screen.getByLabelText(/Email address/i), {
        target: { value: 'creator.candidate@example.com' },
      });
      fireEvent.change(screen.getByLabelText(/^Password/i), {
        target: { value: 'SecurePass123!' },
      });
      fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
        target: { value: 'SecurePass123!' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

      await waitFor(() => {
        expect(firebaseAuth.createUserWithEmailAndPassword).toHaveBeenCalledWith(
          expect.anything(),
          'creator.candidate@example.com',
          'SecurePass123!'
        );
        expect(firebaseAuth.sendEmailVerification).toHaveBeenCalledWith(mockNewUser);
      });
    });

    it('renders Email Verification screen with refresh status and resend buttons', async () => {
      renderApp('/verify-email');
      expect(screen.getByRole('heading', { name: /Verify your email/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /I've Verified My Email/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Resend Verification Email/i })).toBeInTheDocument();
    });
  });

  describe('3. Login Flow Scenarios (Section 10)', () => {
    it('redirects unverified user to /verify-email upon login', async () => {
      const unverifiedUser = {
        uid: 'unverified-uid',
        email: 'unverified@example.com',
        emailVerified: false,
      };

      vi.mocked(firebaseAuth.signInWithEmailAndPassword).mockResolvedValue({
        user: unverifiedUser,
      } as any);

      renderApp('/login');

      fireEvent.change(screen.getByLabelText(/Email address/i), {
        target: { value: 'unverified@example.com' },
      });
      fireEvent.change(screen.getByLabelText(/Password/i), {
        target: { value: 'Password123!' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Verify your email/i })).toBeInTheDocument();
      });
    });

    it('displays user-safe error message when login fails due to invalid credentials', async () => {
      const authError: any = new Error('Invalid credentials');
      authError.code = 'auth/invalid-credential';

      vi.mocked(firebaseAuth.signInWithEmailAndPassword).mockRejectedValue(authError);

      renderApp('/login');

      fireEvent.change(screen.getByLabelText(/Email address/i), {
        target: { value: 'wrong@example.com' },
      });
      fireEvent.change(screen.getByLabelText(/Password/i), {
        target: { value: 'WrongPass!' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

      await waitFor(() => {
        expect(screen.getByText(/Invalid email or password/i)).toBeInTheDocument();
      });
    });
  });

  describe('4. Password Reset Flows (Section 12)', () => {
    it('submits forgot password request and displays success confirmation banner', async () => {
      vi.mocked(firebaseAuth.sendPasswordResetEmail).mockResolvedValue(undefined);

      renderApp('/forgot-password');

      fireEvent.change(screen.getByLabelText(/Email address/i), {
        target: { value: 'forgot@example.com' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Send Reset Link/i }));

      await waitFor(() => {
        expect(firebaseAuth.sendPasswordResetEmail).toHaveBeenCalledWith(
          expect.anything(),
          'forgot@example.com'
        );
        expect(screen.getByText(/Password reset email sent/i)).toBeInTheDocument();
      });
    });

    it('renders invalid or expired link error on /reset-password when oobCode is invalid', async () => {
      vi.mocked(firebaseAuth.verifyPasswordResetCode).mockRejectedValue(new Error('Expired'));

      renderApp('/reset-password?oobCode=invalid-code');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Invalid or Expired Link/i })).toBeInTheDocument();
      });
    });
  });

  describe('5. Session Management & Recovery Modal (Section 14 & 15)', () => {
    it('renders Session Expired dialog when auth:session-expired event is dispatched', async () => {
      renderApp('/login');

      // Dispatch global session expired event inside act
      act(() => {
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
      });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Session Expired/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Sign In Again/i })).toBeInTheDocument();
      });
    });
  });
});
