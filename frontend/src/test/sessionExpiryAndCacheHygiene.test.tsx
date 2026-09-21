import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { queryClient } from '../lib/queryClient';
import { apiClient } from '../services/api/client';
import { auth } from '../config/firebase';
import { useAuth, AuthProvider } from '../context/AuthContext';
import React from 'react';

// Mock Firebase auth
vi.mock('../config/firebase', () => ({
  auth: {
    currentUser: null,
  },
}));

// Mock Firebase auth methods
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((_auth, callback) => {
    callback(null);
    return () => {};
  }),
  signOut: vi.fn().mockResolvedValue(undefined),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  sendEmailVerification: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

vi.mock('../services/api/auth', () => ({
  authApi: {
    getMe: vi.fn(),
    provision: vi.fn(),
    deactivate: vi.fn().mockResolvedValue({}),
    reactivate: vi.fn(),
  },
}));

describe('Session Expiry and Query Cache Hygiene', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. signOut clears the QueryClient cache', async () => {
    const clearSpy = vi.spyOn(queryClient, 'clear');

    // Seed query cache with dummy private data
    queryClient.setQueryData(['creator-inquiries'], [{ id: 'inq-1', brand: 'Acme' }]);
    expect(queryClient.getQueryData(['creator-inquiries'])).toBeDefined();

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signOut();
    });

    expect(clearSpy).toHaveBeenCalled();
    expect(queryClient.getQueryData(['creator-inquiries'])).toBeUndefined();
  });

  it('2. auth:session-expired event clears the QueryClient cache and updates status', async () => {
    const clearSpy = vi.spyOn(queryClient, 'clear');

    queryClient.setQueryData(['private-user-data'], { email: 'secret@example.com' });
    expect(queryClient.getQueryData(['private-user-data'])).toBeDefined();

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      window.dispatchEvent(new CustomEvent('auth:session-expired'));
    });

    expect(result.current.status).toBe('SESSION_EXPIRED');
    expect(clearSpy).toHaveBeenCalled();
    expect(queryClient.getQueryData(['private-user-data'])).toBeUndefined();
  });

  it('3. clearSessionExpired clears the QueryClient cache and resets status', async () => {
    const clearSpy = vi.spyOn(queryClient, 'clear');

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.clearSessionExpired();
    });

    expect(result.current.status).toBe('UNAUTHENTICATED');
    expect(clearSpy).toHaveBeenCalled();
  });
});

describe('Axios 401 Hardened Interceptor', () => {
  let eventDispatched = false;
  const sessionListener = () => {
    eventDispatched = true;
  };

  beforeEach(() => {
    eventDispatched = false;
    window.addEventListener('auth:session-expired', sessionListener);
  });

  afterEach(() => {
    window.removeEventListener('auth:session-expired', sessionListener);
    vi.restoreAllMocks();
  });

  it('4. unrecoverable 401 (e.g. INVALID_TOKEN) dispatches auth:session-expired', async () => {
    // Interceptor test by invoking the response error handler directly
    const responseErrorHandler = (apiClient.interceptors.response as any).handlers[0].rejected;

    const mock401Error = {
      config: { headers: {} },
      response: {
        status: 401,
        data: {
          error: {
            code: 'INVALID_TOKEN',
            message: 'Authentication token is invalid.',
          },
        },
      },
    };

    await expect(responseErrorHandler(mock401Error)).rejects.toThrow();
    expect(eventDispatched).toBe(true);
  });

  it('5. failed token refresh dispatches auth:session-expired and rejects error', async () => {
    const responseErrorHandler = (apiClient.interceptors.response as any).handlers[0].rejected;

    (auth as any).currentUser = {
      getIdToken: vi.fn().mockRejectedValue(new Error('Firebase refresh rejected')),
    };

    const mockTokenExpiredError = {
      config: { headers: {}, _retry: false },
      response: {
        status: 401,
        data: {
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Token has expired.',
          },
        },
      },
    };

    await expect(responseErrorHandler(mockTokenExpiredError)).rejects.toThrow();
    expect(eventDispatched).toBe(true);
  });

  it('6. retried request that still returns 401 dispatches auth:session-expired without infinite retry loop', async () => {
    const responseErrorHandler = (apiClient.interceptors.response as any).handlers[0].rejected;

    const mockRetried401Error = {
      config: { headers: {}, _retry: true }, // already retried
      response: {
        status: 401,
        data: {
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Token still invalid after retry.',
          },
        },
      },
    };

    await expect(responseErrorHandler(mockRetried401Error)).rejects.toThrow();
    // Must dispatch auth:session-expired and NOT attempt another retry
    expect(eventDispatched).toBe(true);
  });

  it('7. successful token refresh updates Authorization header and retries request', async () => {
    const responseErrorHandler = (apiClient.interceptors.response as any).handlers[0].rejected;

    (auth as any).currentUser = {
      getIdToken: vi.fn().mockResolvedValue('fresh-jwt-token-xyz'),
    };

    const originalConfig: any = {
      headers: {},
      _retry: false,
      adapter: async (config: any) => ({
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      }),
    };
    const mockTokenExpiredError = {
      config: originalConfig,
      response: {
        status: 401,
        data: {
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Token has expired.',
          },
        },
      },
    };

    const result = await responseErrorHandler(mockTokenExpiredError);

    expect(originalConfig._retry).toBe(true);
    expect(originalConfig.headers.Authorization).toBe('Bearer fresh-jwt-token-xyz');
    expect(result.data).toEqual({ success: true });
    expect(eventDispatched).toBe(false);
  });
});
