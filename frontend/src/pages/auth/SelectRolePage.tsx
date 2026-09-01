import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '@creator-connect/shared';
import { Camera, Building2, ArrowRight, AlertCircle, Check } from 'lucide-react';

export const SelectRolePage: React.FC = () => {
  const navigate = useNavigate();
  const { provision } = useAuth();

  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    if (!selectedRole) return;
    setError(null);
    setLoading(true);

    try {
      // Provisions user in PostgreSQL; role becomes immediately immutable
      await provision(selectedRole);
      navigate(selectedRole === UserRole.CREATOR ? '/onboarding/creator' : '/onboarding/business');
    } catch (err: any) {
      setError(err.message || 'Failed to select role. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <h2 className="text-center font-serif text-3xl sm:text-4xl font-bold text-foreground">
          How will you use Creator Connect?
        </h2>
        <p className="mt-3 text-center text-sm text-foreground-secondary">
          Choose your account type. This determines your workspace tools and is set permanently.
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-surface py-8 px-6 shadow-sm border border-border sm:rounded-2xl sm:px-10 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-800">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Creator Option */}
            <button
              type="button"
              onClick={() => setSelectedRole(UserRole.CREATOR)}
              className={`p-6 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                selectedRole === UserRole.CREATOR
                  ? 'border-accent bg-accent/5 ring-2 ring-accent/20'
                  : 'border-border hover:border-border-strong hover:bg-background'
              }`}
            >
              {selectedRole === UserRole.CREATOR && (
                <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center">
                  <Check className="w-3.5 h-3.5" />
                </div>
              )}
              <div>
                <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-4">
                  <Camera className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-lg font-bold text-foreground">Creator</h3>
                <p className="mt-2 text-xs text-foreground-secondary leading-relaxed">
                  Showcase your portfolio, receive direct briefs from brands, and manage partnerships.
                </p>
              </div>
            </button>

            {/* Business Option */}
            <button
              type="button"
              onClick={() => setSelectedRole(UserRole.BUSINESS)}
              className={`p-6 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                selectedRole === UserRole.BUSINESS
                  ? 'border-accent bg-accent/5 ring-2 ring-accent/20'
                  : 'border-border hover:border-border-strong hover:bg-background'
              }`}
            >
              {selectedRole === UserRole.BUSINESS && (
                <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center">
                  <Check className="w-3.5 h-3.5" />
                </div>
              )}
              <div>
                <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-4">
                  <Building2 className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-lg font-bold text-foreground">Business</h3>
                <p className="mt-2 text-xs text-foreground-secondary leading-relaxed">
                  Discover verified creators, send structured collaboration proposals, and track campaigns.
                </p>
              </div>
            </button>
          </div>

          <button
            type="button"
            disabled={!selectedRole || loading}
            onClick={handleContinue}
            className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl shadow-sm text-sm font-bold text-white bg-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-40 transition-all cursor-pointer mt-4"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                Continue to Profile Setup
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
