import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '@creator-connect/shared';
import { DeactivateAccountModal } from '../../components/account/DeactivateAccountModal';
import {
  ArrowLeft,
  Shield,
  User,
  Mail,
  Calendar,
  ExternalLink,
  AlertTriangle,
  UserX,
  CheckCircle2,
} from 'lucide-react';

export const AccountSettingsPage: React.FC = () => {
  const { appUser } = useAuth();
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);

  const isCreator = appUser?.role === UserRole.CREATOR;
  const dashboardPath = isCreator ? '/creator/dashboard' : '/business/dashboard';
  const profilePath = isCreator ? '/creator/profile' : '/business/profile';

  const memberSinceFormatted = appUser?.createdAt
    ? new Date(appUser.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'N/A';

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Top bar back link */}
        <div className="flex items-center justify-between">
          <Link
            to={dashboardPath}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
        </div>

        {/* Page Title */}
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            Account Settings
          </h1>
          <p className="text-xs sm:text-sm text-foreground-muted mt-1">
            Manage your account credentials, security status, and deactivation preferences.
          </p>
        </div>

        {/* Account Overview (Read-Only) */}
        <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-card space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h2 className="text-base font-bold text-foreground">Account Overview</h2>
              <p className="text-xs text-foreground-muted mt-0.5">
                Authentication identity and platform status.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-accent/10 text-accent border border-accent/20">
              <Shield className="w-3.5 h-3.5" />
              Verified Account
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Email Address */}
            <div className="p-4 rounded-xl bg-background border border-border space-y-1">
              <div className="flex items-center gap-2 text-xs font-medium text-foreground-muted">
                <Mail className="w-3.5 h-3.5" />
                Email Address
              </div>
              <p className="text-sm font-semibold text-foreground break-all">
                {appUser?.email || '—'}
              </p>
            </div>

            {/* Account Role */}
            <div className="p-4 rounded-xl bg-background border border-border space-y-1">
              <div className="flex items-center gap-2 text-xs font-medium text-foreground-muted">
                <User className="w-3.5 h-3.5" />
                Account Role
              </div>
              <p className="text-sm font-semibold text-foreground">
                {isCreator ? 'Creator' : 'Brand Partner (Business)'}
              </p>
            </div>

            {/* Account Status */}
            <div className="p-4 rounded-xl bg-background border border-border space-y-1">
              <div className="flex items-center gap-2 text-xs font-medium text-foreground-muted">
                <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                Account Status
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-success/10 text-success border border-success/20">
                  {appUser?.status || 'ACTIVE'}
                </span>
              </div>
            </div>

            {/* Member Since */}
            <div className="p-4 rounded-xl bg-background border border-border space-y-1">
              <div className="flex items-center gap-2 text-xs font-medium text-foreground-muted">
                <Calendar className="w-3.5 h-3.5" />
                Member Since
              </div>
              <p className="text-sm font-semibold text-foreground">
                {memberSinceFormatted}
              </p>
            </div>
          </div>

          {/* Profile Management Link Card */}
          <div className="pt-2 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xs font-bold text-foreground">Public Profile & Presentation</h3>
              <p className="text-xs text-foreground-muted mt-0.5">
                Bio, portfolio media, niche specialties, and collaboration contact details.
              </p>
            </div>
            <Link
              to={profilePath}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-surface hover:bg-surface-muted border border-border text-foreground shadow-subtle transition-colors shrink-0"
            >
              Edit Profile
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-surface border border-danger/25 rounded-2xl p-6 sm:p-8 shadow-card space-y-4">
          <div className="flex items-center gap-2.5 text-danger">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <h2 className="text-base font-bold">Danger Zone</h2>
          </div>

          <p className="text-xs sm:text-sm text-foreground-muted leading-relaxed">
            Deactivate your account and begin a <strong>30-day grace period</strong>. Your profile will be immediately hidden
            and active inquiries will be paused. You can log back in and reactivate anytime within 30 days. After 30 days
            without reactivation, your account will be permanently deleted.
          </p>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setIsDeactivateModalOpen(true)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-danger hover:bg-danger/90 shadow-subtle transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <UserX className="w-4 h-4" />
              Deactivate Account
            </button>
          </div>
        </div>
      </div>

      {/* Deactivate Account Modal */}
      <DeactivateAccountModal
        isOpen={isDeactivateModalOpen}
        onClose={() => setIsDeactivateModalOpen(false)}
      />
    </div>
  );
};
