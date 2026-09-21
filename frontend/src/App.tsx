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
import { CreatorProfilePage } from './pages/creator/CreatorProfilePage';
import { CreatorInquiriesPage } from './pages/creator/CreatorInquiriesPage';
import { CreatorInquiryDetailPage } from './pages/creator/CreatorInquiryDetailPage';
import { BusinessProfilePage } from './pages/business/BusinessProfilePage';
import { PublicCreatorProfilePage } from './pages/public/PublicCreatorProfilePage';
import { CreatorDiscoveryPage } from './pages/public/CreatorDiscoveryPage';
import { BusinessProfileViewPage } from './pages/creator/BusinessProfileViewPage';
import { SavedCreatorsPage } from './pages/business/SavedCreatorsPage';
import { BusinessInquiriesPage } from './pages/business/BusinessInquiriesPage';
import { BusinessInquiryDetailPage } from './pages/business/BusinessInquiryDetailPage';
import { AccountSettingsPage } from './pages/account/AccountSettingsPage';
import { ReactivateAccountPage } from './pages/account/ReactivateAccountPage';
import { ForbiddenPage } from './pages/ForbiddenPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ToastProvider } from './components/ui/Toast';
import { OfflineBanner } from './components/ui/OfflineBanner';

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
    return <Navigate to="/creators" replace />;
  }

  if (status === 'UNVERIFIED') {
    return <Navigate to="/verify-email" replace />;
  }

  if (status === 'DEACTIVATED' || appUser?.status === 'DEACTIVATED') {
    return <Navigate to="/account/reactivate" replace />;
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
    <ToastProvider>
      <OfflineBanner />
      <Routes>
        {/* Public Auth Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Public Discovery Routes */}
        <Route path="/creators" element={<CreatorDiscoveryPage />} />
        <Route path="/creators/:creatorId" element={<PublicCreatorProfilePage />} />

        {/* Role Selection & Onboarding */}
        <Route
          path="/select-role"
          element={
            <ProtectedRoute>
              <SelectRolePage />
            </ProtectedRoute>
          }
        />
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

        {/* Creator Protected Workspace */}
        <Route
          path="/creator/dashboard"
          element={
            <ProtectedRoute allowedRole={UserRole.CREATOR}>
              <CreatorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/creator/profile"
          element={
            <ProtectedRoute allowedRole={UserRole.CREATOR}>
              <CreatorProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/creator/inquiries"
          element={
            <ProtectedRoute allowedRole={UserRole.CREATOR}>
              <CreatorInquiriesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/creator/inquiries/:inquiryId"
          element={
            <ProtectedRoute allowedRole={UserRole.CREATOR}>
              <CreatorInquiryDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/creator/business-profile/:businessId"
          element={
            <ProtectedRoute allowedRole={UserRole.CREATOR}>
              <BusinessProfileViewPage />
            </ProtectedRoute>
          }
        />

        {/* Business Protected Workspace */}
        <Route
          path="/business/dashboard"
          element={
            <ProtectedRoute allowedRole={UserRole.BUSINESS}>
              <BusinessDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/business/profile"
          element={
            <ProtectedRoute allowedRole={UserRole.BUSINESS}>
              <BusinessProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/business/saved-creators"
          element={
            <ProtectedRoute allowedRole={UserRole.BUSINESS}>
              <SavedCreatorsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/business/inquiries"
          element={
            <ProtectedRoute allowedRole={UserRole.BUSINESS}>
              <BusinessInquiriesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/business/inquiries/:inquiryId"
          element={
            <ProtectedRoute allowedRole={UserRole.BUSINESS}>
              <BusinessInquiryDetailPage />
            </ProtectedRoute>
          }
        />

        {/* Protected Account Settings (both roles supported) */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <AccountSettingsPage />
            </ProtectedRoute>
          }
        />

        {/* Account Reactivation (Deactivated accounts only) */}
        <Route
          path="/account/reactivate"
          element={
            <ProtectedRoute>
              <ReactivateAccountPage />
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
    </ToastProvider>
  );
};
export default App;
