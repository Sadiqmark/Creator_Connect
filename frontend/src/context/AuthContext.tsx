import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendEmailVerification,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { authApi, AppUser } from '../services/api/auth';
import { UserRole } from '@creator-connect/shared';

export type AuthStatus =
  | 'INITIALIZING'
  | 'UNAUTHENTICATED'
  | 'UNVERIFIED'
  | 'ONBOARDING_REQUIRED'
  | 'AUTHENTICATED'
  | 'SESSION_EXPIRED';

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  appUser: AppUser | null;
  profile: any | null;
  onboardingCompleted: boolean;
  status: AuthStatus;
  error: string | null;
  signUp: (email: string, password: string) => Promise<FirebaseUser>;
  signIn: (email: string, password: string) => Promise<FirebaseUser>;
  signOut: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  reloadUser: () => Promise<boolean>;
  sendPasswordReset: (email: string) => Promise<void>;
  provision: (role: UserRole) => Promise<AppUser>;
  refreshMe: () => Promise<void>;
  clearSessionExpired: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean>(false);
  const [status, setStatus] = useState<AuthStatus>('INITIALIZING');
  const [error, setError] = useState<string | null>(null);

  const fetchAppUser = useCallback(async (fbUser: FirebaseUser) => {
    try {
      if (!fbUser.emailVerified) {
        setStatus('UNVERIFIED');
        setAppUser(null);
        setProfile(null);
        return;
      }

      const data = await authApi.getMe();
      setAppUser(data.user);
      setProfile(data.profile);
      setOnboardingCompleted(data.onboardingCompleted);

      if (!data.onboardingCompleted) {
        setStatus('ONBOARDING_REQUIRED');
      } else {
        setStatus('AUTHENTICATED');
      }
    } catch (err: any) {
      if (err.code === 'USER_NOT_PROVISIONED') {
        setStatus('ONBOARDING_REQUIRED');
        setAppUser(null);
        setProfile(null);
      } else if (err.code === 'EMAIL_NOT_VERIFIED') {
        setStatus('UNVERIFIED');
      } else if (err.code === 'ACCOUNT_DELETED') {
        await firebaseSignOut(auth);
        setStatus('UNAUTHENTICATED');
        setError('This account has been deleted.');
      } else {
        setStatus('UNAUTHENTICATED');
      }
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        await fetchAppUser(fbUser);
      } else {
        setAppUser(null);
        setProfile(null);
        setOnboardingCompleted(false);
        setStatus('UNAUTHENTICATED');
      }
    });

    const handleSessionExpired = () => {
      setStatus('SESSION_EXPIRED');
    };

    window.addEventListener('auth:session-expired', handleSessionExpired);

    return () => {
      unsubscribe();
      window.removeEventListener('auth:session-expired', handleSessionExpired);
    };
  }, [fetchAppUser]);

  const signUp = async (email: string, password: string): Promise<FirebaseUser> => {
    setError(null);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const newUser = userCredential.user;
    
    // Explicit email verification dispatch immediately after signup
    await sendEmailVerification(newUser);
    
    setFirebaseUser(newUser);
    setStatus('UNVERIFIED');
    return newUser;
  };

  const signIn = async (email: string, password: string): Promise<FirebaseUser> => {
    setError(null);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const loggedUser = userCredential.user;
    setFirebaseUser(loggedUser);
    await fetchAppUser(loggedUser);
    return loggedUser;
  };

  const signOut = async (): Promise<void> => {
    await firebaseSignOut(auth);
    setFirebaseUser(null);
    setAppUser(null);
    setProfile(null);
    setOnboardingCompleted(false);
    setStatus('UNAUTHENTICATED');
  };

  const sendVerification = async (): Promise<void> => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  const reloadUser = async (): Promise<boolean> => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      const updated = auth.currentUser;
      setFirebaseUser({ ...updated } as FirebaseUser);
      if (updated.emailVerified) {
        await fetchAppUser(updated);
        return true;
      }
    }
    return false;
  };

  const sendPasswordReset = async (email: string): Promise<void> => {
    await sendPasswordResetEmail(auth, email);
  };

  const provision = async (role: UserRole): Promise<AppUser> => {
    const data = await authApi.provision(role);
    setAppUser(data.user);
    setProfile(data.profile);
    setOnboardingCompleted(data.onboardingCompleted);
    setStatus('ONBOARDING_REQUIRED');
    return data.user;
  };

  const refreshMe = async (): Promise<void> => {
    if (auth.currentUser) {
      await fetchAppUser(auth.currentUser);
    }
  };

  const clearSessionExpired = () => {
    setStatus('UNAUTHENTICATED');
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        appUser,
        profile,
        onboardingCompleted,
        status,
        error,
        signUp,
        signIn,
        signOut,
        sendVerificationEmail: sendVerification,
        reloadUser,
        sendPasswordReset,
        provision,
        refreshMe,
        clearSessionExpired,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
