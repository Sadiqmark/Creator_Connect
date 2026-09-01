import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, LogOut, Building2, Search } from 'lucide-react';

export const BusinessDashboard: React.FC = () => {
  const { appUser, profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-surface border-b border-border sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-serif text-xl font-bold text-foreground">Creator Connect</span>
            <span className="ml-2 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
              Business Workspace
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-foreground-secondary hidden sm:inline">
              {appUser?.email}
            </span>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-border text-foreground-secondary hover:text-foreground hover:bg-background transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 text-accent flex items-center justify-center">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
                Welcome, {profile?.businessName || 'Business Partner'}!
              </h1>
              <p className="text-sm text-foreground-secondary mt-1">
                Authenticated with role: <span className="font-bold text-foreground">BUSINESS</span> | Account: <span className="font-bold text-emerald-600">ACTIVE</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
            <div className="p-5 rounded-xl bg-background border border-border">
              <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
                <Search className="w-4 h-4 text-accent" />
                Discovery Engine
              </div>
              <p className="mt-2 text-2xl font-bold font-serif text-foreground">Ready</p>
              <p className="text-xs text-foreground-secondary mt-1">
                Authenticated discovery and proposals ready for Phase 4.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-background border border-border">
              <div className="text-foreground font-semibold text-sm">
                Inquiry Invariants
              </div>
              <p className="mt-2 text-sm font-medium text-foreground-secondary">
                Protected by PostgreSQL Partial Unique Index & 60-day expiration tracking.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
