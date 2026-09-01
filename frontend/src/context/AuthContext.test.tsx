import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import * as firebaseAuth from 'firebase/auth';
import { authApi } from '../services/api/auth';
import { UserRole, AccountStatus } from '@creator-connect/shared';

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
    deleteAccount: vi.fn(),
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
    expect(result.current.appUser?.role).toBe(UserRole.CREATOR);
    expect(result.current.status).toBe('ONBOARDING_REQUIRED');
  });

  it('3. provision establishes BUSINESS role in PostgreSQL and transitions status to ONBOARDING_REQUIRED', async () => {
    const mockBusinessUser = {
      id: 'b-uuid-1',
      firebaseUid: 'biz-uid-123',
      email: 'business@example.com',
      role: UserRole.BUSINESS,
      status: AccountStatus.ACTIVE,
      createdAt: new Date().toISOString(),
    };

    vi.mocked(authApi.provision).mockResolvedValue({
      user: mockBusinessUser,
      profile: null,
      onboardingCompleted: false,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.provision(UserRole.BUSINESS);
    });

    expect(authApi.provision).toHaveBeenCalledWith(UserRole.BUSINESS);
    expect(result.current.appUser?.role).toBe(UserRole.BUSINESS);
    expect(result.current.status).toBe('ONBOARDING_REQUIRED');
  });

  it('4. signOut clears both Firebase and Application user states', async () => {
    vi.mocked(firebaseAuth.signOut).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signOut();
    });

    expect(firebaseAuth.signOut).toHaveBeenCalled();
    expect(result.current.firebaseUser).toBeNull();
    expect(result.current.appUser).toBeNull();
    expect(result.current.status).toBe('UNAUTHENTICATED');
  });

  it('5. sendPasswordReset invokes Firebase sendPasswordResetEmail', async () => {
    vi.mocked(firebaseAuth.sendPasswordResetEmail).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.sendPasswordReset('user@example.com');
    });

    expect(firebaseAuth.sendPasswordResetEmail).toHaveBeenCalledWith(
      expect.anything(),
      'user@example.com'
    );
  });
});
