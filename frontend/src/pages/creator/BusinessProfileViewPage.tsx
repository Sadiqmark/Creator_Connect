import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPublicBusinessProfile, BusinessPublicProfile } from '../../services/api/businesses';
import { AvatarWithFallback } from '../../components/ui/AvatarWithFallback';
import {
  MapPin,
  Globe,
  Instagram,
  ArrowLeft,
  ExternalLink,
  Loader2,
  AlertCircle,
  Briefcase,
} from 'lucide-react';

export const BusinessProfileViewPage: React.FC = () => {
  const { businessId } = useParams<{ businessId: string }>();

  const [business, setBusiness] = useState<BusinessPublicProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBusiness = async () => {
      if (!businessId) return;
      setIsLoading(true);
      setError(null);
      try {
        const data = await getPublicBusinessProfile(businessId);
        setBusiness(data);
      } catch (err: any) {
        if (err.statusCode === 404) {
          setError('Business profile not found.');
        } else {
          setError(err.message || 'Failed to load business profile.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchBusiness();
  }, [businessId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="min-h-screen bg-background py-16 px-4 flex flex-col items-center justify-center text-center">
        <AlertCircle className="w-12 h-12 text-foreground-muted mb-4" />
        <h1 className="font-display text-2xl font-bold text-foreground mb-2">
          Business Profile Not Found
        </h1>
        <p className="text-sm text-foreground-muted max-w-md mb-6">
          {error || 'The requested business brand profile is not available.'}
        </p>
        <Link
          to="/"
          className="px-4 py-2 bg-foreground text-surface rounded-lg text-sm font-semibold hover:bg-foreground/90 transition-colors"
        >
          Return Home
        </Link>
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
