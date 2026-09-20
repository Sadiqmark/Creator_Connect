import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { UserRole, AccountStatus } from '@creator-connect/shared';

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('ProtectedRoute Navigation & Role Provisioning Guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithRouter = (initialRoute: string) => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/verify-email" element={<div>Verify Email Page</div>} />
          <Route
            path="/select-role"
            element={
              <ProtectedRoute>
                <div>Select Role Page</div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/creator/dashboard"
            element={
              <ProtectedRoute allowedRole={UserRole.CREATOR}>
                <div>Creator Dashboard</div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/business/dashboard"
            element={
              <ProtectedRoute allowedRole={UserRole.BUSINESS}>
                <div>Business Dashboard</div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding/creator"
            element={
              <ProtectedRoute allowedRole={UserRole.CREATOR}>
                <div>Creator Onboarding</div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding/business"
            element={
              <ProtectedRoute allowedRole={UserRole.BUSINESS}>
                <div>Business Onboarding</div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <div>Account Settings Page</div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/account/reactivate"
            element={
              <ProtectedRoute>
                <div>Reactivate Account Page</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );
  };

  it('1. allows unprovisioned verified user (appUser === null) to render /select-role', () => {
    vi.mocked(useAuth).mockReturnValue({
      status: 'ONBOARDING_REQUIRED',
      firebaseUser: { uid: 'u1', emailVerified: true } as any,
      appUser: null,
      onboardingCompleted: false,
    } as any);

    renderWithRouter('/select-role');
    expect(screen.getByText('Select Role Page')).toBeInTheDocument();
  });

  it('2. redirects unprovisioned user from another protected route (/creator/dashboard) to /select-role', () => {
    vi.mocked(useAuth).mockReturnValue({
      status: 'ONBOARDING_REQUIRED',
      firebaseUser: { uid: 'u1', emailVerified: true } as any,
      appUser: null,
      onboardingCompleted: false,
    } as any);

    renderWithRouter('/creator/dashboard');
    expect(screen.getByText('Select Role Page')).toBeInTheDocument();
  });

  it('3. redirects provisioned CREATOR with incomplete onboarding from /select-role to /onboarding/creator', () => {
    vi.mocked(useAuth).mockReturnValue({
      status: 'ONBOARDING_REQUIRED',
      firebaseUser: { uid: 'u1', emailVerified: true } as any,
      appUser: {
        id: 'u-1',
        firebaseUid: 'u1',
        email: 'creator@example.com',
        role: UserRole.CREATOR,
        status: AccountStatus.ACTIVE,
        createdAt: new Date().toISOString(),
      },
      onboardingCompleted: false,
    } as any);

    renderWithRouter('/select-role');
    expect(screen.getByText('Creator Onboarding')).toBeInTheDocument();
  });

  it('4. redirects provisioned BUSINESS with incomplete onboarding from /select-role to /onboarding/business', () => {
    vi.mocked(useAuth).mockReturnValue({
      status: 'ONBOARDING_REQUIRED',
      firebaseUser: { uid: 'u2', emailVerified: true } as any,
      appUser: {
        id: 'u-2',
        firebaseUid: 'u2',
        email: 'biz@example.com',
        role: UserRole.BUSINESS,
        status: AccountStatus.ACTIVE,
        createdAt: new Date().toISOString(),
      },
      onboardingCompleted: false,
    } as any);

    renderWithRouter('/select-role');
    expect(screen.getByText('Business Onboarding')).toBeInTheDocument();
  });

  it('5. redirects provisioned CREATOR with completed onboarding from /select-role to /creator/dashboard', () => {
    vi.mocked(useAuth).mockReturnValue({
      status: 'AUTHENTICATED',
      firebaseUser: { uid: 'u1', emailVerified: true } as any,
      appUser: {
        id: 'u-1',
        firebaseUid: 'u1',
        email: 'creator@example.com',
        role: UserRole.CREATOR,
        status: AccountStatus.ACTIVE,
        createdAt: new Date().toISOString(),
      },
      onboardingCompleted: true,
    } as any);

    renderWithRouter('/select-role');
    expect(screen.getByText('Creator Dashboard')).toBeInTheDocument();
  });

  it('6. redirects provisioned BUSINESS with completed onboarding from /select-role to /business/dashboard', () => {
    vi.mocked(useAuth).mockReturnValue({
      status: 'AUTHENTICATED',
      firebaseUser: { uid: 'u2', emailVerified: true } as any,
      appUser: {
        id: 'u-2',
        firebaseUid: 'u2',
        email: 'biz@example.com',
        role: UserRole.BUSINESS,
        status: AccountStatus.ACTIVE,
        createdAt: new Date().toISOString(),
      },
      onboardingCompleted: true,
    } as any);

    renderWithRouter('/select-role');
    expect(screen.getByText('Business Dashboard')).toBeInTheDocument();
  });

  it('7. redirects DEACTIVATED user from /creator/dashboard to /account/reactivate', () => {
    vi.mocked(useAuth).mockReturnValue({
      status: 'DEACTIVATED',
      firebaseUser: { uid: 'u1', emailVerified: true } as any,
      appUser: {
        id: 'u-1',
        email: 'creator@example.com',
        role: UserRole.CREATOR,
        status: AccountStatus.DEACTIVATED,
        createdAt: new Date().toISOString(),
        daysRemaining: 30,
      },
      onboardingCompleted: false,
    } as any);

    renderWithRouter('/creator/dashboard');
    expect(screen.getByText('Reactivate Account Page')).toBeInTheDocument();
  });

  it('8. redirects DEACTIVATED user from /settings to /account/reactivate', () => {
    vi.mocked(useAuth).mockReturnValue({
      status: 'DEACTIVATED',
      firebaseUser: { uid: 'u1', emailVerified: true } as any,
      appUser: {
        id: 'u-1',
        email: 'creator@example.com',
        role: UserRole.CREATOR,
        status: AccountStatus.DEACTIVATED,
        createdAt: new Date().toISOString(),
        daysRemaining: 30,
      },
      onboardingCompleted: false,
    } as any);

    renderWithRouter('/settings');
    expect(screen.getByText('Reactivate Account Page')).toBeInTheDocument();
  });

  it('9. redirects DEACTIVATED user from /onboarding/creator to /account/reactivate', () => {
    vi.mocked(useAuth).mockReturnValue({
      status: 'DEACTIVATED',
      firebaseUser: { uid: 'u1', emailVerified: true } as any,
      appUser: {
        id: 'u-1',
        email: 'creator@example.com',
        role: UserRole.CREATOR,
        status: AccountStatus.DEACTIVATED,
        createdAt: new Date().toISOString(),
        daysRemaining: 30,
      },
      onboardingCompleted: false,
    } as any);

    renderWithRouter('/onboarding/creator');
    expect(screen.getByText('Reactivate Account Page')).toBeInTheDocument();
  });

  it('10. allows DEACTIVATED user to render /account/reactivate', () => {
    vi.mocked(useAuth).mockReturnValue({
      status: 'DEACTIVATED',
      firebaseUser: { uid: 'u1', emailVerified: true } as any,
      appUser: {
        id: 'u-1',
        email: 'creator@example.com',
        role: UserRole.CREATOR,
        status: AccountStatus.DEACTIVATED,
        createdAt: new Date().toISOString(),
        daysRemaining: 30,
      },
      onboardingCompleted: false,
    } as any);

    renderWithRouter('/account/reactivate');
    expect(screen.getByText('Reactivate Account Page')).toBeInTheDocument();
  });

  it('11. redirects AUTHENTICATED user from /account/reactivate to role dashboard', () => {
    vi.mocked(useAuth).mockReturnValue({
      status: 'AUTHENTICATED',
      firebaseUser: { uid: 'u1', emailVerified: true } as any,
      appUser: {
        id: 'u-1',
        firebaseUid: 'u1',
        email: 'creator@example.com',
        role: UserRole.CREATOR,
        status: AccountStatus.ACTIVE,
        createdAt: new Date().toISOString(),
      },
      onboardingCompleted: true,
    } as any);

    renderWithRouter('/account/reactivate');
    expect(screen.getByText('Creator Dashboard')).toBeInTheDocument();
  });
});
