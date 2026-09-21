import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPublicBusinessProfile, BusinessPublicProfile } from '../../services/api/businesses';
import { AvatarWithFallback } from '../../components/ui/AvatarWithFallback';
import { Skeleton, SkeletonText } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { isNotFoundError } from '../../services/api/errors';
import {
  MapPin,
  Globe,
  Instagram,
  ArrowLeft,
  ExternalLink,
  AlertCircle,
  Briefcase,
} from 'lucide-react';

export const BusinessProfileViewPage: React.FC = () => {
  const { businessId } = useParams<{ businessId: string }>();

  const [business, setBusiness] = useState<BusinessPublicProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);

  const fetchBusiness = useCallback(async () => {
    if (!businessId) return;
    setIsLoading(true);
    setError(null);
    setIsNotFound(false);
    try {
      const data = await getPublicBusinessProfile(businessId);
      setBusiness(data);
    } catch (err: unknown) {
      if (isNotFoundError(err)) {
        setIsNotFound(true);
        setError('The requested business brand profile could not be found.');
      } else {
        setIsNotFound(false);
        setError('We encountered an issue loading this business profile. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetchBusiness();
  }, [fetchBusiness]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto space-y-6" aria-label="Loading business profile">
          <Skeleton variant="text" className="w-32 h-4" />
          <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 shadow-card space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <Skeleton variant="rectangular" className="w-20 h-20 rounded-xl shrink-0" />
              <div className="space-y-2.5 flex-1">
                <Skeleton variant="text" className="w-48 h-8 rounded-lg" />
                <div className="flex items-center gap-2">
                  <Skeleton className="w-24 h-5 rounded-full" />
                  <Skeleton variant="text" className="w-32 h-4" />
                </div>
              </div>
            </div>
            <div className="pt-6 border-t border-border flex items-center gap-3">
              <Skeleton variant="text" className="w-24 h-4" />
              <Skeleton className="w-20 h-7 rounded-lg" />
            </div>
          </div>
          <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 shadow-card space-y-4">
            <Skeleton variant="text" className="w-32 h-5" />
            <SkeletonText lines={3} />
          </div>
        </div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="min-h-screen bg-background py-16 px-4 flex flex-col items-center justify-center text-center">
        <div className="max-w-md w-full">
          {isNotFound || !business ? (
            <EmptyState
              icon={<AlertCircle className="w-8 h-8" />}
              title="Business Profile Not Found"
              description={error || 'The requested business brand profile is not available.'}
              action={{
                label: 'Back to Workspace',
                href: '/creator/dashboard',
              }}
            />
          ) : (
            <ErrorState
              title="Unable to load profile."
              message={error}
              onRetry={fetchBusiness}
            />
          )}
        </div>
      </div>
    );
  }

  const locationString = [business.city, business.stateOrProvince, business.country]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="min-h-screen bg-background py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div>
          <Link
            to="/creator/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Workspace
          </Link>
        </div>

        {/* Profile Card Header */}
        <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 shadow-card">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <AvatarWithFallback
                src={business.logoUrl}
                alt={business.businessName}
                size="2xl"
                className="border-2 border-border shadow-subtle rounded-xl"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                    {business.businessName}
                  </h1>
                </div>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-muted text-foreground border border-border">
                    <Briefcase className="w-3 h-3 text-accent" /> {business.category}
                  </span>
                  {locationString && (
                    <span className="inline-flex items-center gap-1 text-xs text-foreground-muted">
                      <MapPin className="w-3.5 h-3.5" /> {locationString}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Web & Social Links */}
          {(business.websiteUrl || business.instagramUrl) && (
            <div className="flex items-center gap-3 mt-6 pt-6 border-t border-border">
              <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                Official Channels:
              </span>
              {business.websiteUrl && (
                <a
                  href={business.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-muted hover:bg-border rounded-lg text-xs font-semibold text-foreground transition-colors"
                >
                  <Globe className="w-3.5 h-3.5 text-foreground-muted" />
                  Website
                  <ExternalLink className="w-3 h-3 text-foreground-muted" />
                </a>
              )}
              {business.instagramUrl && (
                <a
                  href={business.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-muted hover:bg-border rounded-lg text-xs font-semibold text-foreground transition-colors"
                >
                  <Instagram className="w-3.5 h-3.5 text-pink-600" />
                  Instagram
                  <ExternalLink className="w-3 h-3 text-foreground-muted" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Brand Overview */}
        <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 shadow-card space-y-4">
          <h2 className="text-lg font-bold text-foreground">Brand Overview</h2>
          <p className="text-sm text-foreground-muted leading-relaxed whitespace-pre-line">
            {business.description}
          </p>

          <div className="pt-4 border-t border-border">
            <p className="text-xs text-foreground-muted flex items-center gap-1.5">
              <span>🛡️</span>
              <span>
                Brand direct collaboration email becomes accessible once you accept an inquiry sent
                by this brand.
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
