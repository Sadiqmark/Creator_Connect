import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import * as firebaseAuth from 'firebase/auth';
import { authApi } from '../services/api/auth';
import { UserRole, AccountStatus } from '@creator-connect/shared';
import { auth } from '../config/firebase';

vi.mock('../config/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'test-uid-123',
      email: 'test@example.com',
      emailVerified: false,
      reload: vi.fn().mockResolvedValue(undefined),
      getIdToken: vi.fn().mockResolvedValue('mock-token'),
    },
  },
  default: {},
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  onAuthStateChanged: vi.fn((_auth, callback) => {
    callback(null);
    return vi.fn();
  }),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  sendEmailVerification: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

vi.mock('../services/api/auth', () => ({
  authApi: {
    getMe: vi.fn(),
    provision: vi.fn(),
    deactivate: vi.fn(),
    reactivate: vi.fn(),
  },
}));

describe('AuthContext Complete Lifecycle Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it('1. signUp creates user and explicitly dispatches sendEmailVerification', async () => {
    const mockUser = {
      uid: 'new-creator-uid',
      email: 'new.creator@example.com',
      emailVerified: false,
    };

    vi.mocked(firebaseAuth.createUserWithEmailAndPassword).mockResolvedValue({
      user: mockUser,
    } as any);

    vi.mocked(firebaseAuth.sendEmailVerification).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signUp('new.creator@example.com', 'SecurePass123!');
    });

    expect(firebaseAuth.createUserWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      'new.creator@example.com',
      'SecurePass123!'
    );
    expect(firebaseAuth.sendEmailVerification).toHaveBeenCalledWith(mockUser);
    expect(result.current.status).toBe('UNVERIFIED');
  });

  it('2. provision establishes CREATOR role in PostgreSQL and transitions status to ONBOARDING_REQUIRED', async () => {
    const mockCreatorUser = {
      id: 'c-uuid-1',
      firebaseUid: 'creator-uid-123',
      email: 'creator@example.com',
      role: UserRole.CREATOR,
      status: AccountStatus.ACTIVE,
      createdAt: new Date().toISOString(),
    };

    vi.mocked(authApi.provision).mockResolvedValue({
      user: mockCreatorUser,
      profile: null,
      onboardingCompleted: false,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.provision(UserRole.CREATOR);
    });

    expect(authApi.provision).toHaveBeenCalledWith(UserRole.CREATOR);
    expect(result.current.appUser).toEqual(mockCreatorUser);
    expect(result.current.status).toBe('ONBOARDING_REQUIRED');
  });

  it('3. refreshMe updates appUser and transitions to AUTHENTICATED when profile is completed', async () => {
    const mockUser = {
      id: 'c-uuid-1',
      firebaseUid: 'creator-uid-123',
      email: 'creator@example.com',
      role: UserRole.CREATOR,
      status: AccountStatus.ACTIVE,
      createdAt: new Date().toISOString(),
    };
    const mockProfile = { id: 'cp-uuid-1', name: 'Verified Creator', bio: 'Hello' };

    vi.mocked(authApi.getMe).mockResolvedValue({
      user: mockUser,
      profile: mockProfile,
      onboardingCompleted: true,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    if (auth.currentUser) {
      (auth.currentUser as any).emailVerified = true;
    }

    await act(async () => {
      await result.current.refreshMe();
    });

    expect(authApi.getMe).toHaveBeenCalled();
    expect(result.current.appUser).toEqual(mockUser);
    expect(result.current.profile).toEqual(mockProfile);
    expect(result.current.onboardingCompleted).toBe(true);
    expect(result.current.status).toBe('AUTHENTICATED');
  });

  it('4. signOut clears user and profile state to UNAUTHENTICATED', async () => {
    vi.mocked(firebaseAuth.signOut).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signOut();
    });

    expect(firebaseAuth.signOut).toHaveBeenCalled();
    expect(result.current.firebaseUser).toBeNull();
    expect(result.current.appUser).toBeNull();
    expect(result.current.profile).toBeNull();
    expect(result.current.onboardingCompleted).toBe(false);
    expect(result.current.status).toBe('UNAUTHENTICATED');
  });

  it('5. sendPasswordReset calls Firebase sendPasswordResetEmail', async () => {
    vi.mocked(firebaseAuth.sendPasswordResetEmail).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.sendPasswordReset('forgot@example.com');
    });

    expect(firebaseAuth.sendPasswordResetEmail).toHaveBeenCalledWith(
      expect.anything(),
      'forgot@example.com'
    );
  });

  it('6. reloadUser updates Firebase user and refreshes verification status', async () => {
    if (auth.currentUser) {
      (auth.currentUser as any).emailVerified = true;
    }

    vi.mocked(authApi.getMe).mockResolvedValue({
      user: {
        id: 'c-uuid-1',
        firebaseUid: 'creator-uid-123',
        email: 'creator@example.com',
        role: UserRole.CREATOR,
        status: AccountStatus.ACTIVE,
        createdAt: new Date().toISOString(),
      },
      profile: null,
      onboardingCompleted: false,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    let verified = false;
    await act(async () => {
      verified = await result.current.reloadUser();
    });

    expect(auth.currentUser?.reload).toHaveBeenCalled();
    expect(auth.currentUser?.getIdToken).toHaveBeenCalledWith(true);
    expect(verified).toBe(true);
  });

  it('7. deactivateAccount calls authApi.deactivate() then signs out Firebase and clears local state', async () => {
    const mockUser = {
      id: 'c-uuid-1',
      firebaseUid: 'creator-uid-123',
      email: 'creator@example.com',
      role: UserRole.CREATOR,
      status: AccountStatus.ACTIVE,
      createdAt: new Date().toISOString(),
    };

    vi.mocked(authApi.provision).mockResolvedValue({
      user: mockUser,
      profile: { id: 'cp-1', name: 'Test Creator' },
      onboardingCompleted: true,
    });
    vi.mocked(authApi.deactivate).mockResolvedValue({
      message: 'Account successfully deactivated',
      deactivatedAt: new Date().toISOString(),
      deletionScheduledAt: new Date().toISOString(),
      daysRemaining: 30,
    });
    vi.mocked(firebaseAuth.signOut).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.provision(UserRole.CREATOR);
    });

    expect(result.current.appUser).not.toBeNull();

    await act(async () => {
      await result.current.deactivateAccount();
    });

    expect(authApi.deactivate).toHaveBeenCalledTimes(1);
    expect(firebaseAuth.signOut).toHaveBeenCalledTimes(1);
    expect(result.current.firebaseUser).toBeNull();
    expect(result.current.appUser).toBeNull();
    expect(result.current.profile).toBeNull();
    expect(result.current.onboardingCompleted).toBe(false);
    expect(result.current.status).toBe('UNAUTHENTICATED');
  });

  it('8. failed API deactivation does NOT sign out Firebase or clear authenticated state', async () => {
    const mockUser = {
      id: 'c-uuid-1',
      firebaseUid: 'creator-uid-123',
      email: 'creator@example.com',
      role: UserRole.CREATOR,
      status: AccountStatus.ACTIVE,
      createdAt: new Date().toISOString(),
    };

    vi.mocked(authApi.provision).mockResolvedValue({
      user: mockUser,
      profile: { id: 'cp-1', name: 'Test Creator' },
      onboardingCompleted: true,
    });
    vi.mocked(authApi.deactivate).mockRejectedValue(new Error('Deactivation failed: database error'));
    vi.mocked(firebaseAuth.signOut).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.provision(UserRole.CREATOR);
    });

    expect(result.current.appUser).not.toBeNull();

    await expect(
      act(async () => {
        await result.current.deactivateAccount();
      })
    ).rejects.toThrow('Deactivation failed: database error');

    expect(authApi.deactivate).toHaveBeenCalledTimes(1);
    expect(firebaseAuth.signOut).not.toHaveBeenCalled();
    expect(result.current.appUser).toEqual(mockUser);
    expect(result.current.status).toBe('ONBOARDING_REQUIRED');
  });

  it('9. successful API deactivation with Firebase signOut failure still clears local state (security-sensitive)', async () => {
    const mockUser = {
      id: 'c-uuid-1',
      firebaseUid: 'creator-uid-123',
      email: 'creator@example.com',
      role: UserRole.CREATOR,
      status: AccountStatus.ACTIVE,
      createdAt: new Date().toISOString(),
    };

    vi.mocked(authApi.provision).mockResolvedValue({
      user: mockUser,
      profile: { id: 'cp-1', name: 'Test Creator' },
      onboardingCompleted: true,
    });
    vi.mocked(authApi.deactivate).mockResolvedValue({
      message: 'Account successfully deactivated',
      deactivatedAt: new Date().toISOString(),
      deletionScheduledAt: new Date().toISOString(),
      daysRemaining: 30,
    });
    vi.mocked(firebaseAuth.signOut).mockRejectedValue(new Error('Firebase network error'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.provision(UserRole.CREATOR);
    });

    await act(async () => {
      await result.current.deactivateAccount();
    });

    expect(authApi.deactivate).toHaveBeenCalledTimes(1);
    expect(firebaseAuth.signOut).toHaveBeenCalledTimes(1);
    expect(result.current.firebaseUser).toBeNull();
    expect(result.current.appUser).toBeNull();
    expect(result.current.profile).toBeNull();
    expect(result.current.status).toBe('UNAUTHENTICATED');
  });

  it('10. reactivateAccount calls authApi.reactivate(), refreshes Firebase token, fetches /auth/me, and transitions to AUTHENTICATED', async () => {
    const deactivatedUser = {
      id: 'c-uuid-1',
      email: 'creator@example.com',
      role: UserRole.CREATOR,
      status: AccountStatus.DEACTIVATED,
      createdAt: new Date().toISOString(),
      deactivatedAt: new Date().toISOString(),
      deletionScheduledAt: new Date().toISOString(),
      daysRemaining: 28,
      isReactivatable: true,
      displayName: 'Lifecycle Creator',
    };

    const activeUser = {
      id: 'c-uuid-1',
      firebaseUid: 'test-uid-123',
      email: 'creator@example.com',
      role: UserRole.CREATOR,
      status: AccountStatus.ACTIVE,
      createdAt: new Date().toISOString(),
    };

    vi.mocked(authApi.getMe)
      .mockResolvedValueOnce({
        user: deactivatedUser,
        profile: null,
        onboardingCompleted: false,
      })
      .mockResolvedValueOnce({
        user: activeUser,
        profile: { id: 'cp-1', name: 'Lifecycle Creator' },
        onboardingCompleted: true,
      });

    vi.mocked(authApi.reactivate).mockResolvedValue({
      message: 'Account successfully reactivated.',
      user: {
        id: 'c-uuid-1',
        email: 'creator@example.com',
        role: UserRole.CREATOR,
        status: AccountStatus.ACTIVE,
      },
    });

    if (auth.currentUser) {
      (auth.currentUser as any).emailVerified = true;
    }

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.refreshMe();
    });

    expect(result.current.status).toBe('DEACTIVATED');

    await act(async () => {
      await result.current.reactivateAccount();
    });

    expect(authApi.reactivate).toHaveBeenCalledTimes(1);
    // Instruction 2: verify getIdToken(true) was called to refresh token
    expect(auth.currentUser?.getIdToken).toHaveBeenCalledWith(true);
    expect(result.current.status).toBe('AUTHENTICATED');
    expect(result.current.appUser?.status).toBe(AccountStatus.ACTIVE);
  });

  it('11. reactivateAccount propagates error on expired grace period (410)', async () => {
    const expiredError = new Error('The 30-day reactivation grace period has expired.');
    (expiredError as any).code = 'GRACE_PERIOD_EXPIRED';
    (expiredError as any).status = 410;

    vi.mocked(authApi.reactivate).mockRejectedValue(expiredError);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await expect(
      act(async () => {
        await result.current.reactivateAccount();
      })
    ).rejects.toThrow('The 30-day reactivation grace period has expired.');

    expect(authApi.reactivate).toHaveBeenCalledTimes(1);
  });

  it('12. fetchAppUser detects DEACTIVATED status from getMe and sets status to DEACTIVATED', async () => {
    const deactivatedUser = {
      id: 'c-uuid-1',
      email: 'creator@example.com',
      role: UserRole.CREATOR,
      status: AccountStatus.DEACTIVATED,
      createdAt: new Date().toISOString(),
      deactivatedAt: new Date().toISOString(),
      deletionScheduledAt: new Date().toISOString(),
      daysRemaining: 25,
      isReactivatable: true,
      displayName: 'Deactivated Creator',
    };

    vi.mocked(authApi.getMe).mockResolvedValue({
      user: deactivatedUser,
      profile: null,
      onboardingCompleted: false,
    });

    if (auth.currentUser) {
      (auth.currentUser as any).emailVerified = true;
    }

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.refreshMe();
    });

    expect(result.current.status).toBe('DEACTIVATED');
    expect(result.current.appUser?.status).toBe(AccountStatus.DEACTIVATED);
    expect(result.current.appUser?.daysRemaining).toBe(25);
  });

  it('13. fetchAppUser handles ACCOUNT_DELETED 403 by signing out Firebase and setting error', async () => {
    const deletedError = new Error('This account has been deleted.');
    (deletedError as any).code = 'ACCOUNT_DELETED';

    vi.mocked(authApi.getMe).mockRejectedValue(deletedError);
    vi.mocked(firebaseAuth.signOut).mockResolvedValue(undefined);

    if (auth.currentUser) {
      (auth.currentUser as any).emailVerified = true;
    }

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.refreshMe();
    });

    expect(firebaseAuth.signOut).toHaveBeenCalled();
    expect(result.current.status).toBe('UNAUTHENTICATED');
    expect(result.current.error).toBe('This account has been permanently deleted.');
  });
});
