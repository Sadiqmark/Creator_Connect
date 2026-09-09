import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listSavedCreators,
  unsaveCreator,
  SavedCreatorItem,
} from '../../services/api/savedCreators';
import { AvatarWithFallback } from '../../components/ui/AvatarWithFallback';
import {
  Bookmark,
  MapPin,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Trash2,
} from 'lucide-react';

export const SavedCreatorsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const limit = 24;

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['saved-creators', { page, limit }],
    queryFn: () => listSavedCreators({ page, limit }),
    placeholderData: (previousData) => previousData,
  });

  // Unsave Mutation with Optimistic UI Rollback
  const unsaveMutation = useMutation({
    mutationFn: (creatorProfileId: string) => unsaveCreator(creatorProfileId),
    onMutate: async (creatorProfileId: string) => {
      await queryClient.cancelQueries({ queryKey: ['saved-creators'] });
      await queryClient.cancelQueries({ queryKey: ['saved-creator-ids'] });

      const prevSavedData = queryClient.getQueryData(['saved-creators', { page, limit }]);
      const prevIds = queryClient.getQueryData<string[]>(['saved-creator-ids']);

      // Optimistically remove from saved creators list
      queryClient.setQueryData(['saved-creators', { page, limit }], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          savedCreators: old.savedCreators.filter(
            (item: SavedCreatorItem) => item.creator.id !== creatorProfileId
          ),
          pagination: {
            ...old.pagination,
            total: Math.max(0, old.pagination.total - 1),
          },
        };
      });

      // Optimistically remove from saved IDs
      if (prevIds) {
        queryClient.setQueryData<string[]>(['saved-creator-ids'], prevIds.filter((id) => id !== creatorProfileId));
      }

      return { prevSavedData, prevIds };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevSavedData) {
        queryClient.setQueryData(['saved-creators', { page, limit }], context.prevSavedData);
      }
      if (context?.prevIds) {
        queryClient.setQueryData(['saved-creator-ids'], context.prevIds);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-creators'] });
      queryClient.invalidateQueries({ queryKey: ['saved-creator-ids'] });
    },
  });

  const handleUnsave = (creatorProfileId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    unsaveMutation.mutate(creatorProfileId);
  };

  const savedList = data?.savedCreators || [];
  const pagination = data?.pagination;

  return (
    <div className="min-h-screen bg-background py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Breadcrumbs / Title */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground-muted mb-1.5">
              <Link to="/business/dashboard" className="hover:text-foreground transition-colors">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-foreground">Saved Creators</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
              Saved Creators
            </h1>
            <p className="text-xs text-foreground-muted mt-1">
              Curated creative partners bookmarked for current and upcoming collaborations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/creators"
              className="px-4 py-2 bg-foreground text-surface rounded-xl text-xs font-semibold hover:bg-foreground/90 transition-colors shadow-subtle flex items-center gap-1.5"
            >
              Explore Discovery <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </header>

        {/* Content Section */}
        {isLoading ? (
          /* Skeletons */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" aria-label="Loading saved creators">
            {Array.from({ length: 3 }).map((_, idx) => (
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
                <div className="h-8 bg-surface-muted rounded w-full" />
              </div>
            ))}
          </div>
        ) : isError ? (
          /* Error State */
          <div className="p-8 text-center bg-danger/10 border border-danger/20 rounded-2xl space-y-3">
            <AlertCircle className="w-8 h-8 text-danger mx-auto" />
            <p className="text-sm font-semibold text-danger">
              {(error as any)?.message || 'Failed to load saved creators.'}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface text-foreground border border-border rounded-lg text-xs font-semibold hover:bg-surface-muted transition-colors shadow-subtle"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        ) : savedList.length === 0 ? (
          /* Empty State */
          <div className="py-20 text-center bg-surface rounded-2xl border border-border p-8 space-y-4 shadow-card">
            <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center mx-auto">
              <Bookmark className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h2 className="font-display text-lg font-bold text-foreground">
                No saved creators yet.
              </h2>
              <p className="text-xs text-foreground-muted">
                Browse our curated creator marketplace and bookmark creators you'd like to partner with.
              </p>
            </div>
            <div>
              <Link
                to="/creators"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-xl text-xs font-semibold hover:bg-accent/90 transition-colors shadow-subtle"
              >
                Discover Creators
              </Link>
            </div>
          </div>
        ) : (
          /* Saved Creators Grid */
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedList.map((item) => {
                const c = item.creator;

                return (
                  <article
                    key={item.id}
                    className="bg-surface rounded-2xl border border-border p-5 shadow-card hover:shadow-dropdown transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Header with Avatar, Name, Niche & Unsave Button */}
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

                        {/* Unsave Button */}
                        <button
                          type="button"
                          onClick={(e) => handleUnsave(c.id, e)}
                          title="Remove from saved creators"
                          aria-label={`Unsave ${c.name}`}
                          className="p-2 rounded-full border border-border bg-surface-muted/60 text-foreground-muted hover:text-danger hover:border-danger/30 hover:bg-danger/10 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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

                    {/* Action Link */}
                    <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
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

            {/* Pagination Controls */}
            {pagination && pagination.totalPages > 1 && (
              <nav
                className="flex items-center justify-between border-t border-border pt-4 px-2"
                aria-label="Pagination Navigation"
              >
                <div className="text-xs text-foreground-muted">
                  Page <span className="font-semibold text-foreground">{pagination.page}</span> of{' '}
                  <span className="font-semibold text-foreground">{pagination.totalPages}</span> ({pagination.total} saved)
                  {isFetching && <span className="ml-2 text-accent">Updating...</span>}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={!pagination.hasPrevPage || isFetching}
                    className="px-3 py-1.5 rounded-lg border border-border bg-surface text-xs font-medium text-foreground hover:bg-surface-muted disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Previous
                  </button>

                  <button
                    type="button"
                    onClick={() => setPage((prev) => prev + 1)}
                    disabled={!pagination.hasNextPage || isFetching}
                    className="px-3 py-1.5 rounded-lg border border-border bg-surface text-xs font-medium text-foreground hover:bg-surface-muted disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
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
