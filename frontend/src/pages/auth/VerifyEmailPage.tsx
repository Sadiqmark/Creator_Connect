import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Mail, CheckCircle2, RefreshCw, Send, AlertCircle } from 'lucide-react';

export const VerifyEmailPage: React.FC = () => {
  const navigate = useNavigate();
  const { firebaseUser, reloadUser, sendVerificationEmail, signOut } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleRefresh = async () => {
    setError(null);
    setRefreshing(true);
    try {
      const isVerified = await reloadUser();
      if (isVerified) {
        navigate('/select-role');
      } else {
        setError('Your email is not yet verified. Please click the link in the email we sent you.');
      }
    } catch {
      setError('Failed to refresh verification status. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError(null);
    setResending(true);
    try {
      await sendVerificationEmail();
      setResendSuccess(true);
      setCooldown(60);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification email. Please try again later.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4 text-accent">
          <Mail className="w-7 h-7" />
        </div>
        <h2 className="text-center font-serif text-3xl font-bold text-foreground">
          Verify your email
        </h2>
        <p className="mt-2 text-center text-sm text-foreground-secondary">
          We sent a verification link to{' '}
          <span className="font-semibold text-foreground">{firebaseUser?.email || 'your email'}</span>.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface py-8 px-6 shadow-sm border border-border sm:rounded-2xl sm:px-10 space-y-6">
          {resendSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <p className="text-sm font-medium">A new verification link has been sent to your email!</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-900">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="text-sm text-foreground-secondary leading-relaxed bg-background p-4 rounded-xl border border-border">
            Please check your inbox and click the verification link. Once verified, click below to proceed with role selection and onboarding.
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl shadow-sm text-sm font-bold text-white bg-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 transition-all cursor-pointer"
            >
              {refreshing ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  I've Verified My Email
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={resending || cooldown > 0}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-background focus:outline-none disabled:opacity-50 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4 text-foreground-secondary" />
              {cooldown > 0 ? `Resend email in ${cooldown}s` : 'Resend Verification Email'}
            </button>
          </div>

          <div className="text-center pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => signOut()}
              className="text-xs font-semibold text-foreground-secondary hover:text-foreground hover:underline cursor-pointer"
            >
              Log out or use a different account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
