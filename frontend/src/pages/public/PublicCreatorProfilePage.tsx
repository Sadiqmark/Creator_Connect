import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '@creator-connect/shared';
import { getPublicCreatorProfile, CreatorPublicProfile } from '../../services/api/creators';
import { AvatarWithFallback } from '../../components/ui/AvatarWithFallback';
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
  const { appUser } = useAuth();

  const [creator, setCreator] = useState<CreatorPublicProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (!creatorId) return;
      setIsLoading(true);
      setError(null);
      try {
        const data = await getPublicCreatorProfile(creatorId);
        setCreator(data);
      } catch (err: any) {
        if (err.statusCode === 404) {
          setError('Creator profile not found or is currently private.');
        } else {
          setError(err.message || 'Failed to load creator profile.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [creatorId]);

  const handleAuthenticatedAction = (actionType: 'save' | 'inquiry') => {
    // If not authenticated, redirect to login with return path
    if (!appUser) {
      navigate('/login', { state: { from: `/creators/${creatorId}` } });
      return;
    }

    // If logged in as Creator
    if (appUser.role === UserRole.CREATOR) {
      alert('Only business accounts can save creators or send collaboration inquiries.');
      return;
    }

    // Business user action
    if (actionType === 'save') {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } else {
      // In Phase 5 full inquiries are implemented. For Phase 4B:
      alert(`Inquiry feature: Start a collaboration with ${creator?.name}.`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  if (error || !creator) {
    return (
      <div className="min-h-screen bg-background py-16 px-4 flex flex-col items-center justify-center text-center">
        <AlertCircle className="w-12 h-12 text-foreground-muted mb-4" />
        <h1 className="font-display text-2xl font-bold text-foreground mb-2">
          Profile Not Available
        </h1>
        <p className="text-sm text-foreground-muted max-w-md mb-6">
          {error || 'The requested creator profile could not be found.'}
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
        <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 shadow-card">
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

            {/* Action buttons (Save & Inquire) */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleAuthenticatedAction('save')}
                className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-subtle ${
                  savedSuccess
                    ? 'bg-success/10 border-success/30 text-success'
                    : 'bg-surface border-border hover:bg-surface-muted text-foreground'
                }`}
              >
                <Bookmark className="w-4 h-4" />
                {savedSuccess ? 'Saved' : 'Save Creator'}
              </button>

              <button
                type="button"
                onClick={() => handleAuthenticatedAction('inquiry')}
                className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-accent hover:bg-accent/90 flex items-center justify-center gap-2 shadow-subtle transition-colors"
              >
                <Send className="w-4 h-4" />
                Send Inquiry
              </button>
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
        </div>

        {/* Bio & Content Specialties */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Story / Bio */}
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
                🛡️ Direct collaboration email and contact channels become available immediately
                upon accepted collaboration inquiry.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
