import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { Lock, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const oobCode = searchParams.get('oobCode');

  const [validCode, setValidCode] = useState<boolean | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!oobCode) {
      setValidCode(false);
      return;
    }

    verifyPasswordResetCode(auth, oobCode)
      .then(() => setValidCode(true))
      .catch(() => setValidCode(false));
  }, [oobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oobCode) return;

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (validCode === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (validCode === false) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-surface py-8 px-6 shadow-sm border border-border sm:rounded-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="font-serif text-2xl font-bold text-foreground">Invalid or Expired Link</h2>
            <p className="text-sm text-foreground-secondary leading-relaxed">
              This password reset link has expired or has already been used. Please request a new link.
            </p>
            <Link
              to="/forgot-password"
              className="inline-flex justify-center items-center gap-2 py-3 px-5 rounded-xl shadow-sm text-sm font-bold text-white bg-accent hover:bg-accent-hover transition-all w-full mt-2"
            >
              Request New Reset Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4 text-accent">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-center font-serif text-3xl font-bold text-foreground">
          Choose a new password
        </h2>
        <p className="mt-2 text-center text-sm text-foreground-secondary">
          Enter your new password below to regain access to your account.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface py-8 px-6 shadow-sm border border-border sm:rounded-2xl sm:px-10 space-y-6">
          {success ? (
            <div className="space-y-6 text-center">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col items-center gap-2 text-emerald-800">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                <p className="text-sm font-semibold">Password updated successfully!</p>
                <p className="text-xs text-emerald-700">
                  You can now log in with your new credentials.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl shadow-sm text-sm font-bold text-white bg-accent hover:bg-accent-hover transition-all"
              >
                Sign In Now
              </button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              {error && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-800">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}

              <div>
                <label htmlFor="newPassword" className="block text-sm font-semibold text-foreground">
                  New Password
                </label>
                <div className="mt-1">
                  <input
                    id="newPassword"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent text-sm transition-all"
                    placeholder="At least 8 characters"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-foreground">
                  Confirm New Password
                </label>
                <div className="mt-1">
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent text-sm transition-all"
                    placeholder="Re-enter new password"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl shadow-sm text-sm font-bold text-white bg-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 transition-all cursor-pointer"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      Save New Password
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
