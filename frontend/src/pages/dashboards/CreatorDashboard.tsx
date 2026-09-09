import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getCreatorDashboard,
  getMyCreatorProfile,
  CreatorDashboardSummary,
  CreatorPrivateProfile,
} from '../../services/api/creators';
import { AvatarWithFallback } from '../../components/ui/AvatarWithFallback';
import {
  Sparkles,
  LogOut,
  Inbox,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  Eye,
  Loader2,
} from 'lucide-react';

export const CreatorDashboard: React.FC = () => {
  const { appUser, signOut } = useAuth();

  const [summary, setSummary] = useState<CreatorDashboardSummary | null>(null);
  const [profile, setProfile] = useState<CreatorPrivateProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [dashSummary, profileData] = await Promise.allSettled([
          getCreatorDashboard(),
          getMyCreatorProfile(),
        ]);

        if (dashSummary.status === 'fulfilled') {
          setSummary(dashSummary.value);
        }
        if (profileData.status === 'fulfilled') {
          setProfile(profileData.value);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load creator dashboard.');
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface border-b border-border sticky top-0 z-30 shadow-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center text-white shadow-subtle">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-display text-xl font-bold text-foreground">Creator Connect</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
              Creator Workspace
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/creators"
              className="text-xs font-semibold text-foreground-muted hover:text-foreground hidden sm:inline transition-colors"
            >
              Explore Creators
            </Link>

            <Link
              to="/creator/profile"
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-surface-muted transition-colors"
            >
              <User className="w-3.5 h-3.5" />
              My Profile
            </Link>

            <button
              onClick={() => signOut()}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-border text-foreground-muted hover:text-foreground hover:bg-surface-muted transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Welcome & Profile Quickview */}
        <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <AvatarWithFallback
              src={profile?.profilePhotoUrl}
              alt={profile?.name || appUser?.email || 'Creator'}
              size="xl"
              className="border-2 border-border shadow-subtle"
            />
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                Welcome back, {profile?.name || 'Creator'}!
              </h1>
              <p className="text-xs text-foreground-muted mt-1">
                {profile?.niche ? `${profile.niche} • ` : ''}
                {profile?.location || 'Profile in setup'} • {appUser?.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/creator/profile"
              className="px-4 py-2 bg-surface hover:bg-surface-muted border border-border rounded-xl text-xs font-bold text-foreground shadow-subtle transition-colors flex items-center gap-1.5"
            >
              Edit Profile
            </Link>
            {profile?.id && (
              <Link
                to={`/creators/${profile.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-foreground text-surface rounded-xl text-xs font-bold hover:bg-foreground/90 shadow-subtle transition-colors flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" /> Public View
              </Link>
            )}
          </div>
        </div>

        {/* Discoverability Banner (Strictly 2 states per Phase 4A locked decision #1) */}
        {summary && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
              summary.isDiscoverable
                ? 'bg-success/10 border-success/30 text-success'
                : 'bg-warning/10 border-warning/30 text-warning'
            }`}
          >
            <div className="flex items-center gap-3">
              {summary.isDiscoverable ? (
                <CheckCircle2 className="w-5 h-5 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0" />
              )}
              <div>
                <p className="font-bold text-sm">
                  {summary.isDiscoverable
                    ? 'Profile Complete — Discoverable'
                    : 'Profile Incomplete — Not Discoverable'}
                </p>
                <p className="text-xs opacity-90">
                  {summary.isDiscoverable
                    ? 'Brands can discover your profile when searching for creators in your niche.'
                    : `Missing required fields: ${summary.missingFields.join(', ')}. Complete them to unlock brand discovery.`}
                </p>
              </div>
            </div>

            {!summary.isDiscoverable && (
              <Link
                to="/creator/profile"
                className="px-3 py-1.5 bg-warning text-white rounded-lg text-xs font-semibold whitespace-nowrap shadow-subtle hover:bg-warning/90 transition-colors shrink-0"
              >
                Complete Profile
              </Link>
            )}
          </div>
        )}

        {/* Metrics Cards */}
        {isLoading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
          </div>
        ) : error ? (
          <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl text-sm text-danger">
            {error}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 bg-surface border border-border rounded-2xl shadow-card">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground-muted">Total Inquiries</span>
                  <Inbox className="w-4 h-4 text-foreground-muted" />
                </div>
                <p className="text-2xl sm:text-3xl font-bold font-display text-foreground mt-2">
                  {summary?.inquiriesTotal ?? 0}
                </p>
              </div>

              <div className="p-5 bg-surface border border-border rounded-2xl shadow-card">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-warning">Pending Review</span>
                  <Clock className="w-4 h-4 text-warning" />
                </div>
                <p className="text-2xl sm:text-3xl font-bold font-display text-warning mt-2">
                  {summary?.inquiriesPending ?? 0}
                </p>
              </div>

              <div className="p-5 bg-surface border border-border rounded-2xl shadow-card">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-success">Active Deals</span>
                  <CheckCircle2 className="w-4 h-4 text-success" />
                </div>
                <p className="text-2xl sm:text-3xl font-bold font-display text-success mt-2">
                  {summary?.inquiriesAccepted ?? 0}
                </p>
              </div>

              <div className="p-5 bg-surface border border-border rounded-2xl shadow-card">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground-subtle">Archived / Past</span>
                  <XCircle className="w-4 h-4 text-foreground-subtle" />
                </div>
                <p className="text-2xl sm:text-3xl font-bold font-display text-foreground-muted mt-2">
                  {summary?.inquiriesRejected ?? 0}
                </p>
              </div>
            </div>

            {/* Recent Inquiries List */}
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-card space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">Recent Collaboration Inquiries</h2>
                <span className="text-xs text-foreground-muted">Latest brand proposals</span>
              </div>

              {summary?.recentInquiries && summary.recentInquiries.length > 0 ? (
                <div className="divide-y divide-border">
                  {summary.recentInquiries.map((inq) => (
                    <div
                      key={inq.id}
                      className="py-3.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3">
                        <AvatarWithFallback
                          src={inq.businessLogoUrl}
                          alt={inq.businessName || 'Brand'}
                          size="md"
                        />
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {inq.businessName || 'Brand Partner'}
                          </p>
                          <p className="text-xs text-foreground-muted">
                            {inq.collaborationType} • Received on{' '}
                            {new Date(inq.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                          inq.status === 'PENDING'
                            ? 'bg-warning/10 text-warning border border-warning/20'
                            : inq.status === 'ACCEPTED'
                            ? 'bg-success/10 text-success border border-success/20'
                            : 'bg-surface-muted text-foreground-muted'
                        }`}
                      >
                        {inq.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center text-sm text-foreground-muted">
                  <Inbox className="w-8 h-8 mx-auto text-foreground-subtle mb-2" />
                  <p className="font-semibold text-foreground">No inquiries yet</p>
                  <p className="text-xs mt-1 max-w-sm mx-auto">
                    Ensure your profile is discoverable and active so brands can send collaboration
                    proposals.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};
