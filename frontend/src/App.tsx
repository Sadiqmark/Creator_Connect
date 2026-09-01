import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { UserRole } from '@creator-connect/shared';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage';
import { SelectRolePage } from './pages/auth/SelectRolePage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { SessionExpiredModal } from './pages/auth/SessionExpiredModal';
import { CreatorDashboard } from './pages/dashboards/CreatorDashboard';
import { BusinessDashboard } from './pages/dashboards/BusinessDashboard';
import { CreatorOnboardingPage } from './pages/onboarding/CreatorOnboardingPage';
import { BusinessOnboardingPage } from './pages/onboarding/BusinessOnboardingPage';
import { ForbiddenPage } from './pages/ForbiddenPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

const RootRedirect: React.FC = () => {
  const { status, appUser } = useAuth();

  if (status === 'INITIALIZING') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (status === 'UNAUTHENTICATED') {
    return <Navigate to="/login" replace />;
  }

  if (status === 'UNVERIFIED') {
    return <Navigate to="/verify-email" replace />;
  }

  if (!appUser) {
    return <Navigate to="/select-role" replace />;
  }

  return (
    <Navigate
      to={appUser.role === UserRole.CREATOR ? '/creator/dashboard' : '/business/dashboard'}
      replace
    />
  );
};

export const App: React.FC = () => {
  return (
    <>
      <Routes>
        {/* Public Auth Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected Role Provisioning */}
        <Route
          path="/select-role"
          element={
            <ProtectedRoute>
              <SelectRolePage />
            </ProtectedRoute>
          }
        />

        {/* Protected Onboarding Routes */}
        <Route
          path="/onboarding/creator"
          element={
            <ProtectedRoute allowedRole={UserRole.CREATOR}>
              <CreatorOnboardingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/onboarding/business"
          element={
            <ProtectedRoute allowedRole={UserRole.BUSINESS}>
              <BusinessOnboardingPage />
            </ProtectedRoute>
          }
        />

        {/* Protected Dashboard Workspaces */}
        <Route
          path="/creator/dashboard"
          element={
            <ProtectedRoute allowedRole={UserRole.CREATOR}>
              <CreatorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/business/dashboard"
          element={
            <ProtectedRoute allowedRole={UserRole.BUSINESS}>
              <BusinessDashboard />
            </ProtectedRoute>
          }
        />

        {/* Error & Gating Pages */}
        <Route path="/forbidden" element={<ForbiddenPage />} />
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      {/* Global Session Expired Dialog */}
      <SessionExpiredModal />
    </>
  );
};
export default App;
