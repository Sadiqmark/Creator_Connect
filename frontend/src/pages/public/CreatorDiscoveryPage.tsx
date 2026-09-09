import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '@creator-connect/shared';
import { listCreators, CreatorPublicProfile } from '../../services/api/creators';
import {
  getSavedCreatorIds,
  saveCreator,
  unsaveCreator,
} from '../../services/api/savedCreators';
import { AvatarWithFallback } from '../../components/ui/AvatarWithFallback';
import {
  Search,
  MapPin,
  Sparkles,
  ArrowRight,
  Filter,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  X,
} from 'lucide-react';

const APPROVED_NICHES = [
  'All',
  'Fashion',
  'Food & Beverage',
  'Travel',
  'Beauty & Skincare',
  'Fitness & Wellness',
  'Technology',
  'Lifestyle',
  'Business & Finance',
  'Education',
  'Gaming',
  'Music',
  'Art & Design',
  'Health & Nutrition',
  'Parenting & Family',
  'Sports',
  'Photography',
  'Comedy & Entertainment',
  'Home & Interior',
  'Sustainability',
  'Other',
];

export const CreatorDiscoveryPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { appUser } = useAuth();
  const isBusiness = appUser?.role === UserRole.BUSINESS;
  const isCreator = appUser?.role === UserRole.CREATOR;

  // Search & Filter state
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedNiche, setSelectedNiche] = useState('All');
  const [cityInput, setCityInput] = useState('');
  const [debouncedCity, setDebouncedCity] = useState('');
  const [countryInput, setCountryInput] = useState('');
  const [debouncedCountry, setDebouncedCountry] = useState('');
  const [page, setPage] = useState(1);
  const limit = 24;

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Debounce city input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCity(cityInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [cityInput]);

  // Debounce country input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCountry(countryInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [countryInput]);

  // Handle niche change
  const handleNicheChange = (niche: string) => {
    setSelectedNiche(niche);
    setPage(1);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setSelectedNiche('All');
    setCityInput('');
    setDebouncedCity('');
    setCountryInput('');
    setDebouncedCountry('');
    setPage(1);
  };

  const hasActiveFilters =
    Boolean(debouncedSearch) ||
    selectedNiche !== 'All' ||
    Boolean(debouncedCity) ||
    Boolean(debouncedCountry);

  // TanStack Query for discoverable creators
  const {
    data: discoveryData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: [
      'creators',
      {
        q: debouncedSearch || undefined,
        niche: selectedNiche !== 'All' ? selectedNiche : undefined,
        city: debouncedCity || undefined,
        country: debouncedCountry || undefined,
        page,
        limit,
      },
    ],
    queryFn: () =>
      listCreators({
        q: debouncedSearch || undefined,
        niche: selectedNiche !== 'All' ? selectedNiche : undefined,
        city: debouncedCity || undefined,
        country: debouncedCountry || undefined,
        page,
        limit,
      }),
    placeholderData: (previousData) => previousData,
  });

  // TanStack Query for saved creator IDs (business only)
  const { data: savedCreatorIds = [] } = useQuery({
    queryKey: ['saved-creator-ids'],
    queryFn: getSavedCreatorIds,
    enabled: isBusiness,
  });

  // Save / Unsave Mutation with Optimistic Rollback
  const saveMutation = useMutation({
    mutationFn: async ({
      creatorId,
      currentlySaved,
    }: {
      creatorId: string;
      currentlySaved: boolean;
    }) => {
      if (currentlySaved) {
        return unsaveCreator(creatorId);
      } else {
        return saveCreator(creatorId);
      }
    },
    onMutate: async ({ creatorId, currentlySaved }) => {
      await queryClient.cancelQueries({ queryKey: ['saved-creator-ids'] });
      const previousIds = queryClient.getQueryData<string[]>(['saved-creator-ids']) || [];

      // Optimistic update
      queryClient.setQueryData<string[]>(['saved-creator-ids'], (old = []) => {
        if (currentlySaved) {
          return old.filter((id) => id !== creatorId);
        } else {
          return [...old, creatorId];
        }
      });

      return { previousIds };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousIds) {
        queryClient.setQueryData(['saved-creator-ids'], context.previousIds);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-creator-ids'] });
      queryClient.invalidateQueries({ queryKey: ['saved-creators'] });
    },
  });

  const handleSaveToggle = (creator: CreatorPublicProfile, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Guest redirect to login
    if (!appUser) {
      navigate('/login', { state: { from: '/creators' } });
      return;
    }

    // Business toggles save/unsave
    if (isBusiness) {
      const isSaved = savedCreatorIds.includes(creator.id);
      saveMutation.mutate({ creatorId: creator.id, currentlySaved: isSaved });
    }
  };

  const creators = Array.isArray(discoveryData)
    ? discoveryData
    : discoveryData?.creators || [];
  const pagination = Array.isArray(discoveryData) ? undefined : discoveryData?.pagination;

  return (
    <div className="min-h-screen bg-background py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Header Bar */}
        <header className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <span className="font-display text-xl font-bold text-foreground tracking-tight">
              Creator Connect
            </span>
          </div>
          <nav className="flex items-center gap-3 text-xs font-semibold" aria-label="Main Navigation">
            {appUser ? (
              <>
                {isBusiness && (
                  <Link
                    to="/business/saved-creators"
                    className="px-3 py-1.5 text-foreground hover:text-accent flex items-center gap-1.5 transition-colors"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    Saved Creators
                  </Link>
                )}
                <Link
                  to={appUser.role === UserRole.CREATOR ? '/creator/dashboard' : '/business/dashboard'}
                  className="px-3 py-1.5 bg-foreground text-surface rounded-lg hover:bg-foreground/90 transition-colors"
                >
                  Go to Workspace
                </Link>
              </>
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
          </nav>
        </header>

        {/* Hero Section */}
        <section className="text-center max-w-2xl mx-auto space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-accent/10 text-accent">
            <Sparkles className="w-3.5 h-3.5" /> Discovery Marketplace
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
            Connect with Trusted Creators
          </h1>
          <p className="text-sm text-foreground-muted">
            Find people worth collaborating with for your brand's next high-impact partnership.
          </p>
        </section>

        {/* Filters & Search Control Bar */}
        <section className="bg-surface p-4 sm:p-6 rounded-2xl border border-border shadow-card space-y-4" aria-label="Search and Filters">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-foreground-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search creators by name, location, or keyword..."
              aria-label="Search creators"
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground"
                aria-label="Clear search text"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Location Filters (City & Country) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label htmlFor="city-filter" className="block text-xs font-semibold text-foreground-muted mb-1">
                City
              </label>
              <input
                id="city-filter"
                type="text"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                placeholder="e.g. Milan, Los Angeles, Mumbai..."
                className="w-full px-3.5 py-2 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label htmlFor="country-filter" className="block text-xs font-semibold text-foreground-muted mb-1">
                Country
              </label>
              <input
                id="country-filter"
                type="text"
                value={countryInput}
                onChange={(e) => setCountryInput(e.target.value)}
                placeholder="e.g. Italy, USA, India..."
                className="w-full px-3.5 py-2 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Niche Pills */}
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-foreground-muted flex items-center gap-1">
                <Filter className="w-3 h-3" /> Niche
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="text-xs text-accent hover:underline font-medium"
                >
                  Clear all filters
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
              {APPROVED_NICHES.map((niche) => (
                <button
                  type="button"
                  key={niche}
                  onClick={() => handleNicheChange(niche)}
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
        </section>

        {/* Content Section */}
        {isLoading ? (
          /* Skeleton Loading Cards */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" aria-label="Loading creators">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-surface rounded-2xl border border-border p-5 shadow-card animate-pulse space-y-4"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-full bg-surface-muted" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-surface-muted rounded w-3/4" />
                    <div className="h-3 bg-surface-muted rounded w-1/2" />
                  </div>
                </div>
                <div className="h-3 bg-surface-muted rounded w-1/3" />
                <div className="space-y-1.5">
                  <div className="h-2.5 bg-surface-muted rounded w-full" />
                  <div className="h-2.5 bg-surface-muted rounded w-5/6" />
                </div>
                <div className="pt-3 border-t border-border flex justify-between">
                  <div className="h-8 bg-surface-muted rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          /* Error State with Retry */
          <div className="p-8 text-center bg-danger/10 border border-danger/20 rounded-2xl space-y-3">
            <AlertCircle className="w-8 h-8 text-danger mx-auto" />
            <p className="text-sm font-semibold text-danger">
              {(error as any)?.message || 'Failed to load creators from marketplace.'}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface text-foreground border border-border rounded-lg text-xs font-semibold hover:bg-surface-muted transition-colors shadow-subtle"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        ) : creators.length === 0 ? (
          /* Empty State */
          <div className="py-16 text-center bg-surface rounded-2xl border border-border p-8 space-y-3">
            <p className="font-display text-xl font-bold text-foreground">
              No Creators Found
            </p>
            <p className="text-sm text-foreground-muted max-w-sm mx-auto">
              We couldn't find discoverable creators matching your current search or filters.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-4 py-2 text-xs font-semibold bg-surface-muted hover:bg-border rounded-lg border border-border transition-colors text-foreground"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          /* Creator Cards Grid */
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {creators.map((c) => {
                const isSaved = savedCreatorIds.includes(c.id);

                return (
                  <article
                    key={c.id}
                    className="bg-surface rounded-2xl border border-border p-5 shadow-card hover:shadow-dropdown transition-all flex flex-col justify-between group relative"
                  >
                    <div>
                      {/* Card Header: Avatar, Name, Niche & Role-Aware Save Action */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3.5">
                          <AvatarWithFallback
                            src={c.profilePhotoUrl}
                            alt={c.name}
                            size="lg"
                          />
                          <div>
                            <h2 className="font-bold text-foreground text-base group-hover:text-accent transition-colors leading-snug">
                              {c.name}
                            </h2>
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-accent/10 text-accent mt-0.5">
                              {c.niche}
                            </span>
                          </div>
                        </div>

                        {/* Save Button: Hidden for Creator users; available for Business and Guests */}
                        {!isCreator && (
                          <button
                            type="button"
                            onClick={(e) => handleSaveToggle(c, e)}
                            aria-label={isSaved ? `Unsave ${c.name}` : `Save ${c.name}`}
                            title={isSaved ? 'Unsave creator' : 'Save creator'}
                            className={`p-2 rounded-full border transition-all ${
                              isSaved
                                ? 'bg-accent/10 border-accent/30 text-accent'
                                : 'bg-surface-muted/60 border-border text-foreground-muted hover:text-foreground hover:bg-surface-muted'
                            }`}
                          >
                            <Bookmark
                              className={`w-4 h-4 ${isSaved ? 'fill-accent text-accent' : ''}`}
                            />
                          </button>
                        )}
                      </div>

                      {/* Location */}
                      <div className="flex items-center gap-1 text-xs text-foreground-muted mb-3">
                        <MapPin className="w-3.5 h-3.5 text-foreground-muted shrink-0" />
                        <span>{c.location}</span>
                      </div>

                      {/* Bio */}
                      <p className="text-xs text-foreground-muted line-clamp-3 mb-4 leading-relaxed">
                        {c.bio}
                      </p>

                      {/* Specialties */}
                      {c.specialties && c.specialties.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4" aria-label="Specialties">
                          {c.specialties.slice(0, 3).map((spec: string) => (
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

                    {/* Card Action Link to /creators/:creatorId */}
                    <div className="pt-3 border-t border-border">
                      <Link
                        to={`/creators/${c.id}`}
                        className="w-full py-2 bg-surface hover:bg-surface-muted text-foreground border border-border rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors focus:ring-2 focus:ring-accent"
                      >
                        View Profile <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Server-Side Pagination Bar */}
            {pagination && pagination.totalPages > 1 && (
              <nav
                className="flex items-center justify-between border-t border-border pt-4 px-2"
                aria-label="Pagination Navigation"
              >
                <div className="text-xs text-foreground-muted">
                  Showing page <span className="font-semibold text-foreground">{pagination.page}</span> of{' '}
                  <span className="font-semibold text-foreground">{pagination.totalPages}</span> ({pagination.total} creators)
                  {isFetching && <span className="ml-2 text-accent">Updating...</span>}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={!pagination.hasPrevPage || isFetching}
                    className="px-3 py-1.5 rounded-lg border border-border bg-surface text-xs font-medium text-foreground hover:bg-surface-muted disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                    aria-label="Previous Page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Previous
                  </button>

                  <button
                    type="button"
                    onClick={() => setPage((prev) => prev + 1)}
                    disabled={!pagination.hasNextPage || isFetching}
                    className="px-3 py-1.5 rounded-lg border border-border bg-surface text-xs font-medium text-foreground hover:bg-surface-muted disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                    aria-label="Next Page"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </nav>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
