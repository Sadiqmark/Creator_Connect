import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '@creator-connect/shared';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole?: UserRole;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRole }) => {
  const { status, appUser, onboardingCompleted } = useAuth();
  const location = useLocation();

  if (status === 'INITIALIZING') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-medium text-foreground-secondary">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (status === 'UNAUTHENTICATED') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (status === 'UNVERIFIED') {
    return <Navigate to="/verify-email" replace />;
  }

  if (status === 'SESSION_EXPIRED') {
    return <Navigate to="/login" state={{ sessionExpired: true, from: location }} replace />;
  }

  // Deactivated accounts can only access /account/reactivate
  if (status === 'DEACTIVATED' || appUser?.status === 'DEACTIVATED') {
    if (location.pathname === '/account/reactivate') {
      return <>{children}</>;
    }
    return <Navigate to="/account/reactivate" replace />;
  }

  // Active / authenticated accounts cannot access /account/reactivate
  if (location.pathname === '/account/reactivate') {
    const dashboardRoute =
      appUser?.role === UserRole.CREATOR ? '/creator/dashboard' : '/business/dashboard';
    return <Navigate to={dashboardRoute} replace />;
  }

  // Handle unprovisioned users needing role selection
  if (!appUser) {
    if (location.pathname === '/select-role') {
      return <>{children}</>;
    }
    return <Navigate to="/select-role" replace />;
  }

  // If provisioned user visits /select-role, route to onboarding or dashboard
  if (location.pathname === '/select-role') {
    if (!onboardingCompleted) {
      const onboardingRoute =
        appUser.role === UserRole.CREATOR ? '/onboarding/creator' : '/onboarding/business';
      return <Navigate to={onboardingRoute} replace />;
    }
    const dashboardRoute =
      appUser.role === UserRole.CREATOR ? '/creator/dashboard' : '/business/dashboard';
    return <Navigate to={dashboardRoute} replace />;
  }

  if (!onboardingCompleted && !location.pathname.startsWith('/onboarding')) {
    const onboardingRoute =
      appUser.role === UserRole.CREATOR ? '/onboarding/creator' : '/onboarding/business';
    return <Navigate to={onboardingRoute} replace />;
  }

  // Handle role-based route gating
  if (allowedRole && appUser.role !== allowedRole) {
    const defaultRoute =
      appUser.role === UserRole.CREATOR ? '/creator/dashboard' : '/business/dashboard';
    return <Navigate to={defaultRoute} replace />;
  }

  return <>{children}</>;
};
