import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '@creator-connect/shared';
import { Sparkles, ArrowRight, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, appUser, onboardingCompleted } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const fbUser = await signIn(email, password);

      if (!fbUser.emailVerified) {
        navigate('/verify-email');
        return;
      }

      const fromPath = (location.state as any)?.from?.pathname;
      if (fromPath) {
        navigate(fromPath);
        return;
      }

      if (!appUser) {
        navigate('/select-role');
      } else if (!onboardingCompleted) {
        navigate(appUser.role === UserRole.CREATOR ? '/onboarding/creator' : '/onboarding/business');
      } else {
        navigate(appUser.role === UserRole.CREATOR ? '/creator/dashboard' : '/business/dashboard');
      }
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setErrorMessage('Invalid email or password. Please try again.');
      } else if (err.code === 'auth/too-many-requests') {
        setErrorMessage('Too many failed attempts. Please wait a few minutes before retrying.');
      } else {
        setErrorMessage(err.message || 'An unexpected error occurred during login.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center shadow-md">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-serif text-2xl font-bold tracking-tight text-foreground">
            Creator Connect
          </span>
        </div>
        <h2 className="text-center font-serif text-3xl font-bold text-foreground">
          Welcome back
        </h2>
        <p className="mt-2 text-center text-sm text-foreground-secondary">
          Sign in to access your partnerships, inquiries, and creator portfolio.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface py-8 px-6 shadow-sm border border-border sm:rounded-2xl sm:px-10">
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-800">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{errorMessage}</p>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-foreground">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent text-sm transition-all"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-semibold text-foreground">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-accent hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent text-sm transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl shadow-sm text-sm font-bold text-white bg-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center border-t border-border pt-6">
            <p className="text-sm text-foreground-secondary">
              Don't have an account yet?{' '}
              <Link to="/signup" className="font-semibold text-accent hover:underline">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
