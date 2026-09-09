import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { listCreators, CreatorPublicProfile } from '../../services/api/creators';
import { AvatarWithFallback } from '../../components/ui/AvatarWithFallback';
import {
  Search,
  MapPin,
  Sparkles,
  ArrowRight,
  Loader2,
  Filter,
} from 'lucide-react';

const POPULAR_NICHES = [
  'All',
  'Fashion & Style',
  'Beauty & Skincare',
  'Fitness & Health',
  'Food & Culinary',
  'Travel & Adventure',
  'Technology & Gaming',
  'Lifestyle',
];

export const CreatorDiscoveryPage: React.FC = () => {
  const { appUser } = useAuth();

  const [creators, setCreators] = useState<CreatorPublicProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNiche, setSelectedNiche] = useState('All');

  useEffect(() => {
    const fetchCreators = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await listCreators({
          search: searchTerm.trim() || undefined,
          niche: selectedNiche !== 'All' ? selectedNiche : undefined,
        });
        setCreators(data);
      } catch (err: any) {
        setError(err.message || 'Failed to discover creators.');
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchCreators, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm, selectedNiche]);

  return (
    <div className="min-h-screen bg-background py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top bar with Auth Link */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-display text-xl font-bold text-foreground tracking-tight">
              Creator Connect
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold">
            {appUser ? (
              <Link
                to={appUser.role === 'CREATOR' ? '/creator/dashboard' : '/business/dashboard'}
                className="px-3 py-1.5 bg-foreground text-surface rounded-lg hover:bg-foreground/90 transition-colors"
              >
                Go to Workspace
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-foreground hover:text-accent transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="px-3 py-1.5 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors shadow-subtle"
                >
                  Join Marketplace
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Hero Banner */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-accent/10 text-accent">
            <Sparkles className="w-3.5 h-3.5" /> Discovery Marketplace
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
            Connect with Trusted Creators
          </h1>
          <p className="text-sm text-foreground-muted">
            Explore authentic creative talent for your brand's next high-impact partnership.
          </p>
        </div>

        {/* Filters & Search */}
        <div className="bg-surface p-4 sm:p-5 rounded-2xl border border-border shadow-card space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-foreground-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search creators by name, location, or keyword..."
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Niche Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1">
            <span className="text-xs font-semibold text-foreground-muted mr-1.5 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Niche:
            </span>
            {POPULAR_NICHES.map((niche) => (
              <button
                type="button"
                key={niche}
                onClick={() => setSelectedNiche(niche)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedNiche === niche
                    ? 'bg-foreground text-surface'
                    : 'bg-surface-muted text-foreground-muted hover:bg-border'
                }`}
              >
                {niche}
              </button>
            ))}
          </div>
        </div>

        {/* Content Section */}
        {isLoading ? (
          <div className="py-20 flex justify-center items-center">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
          </div>
        ) : error ? (
          <div className="p-8 text-center bg-danger/10 border border-danger/20 rounded-2xl text-sm text-danger">
            {error}
          </div>
        ) : creators.length === 0 ? (
          <div className="py-16 text-center bg-surface rounded-2xl border border-border p-8">
            <p className="font-display text-xl font-bold text-foreground mb-1">
              No Creators Found
            </p>
            <p className="text-sm text-foreground-muted max-w-sm mx-auto mb-4">
              We couldn't find discoverable creators matching your current search or niche filter.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedNiche('All');
              }}
              className="px-4 py-2 text-xs font-semibold bg-surface-muted hover:bg-border rounded-lg border border-border transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {creators.map((c) => (
              <div
                key={c.id}
                className="bg-surface rounded-2xl border border-border p-5 shadow-card hover:shadow-dropdown transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center gap-3.5 mb-3">
                    <AvatarWithFallback
                      src={c.profilePhotoUrl}
                      alt={c.name}
                      size="lg"
                    />
                    <div>
                      <h3 className="font-bold text-foreground text-base group-hover:text-accent transition-colors">
                        {c.name}
                      </h3>
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-accent/10 text-accent">
                        {c.niche}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-foreground-muted mb-3">
                    <MapPin className="w-3.5 h-3.5 text-foreground-muted shrink-0" />
                    <span>{c.location}</span>
                  </div>

                  <p className="text-xs text-foreground-muted line-clamp-3 mb-4 leading-relaxed">
                    {c.bio}
                  </p>

                  {/* Specialties Pills */}
                  {c.specialties && c.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {c.specialties.slice(0, 3).map((spec) => (
                        <span
                          key={spec}
                          className="px-2 py-0.5 bg-surface-muted text-foreground-muted rounded text-[10px] font-medium"
                        >
                          {spec}
                        </span>
                      ))}
                      {c.specialties.length > 3 && (
                        <span className="px-1.5 py-0.5 text-foreground-subtle text-[10px]">
                          +{c.specialties.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-border">
                  <Link
                    to={`/creators/${c.id}`}
                    className="w-full py-2 bg-surface hover:bg-surface-muted text-foreground border border-border rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    View Profile <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
