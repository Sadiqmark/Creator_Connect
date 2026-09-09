import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '@creator-connect/shared';
import { getPublicCreatorProfile } from '../../services/api/creators';
import {
  getSavedCreatorIds,
  saveCreator,
  unsaveCreator,
} from '../../services/api/savedCreators';
import { AvatarWithFallback } from '../../components/ui/AvatarWithFallback';
import { InquiryFormModal } from '../../components/inquiry/InquiryFormModal';
import {
  MapPin,
  Instagram,
  Youtube,
  Bookmark,
  Send,
  ArrowLeft,
  Loader2,
  AlertCircle,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

export const PublicCreatorProfilePage: React.FC = () => {
  const { creatorId } = useParams<{ creatorId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { appUser } = useAuth();
  const isBusiness = appUser?.role === UserRole.BUSINESS;
  const isCreator = appUser?.role === UserRole.CREATOR;
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);

  // TanStack Query for public profile details
  const {
    data: creator,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['creator', creatorId],
    queryFn: () => getPublicCreatorProfile(creatorId!),
    enabled: Boolean(creatorId),
  });

  // TanStack Query for saved creator IDs (business only)
  const { data: savedCreatorIds = [] } = useQuery({
    queryKey: ['saved-creator-ids'],
    queryFn: getSavedCreatorIds,
    enabled: isBusiness,
  });

  const isSaved = Boolean(creatorId && savedCreatorIds.includes(creatorId));

  // Save / Unsave Mutation with Optimistic Rollback
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!creatorId) return;
      if (isSaved) {
        return unsaveCreator(creatorId);
      } else {
        return saveCreator(creatorId);
      }
    },
    onMutate: async () => {
      if (!creatorId) return;
      await queryClient.cancelQueries({ queryKey: ['saved-creator-ids'] });
      const previousIds = queryClient.getQueryData<string[]>(['saved-creator-ids']) || [];

      // Optimistic toggle
      queryClient.setQueryData<string[]>(['saved-creator-ids'], (old = []) => {
        if (isSaved) {
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

  const handleSaveClick = () => {
    if (!appUser) {
      navigate('/login', { state: { from: `/creators/${creatorId}` } });
      return;
    }
    if (isBusiness) {
      saveMutation.mutate();
    }
  };

  const handleInquiryClick = () => {
    if (!appUser) {
      navigate('/login', { state: { from: `/creators/${creatorId}` } });
      return;
    }
    if (isBusiness) {
      setIsInquiryModalOpen(true);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  if (isError || !creator) {
    return (
      <div className="min-h-screen bg-background py-16 px-4 flex flex-col items-center justify-center text-center">
        <AlertCircle className="w-12 h-12 text-foreground-muted mb-4" />
        <h1 className="font-display text-2xl font-bold text-foreground mb-2">
          Profile Not Available
        </h1>
        <p className="text-sm text-foreground-muted max-w-md mb-6">
          {(error as any)?.message ||
            'The requested creator profile could not be found or is not currently discoverable.'}
        </p>
        <Link
          to="/creators"
          className="px-4 py-2 bg-foreground text-surface rounded-lg text-sm font-semibold hover:bg-foreground/90 transition-colors"
        >
          Browse All Creators
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/creators"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Creators
          </Link>
          {appUser && (
            <Link
              to={appUser.role === UserRole.CREATOR ? '/creator/dashboard' : '/business/dashboard'}
              className="text-xs font-semibold text-accent hover:underline"
            >
              My Dashboard
            </Link>
          )}
        </div>

        {/* Profile Card Header */}
        <article className="bg-surface rounded-2xl border border-border p-6 sm:p-8 shadow-card">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <AvatarWithFallback
                src={creator.profilePhotoUrl}
                alt={creator.name}
                size="2xl"
                className="shadow-subtle border-2 border-border"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                    {creator.name}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent/10 text-accent">
                    <Sparkles className="w-3 h-3" /> {creator.niche}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-sm text-foreground-muted mt-1.5">
                  <MapPin className="w-4 h-4 text-foreground-muted shrink-0" />
                  <span>{creator.location}</span>
                </div>
              </div>
            </div>

            {/* Action buttons (Save & Send Inquiry placeholder) */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {!isCreator && (
                <button
                  type="button"
                  onClick={handleSaveClick}
                  disabled={saveMutation.isPending}
                  aria-label={isSaved ? 'Unsave creator' : 'Save creator'}
                  className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-subtle ${
                    isSaved
                      ? 'bg-accent/10 border-accent/30 text-accent'
                      : 'bg-surface border-border hover:bg-surface-muted text-foreground'
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-accent text-accent' : ''}`} />
                  {isSaved ? 'Saved' : 'Save Creator'}
                </button>
              )}

              {!isCreator && (
                <button
                  type="button"
                  onClick={handleInquiryClick}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-accent hover:bg-accent/90 flex items-center justify-center gap-2 shadow-subtle transition-colors"
                >
                  <Send className="w-4 h-4" />
                  Send Inquiry
                </button>
              )}
            </div>
          </div>

          {/* Social Channels */}
          {(creator.instagramUrl || creator.youtubeUrl) && (
            <div className="flex items-center gap-3 mt-6 pt-6 border-t border-border">
              <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                Channels:
              </span>
              {creator.instagramUrl && (
                <a
                  href={creator.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-muted hover:bg-border rounded-lg text-xs font-semibold text-foreground transition-colors"
                >
                  <Instagram className="w-3.5 h-3.5 text-pink-600" />
                  Instagram
                  <ExternalLink className="w-3 h-3 text-foreground-muted" />
                </a>
              )}
              {creator.youtubeUrl && (
                <a
                  href={creator.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-muted hover:bg-border rounded-lg text-xs font-semibold text-foreground transition-colors"
                >
                  <Youtube className="w-3.5 h-3.5 text-red-600" />
                  YouTube
                  <ExternalLink className="w-3 h-3 text-foreground-muted" />
                </a>
              )}
            </div>
          )}
        </article>

        {/* Bio & Content Specialties */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Bio */}
          <div className="md:col-span-2 bg-surface rounded-2xl border border-border p-6 sm:p-8 shadow-card space-y-4">
            <h2 className="text-lg font-bold text-foreground">About the Creator</h2>
            <p className="text-sm text-foreground-muted leading-relaxed whitespace-pre-line">
              {creator.bio}
            </p>
          </div>

          {/* Content Specialties */}
          <div className="bg-surface rounded-2xl border border-border p-6 shadow-card space-y-4">
            <h2 className="text-base font-bold text-foreground">Content Specialties</h2>
            <div className="flex flex-wrap gap-2">
              {creator.specialties && creator.specialties.length > 0 ? (
                creator.specialties.map((spec) => (
                  <span
                    key={spec}
                    className="px-3 py-1 bg-surface-muted text-foreground border border-border rounded-full text-xs font-medium"
                  >
                    {spec}
                  </span>
                ))
              ) : (
                <p className="text-xs text-foreground-muted">No content specialties specified.</p>
              )}
            </div>

            {/* Privacy Note */}
            <div className="pt-4 border-t border-border">
              <p className="text-xs text-foreground-muted">
                🛡️ Direct contact details become available to authorized business partners after an accepted collaboration inquiry.
              </p>
            </div>
          </div>
        </div>

        {/* Structured Inquiry Modal */}
        {creator && (
          <InquiryFormModal
            creator={creator}
            isOpen={isInquiryModalOpen}
            onClose={() => setIsInquiryModalOpen(false)}
          />
        )}
      </div>
    </div>
  );
};
