import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '@creator-connect/shared';
import {
  AlertTriangle,
  RotateCcw,
  LogOut,
  Calendar,
  Clock,
  Loader2,
  ShieldAlert,
} from 'lucide-react';

export const ReactivateAccountPage: React.FC = () => {
  const { appUser, reactivateAccount, signOut } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const daysRemaining = appUser?.daysRemaining ?? 0;
  const deletionScheduledAtFormatted = appUser?.deletionScheduledAt
    ? new Date(appUser.deletionScheduledAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Unknown date';

  const isReactivatable = appUser?.isReactivatable !== false && daysRemaining > 0;

  const handleReactivate = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      await reactivateAccount();
      // On success, redirect to dashboard based on role with navigation state
      const dashboardRoute =
        appUser?.role === UserRole.CREATOR ? '/creator/dashboard' : '/business/dashboard';
      navigate(dashboardRoute, { replace: true, state: { accountReactivated: true } });
    } catch (err: any) {
      if (err.code === 'GRACE_PERIOD_EXPIRED' || err.status === 410) {
        setErrorMessage('The 30-day reactivation grace period has expired. This account is scheduled for permanent deletion.');
      } else if (err.code === 'ACCOUNT_DELETED' || err.status === 403) {
        setErrorMessage('This account has already been permanently deleted.');
      } else {
        setErrorMessage(err.message || 'Failed to reactivate account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 mb-4 border border-amber-500/20 shadow-subtle">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          Account Deactivated
        </h1>
        <p className="mt-2 text-sm text-foreground-muted">
          Your account is currently deactivated and hidden from public view.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-surface border border-border sm:rounded-2xl p-6 sm:p-8 shadow-card space-y-6">
          {/* Grace Period Status Card */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-3 text-foreground">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> 30-Day Grace Period
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
                {daysRemaining} day{daysRemaining === 1 ? '' : 's'} left
              </span>
            </div>

            <p className="text-xs sm:text-sm text-foreground-muted leading-relaxed">
              You may reactivate your account at any time within this 30-day window to restore full access, your profile, and ongoing activities.
            </p>

            <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between text-xs text-foreground-muted">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Scheduled Permanent Deletion:
              </span>
              <span className="font-semibold text-foreground">
                {deletionScheduledAtFormatted}
              </span>
            </div>
          </div>

          {/* Account Details */}
          <div className="space-y-2 text-xs text-foreground-muted">
            <div className="flex justify-between py-1.5 border-b border-border">
              <span>Account Email</span>
              <span className="font-medium text-foreground">{appUser?.email || '—'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span>Account Role</span>
              <span className="font-medium text-foreground">
                {appUser?.role === UserRole.CREATOR ? 'Creator' : 'Brand Partner (Business)'}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span>Account Status</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">DEACTIVATED</span>
            </div>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-danger/10 border border-danger/20 flex items-start gap-2.5 text-xs text-danger"
            >
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={handleReactivate}
              disabled={loading || !isReactivatable}
              className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold text-white bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-subtle cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Reactivating Account...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  Reactivate Account
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold text-foreground hover:bg-surface-muted border border-border transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <LogOut className="w-4 h-4 text-foreground-muted" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
