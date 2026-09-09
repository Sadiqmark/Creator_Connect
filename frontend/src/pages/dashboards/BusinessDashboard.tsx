import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getBusinessDashboard,
  getMyBusinessProfile,
  BusinessDashboardSummary,
  BusinessPrivateProfile,
} from '../../services/api/businesses';
import { AvatarWithFallback } from '../../components/ui/AvatarWithFallback';
import {
  Building2,
  LogOut,
  Bookmark,
  Send,
  Clock,
  CheckCircle2,
  Search,
  ArrowRight,
  Eye,
  Loader2,
  Briefcase,
} from 'lucide-react';

export const BusinessDashboard: React.FC = () => {
  const { appUser, signOut } = useAuth();

  const [summary, setSummary] = useState<BusinessDashboardSummary | null>(null);
  const [profile, setProfile] = useState<BusinessPrivateProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [dashSummary, profileData] = await Promise.allSettled([
          getBusinessDashboard(),
          getMyBusinessProfile(),
        ]);

        if (dashSummary.status === 'fulfilled') {
          setSummary(dashSummary.value);
        }
        if (profileData.status === 'fulfilled') {
          setProfile(profileData.value);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load business dashboard.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Top Header */}
      <header className="bg-surface border-b border-border sticky top-0 z-30 shadow-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-foreground flex items-center justify-center text-surface shadow-subtle">
              <Building2 className="w-4 h-4" />
            </div>
            <span className="font-display text-xl font-bold text-foreground">Creator Connect</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-surface-muted text-foreground border border-border">
              Brand Workspace
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/creators"
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-accent text-white hover:bg-accent/90 shadow-subtle transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              Find Creators
            </Link>

            <Link
              to="/business/profile"
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-surface-muted transition-colors"
            >
              <Briefcase className="w-3.5 h-3.5" />
              Brand Profile
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
        {/* Brand Banner */}
        <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <AvatarWithFallback
              src={profile?.logoUrl}
              alt={profile?.businessName || appUser?.email || 'Brand'}
              size="xl"
              className="border-2 border-border shadow-subtle rounded-2xl"
            />
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                {profile?.businessName || 'Brand Partner'}
              </h1>
              <p className="text-xs text-foreground-muted mt-1">
                {profile?.category ? `${profile.category} • ` : ''}
                {profile?.city ? `${profile.city}, ${profile.country} • ` : ''}
                {appUser?.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/business/profile"
              className="px-4 py-2 bg-surface hover:bg-surface-muted border border-border rounded-xl text-xs font-bold text-foreground shadow-subtle transition-colors flex items-center gap-1.5"
            >
              Edit Brand Details
            </Link>
            {profile?.id && (
              <Link
                to={`/businesses/${profile.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-foreground text-surface rounded-xl text-xs font-bold hover:bg-foreground/90 shadow-subtle transition-colors flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" /> Public View
              </Link>
            )}
          </div>
        </div>

        {/* Metrics Grid */}
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
                  <span className="text-xs font-medium text-foreground-muted">Saved Creators</span>
                  <Bookmark className="w-4 h-4 text-accent" />
                </div>
                <p className="text-2xl sm:text-3xl font-bold font-display text-foreground mt-2">
                  {summary?.savedCreatorsCount ?? 0}
                </p>
              </div>

              <div className="p-5 bg-surface border border-border rounded-2xl shadow-card">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground-muted">Total Inquiries</span>
                  <Send className="w-4 h-4 text-foreground-muted" />
                </div>
                <p className="text-2xl sm:text-3xl font-bold font-display text-foreground mt-2">
                  {summary?.inquiriesTotal ?? 0}
                </p>
              </div>

              <div className="p-5 bg-surface border border-border rounded-2xl shadow-card">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-warning">Pending Response</span>
                  <Clock className="w-4 h-4 text-warning" />
                </div>
                <p className="text-2xl sm:text-3xl font-bold font-display text-warning mt-2">
                  {summary?.inquiriesPending ?? 0}
                </p>
              </div>

              <div className="p-5 bg-surface border border-border rounded-2xl shadow-card">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-success">Confirmed Deals</span>
                  <CheckCircle2 className="w-4 h-4 text-success" />
                </div>
                <p className="text-2xl sm:text-3xl font-bold font-display text-success mt-2">
                  {summary?.inquiriesAccepted ?? 0}
                </p>
              </div>
            </div>

            {/* Two Column Section: Saved Creators & Inquiries */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Saved Creators Card */}
              <div className="bg-surface border border-border rounded-2xl p-6 shadow-card space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-foreground">Saved Creators</h2>
                  <Link
                    to="/creators"
                    className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
                  >
                    Discover More <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                {summary?.recentSaved && summary.recentSaved.length > 0 ? (
                  <div className="divide-y divide-border">
                    {summary.recentSaved.map((c) => (
                      <div
                        key={c.id}
                        className="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0"
                      >
                        <div className="flex items-center gap-3">
                          <AvatarWithFallback
                            src={c.profilePhotoUrl}
                            alt={c.name}
                            size="md"
                          />
                          <div>
                            <p className="text-sm font-semibold text-foreground">{c.name}</p>
                            <p className="text-xs text-foreground-muted">
                              {c.niche} • {c.location}
                            </p>
                          </div>
                        </div>

                        <Link
                          to={`/creators/${c.id}`}
                          className="text-xs font-semibold px-2.5 py-1 bg-surface-muted hover:bg-border rounded text-foreground transition-colors"
                        >
                          View
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-sm text-foreground-muted">
                    <Bookmark className="w-6 h-6 mx-auto text-foreground-subtle mb-1.5" />
                    <p className="font-semibold text-foreground">No saved creators</p>
                    <p className="text-xs mt-1">
                      Browse creators in the directory and bookmark candidates for future campaigns.
                    </p>
                    <Link
                      to="/creators"
                      className="inline-block mt-3 px-3.5 py-1.5 bg-foreground text-surface rounded-lg text-xs font-semibold"
                    >
                      Browse Directory
                    </Link>
                  </div>
                )}
              </div>

              {/* Sent Inquiries Card */}
              <div className="bg-surface border border-border rounded-2xl p-6 shadow-card space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-foreground">Recent Inquiries Sent</h2>
                  <span className="text-xs text-foreground-muted">Collaboration tracking</span>
                </div>

                {summary?.recentInquiries && summary.recentInquiries.length > 0 ? (
                  <div className="divide-y divide-border">
                    {summary.recentInquiries.map((inq) => (
                      <div
                        key={inq.id}
                        className="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0"
                      >
                        <div className="flex items-center gap-3">
                          <AvatarWithFallback
                            src={inq.creatorPhotoUrl}
                            alt={inq.creatorName || 'Creator'}
                            size="md"
                          />
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {inq.creatorName || 'Creator'}
                            </p>
                            <p className="text-xs text-foreground-muted">
                              {inq.collaborationType} • Sent{' '}
                              {new Date(inq.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
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
                  <div className="py-8 text-center text-sm text-foreground-muted">
                    <Send className="w-6 h-6 mx-auto text-foreground-subtle mb-1.5" />
                    <p className="font-semibold text-foreground">No inquiries sent</p>
                    <p className="text-xs mt-1">
                      Ready to start a partnership? Visit a creator profile and send a proposal.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};
