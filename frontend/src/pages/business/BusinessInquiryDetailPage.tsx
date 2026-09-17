import React from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getBusinessInquiryDetail, InquiryStatus } from '../../services/api/inquiries';
import { AvatarWithFallback } from '../../components/ui/AvatarWithFallback';
import { CreatorContactCard } from '../../components/inquiry/InquiryContactCard';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Archive,
  ExternalLink,
  Calendar,
  Layers,
  FileText,
  Instagram,
  Youtube,
  RefreshCw,
  MapPin,
  Sparkles,
} from 'lucide-react';

export const BusinessInquiryDetailPage: React.FC = () => {
  const { inquiryId } = useParams<{ inquiryId: string }>();
  const navigate = useNavigate();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['business-inquiry-detail', inquiryId],
    queryFn: () => getBusinessInquiryDetail(inquiryId!),
    enabled: Boolean(inquiryId),
  });

  const inquiry = data?.inquiry;

  const renderStatusBanner = (status: InquiryStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <div className="p-4 rounded-2xl bg-warning/10 border border-warning/30 flex items-start gap-3">
            <Clock className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-warning">Awaiting Creator Response</h3>
              <p className="text-xs text-foreground-muted mt-0.5">
                This proposal is active and under review by the creator. If no action is taken, it
                will automatically expire on{' '}
                {inquiry ? new Date(inquiry.expiresAt).toLocaleDateString() : 'the expiration date'}.
              </p>
            </div>
          </div>
        );
      case 'ACCEPTED':
        return (
          <div className="p-4 rounded-2xl bg-success/10 border border-success/30 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-success">Proposal Accepted</h3>
              <p className="text-xs text-foreground-muted mt-0.5">
                The creator confirmed this collaboration proposal on{' '}
                {inquiry?.respondedAt
                  ? new Date(inquiry.respondedAt).toLocaleDateString()
                  : 'recent date'}.
              </p>
            </div>
          </div>
        );
      case 'REJECTED':
        return (
          <div className="p-4 rounded-2xl bg-danger/10 border border-danger/30 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-danger">Proposal Declined</h3>
              <p className="text-xs text-foreground-muted mt-0.5">
                The creator was unavailable or unable to take on this campaign at this time.
              </p>
            </div>
          </div>
        );
      case 'EXPIRED':
        return (
          <div className="p-4 rounded-2xl bg-surface-muted border border-border flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-foreground-muted shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-foreground">Proposal Expired</h3>
              <p className="text-xs text-foreground-muted mt-0.5">
                This inquiry reached its 60-day response window without confirmation and is no
                longer active.
              </p>
            </div>
          </div>
        );
      case 'CLOSED':
        return (
          <div className="p-4 rounded-2xl bg-surface-muted border border-border flex items-start gap-3">
            <Archive className="w-5 h-5 text-foreground-subtle shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-foreground-muted">Inquiry Closed</h3>
              <p className="text-xs text-foreground-muted mt-0.5">
                This collaboration cycle has concluded and is preserved for historical tracking.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation / Breadcrumbs */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/business/inquiries')}
            className="flex items-center gap-1.5 text-xs font-semibold text-foreground-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Inquiries
          </button>

          <div className="text-xs text-foreground-muted">
            <Link to="/business/dashboard" className="hover:text-foreground">
              Dashboard
            </Link>{' '}
            / <Link to="/business/inquiries" className="hover:text-foreground">Inquiries</Link> /{' '}
            <span className="text-foreground font-mono">{inquiryId?.slice(0, 8)}...</span>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="space-y-6 animate-pulse" aria-label="Loading inquiry details">
            <div className="h-16 bg-surface rounded-2xl border border-border" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 h-96 bg-surface rounded-2xl border border-border" />
              <div className="h-96 bg-surface rounded-2xl border border-border" />
            </div>
          </div>
        ) : isError || !inquiry ? (
          /* Error State */
          <div className="p-8 text-center bg-surface border border-border rounded-2xl shadow-card space-y-3">
            <p className="text-base font-bold text-foreground">Inquiry Not Found</p>
            <p className="text-xs text-foreground-muted max-w-sm mx-auto">
              {(error as any)?.message ||
                'The inquiry you requested does not exist or you do not have permission to view it.'}
            </p>
            <div className="pt-2">
              <button
                onClick={() => refetch()}
                className="px-4 py-2 bg-surface border border-border rounded-xl text-xs font-bold text-foreground hover:bg-surface-muted inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </button>
            </div>
          </div>
        ) : (
          /* Main Content Layout */
          <div className="space-y-6">
            {/* Status Guidance Banner */}
            {renderStatusBanner(inquiry.status)}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Left 2 Cols: Proposal Details */}
              <div className="lg:col-span-2 space-y-6">
                {/* Campaign Overview Card */}
                <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-card space-y-6">
                  <div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-muted text-foreground-muted border border-border">
                      {inquiry.platform}
                    </span>
                    <h1 className="font-display text-2xl font-bold text-foreground mt-2">
                      {inquiry.collaborationType}
                    </h1>
                  </div>

                  {/* Deliverables */}
                  <div className="space-y-2">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-foreground-muted flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-foreground-subtle" /> Deliverables
                    </h2>
                    <div className="p-4 rounded-xl bg-surface-muted/50 border border-border text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {inquiry.deliverables}
                    </div>
                  </div>

                  {/* Campaign Brief */}
                  <div className="space-y-2">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-foreground-muted flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-foreground-subtle" /> Campaign Brief & Objectives
                    </h2>
                    <div className="p-4 rounded-xl bg-surface-muted/50 border border-border text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {inquiry.brief}
                    </div>
                  </div>

                  {/* Additional Requirements if any */}
                  {inquiry.additionalRequirements && (
                    <div className="space-y-2">
                      <h2 className="text-xs font-bold uppercase tracking-wider text-foreground-muted">
                        Special Instructions / Requirements
                      </h2>
                      <div className="p-4 rounded-xl bg-surface-muted/50 border border-border text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                        {inquiry.additionalRequirements}
                      </div>
                    </div>
                  )}

                  {/* Timeline */}
                  <div className="pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-foreground-muted block font-medium">Proposed Start Date</span>
                      <span className="font-semibold text-foreground text-sm mt-0.5 block">
                        {inquiry.timelineStart ? inquiry.timelineStart : 'Flexible / TBD'}
                      </span>
                    </div>
                    <div>
                      <span className="text-foreground-muted block font-medium">Proposed End Date</span>
                      <span className="font-semibold text-foreground text-sm mt-0.5 block">
                        {inquiry.timelineEnd ? inquiry.timelineEnd : 'Flexible / TBD'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Audit & Lifecycle Card */}
                <div className="bg-surface border border-border rounded-2xl p-6 shadow-card space-y-4">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-foreground-muted flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-foreground-subtle" /> Lifecycle Milestones
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-foreground-muted block font-medium">Sent On</span>
                      <span className="font-semibold text-foreground mt-0.5 block">
                        {new Date(inquiry.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-foreground-muted block font-medium">Expires On</span>
                      <span className="font-semibold text-foreground mt-0.5 block">
                        {new Date(inquiry.expiresAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-foreground-muted block font-medium">Responded At</span>
                      <span className="font-semibold text-foreground mt-0.5 block">
                        {inquiry.respondedAt
                          ? new Date(inquiry.respondedAt).toLocaleDateString()
                          : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-foreground-muted block font-medium">Closed At</span>
                      <span className="font-semibold text-foreground mt-0.5 block">
                        {inquiry.closedAt
                          ? new Date(inquiry.closedAt).toLocaleDateString()
                          : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Col: Creator Profile & Contact */}
              <div className="space-y-6">
                {inquiry.contact && (
                  <CreatorContactCard contact={inquiry.contact} />
                )}

                <div className="bg-surface border border-border rounded-2xl p-6 shadow-card space-y-5 sticky top-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-foreground-muted">
                      Target Creator
                    </h2>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-muted text-foreground border border-border">
                      {inquiry.creator.niche}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <AvatarWithFallback
                      src={inquiry.creator.profilePhotoUrl}
                      alt={inquiry.creator.name}
                      size="xl"
                      className="border-2 border-border shadow-subtle"
                    />
                    <div>
                      <h3 className="font-display text-lg font-bold text-foreground">
                        {inquiry.creator.name}
                      </h3>
                      <p className="text-xs text-foreground-muted flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-foreground-subtle" />
                        {inquiry.creator.location}
                      </p>
                    </div>
                  </div>

                  {inquiry.creator.bio && (
                    <p className="text-xs text-foreground-muted leading-relaxed line-clamp-3">
                      {inquiry.creator.bio}
                    </p>
                  )}

                  {/* Specialties */}
                  {inquiry.creator.specialties && inquiry.creator.specialties.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-medium text-foreground-muted block">Specialties</span>
                      <div className="flex flex-wrap gap-1.5">
                        {inquiry.creator.specialties.map((s, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-0.5 rounded-md bg-surface-muted text-foreground-muted border border-border"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Social Links */}
                  {(inquiry.creator.instagramUrl || inquiry.creator.youtubeUrl) && (
                    <div className="pt-2 border-t border-border flex items-center gap-3">
                      {inquiry.creator.instagramUrl && (
                        <a
                          href={inquiry.creator.instagramUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-foreground-muted hover:text-foreground flex items-center gap-1 transition-colors"
                        >
                          <Instagram className="w-3.5 h-3.5" /> Instagram
                        </a>
                      )}
                      {inquiry.creator.youtubeUrl && (
                        <a
                          href={inquiry.creator.youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-foreground-muted hover:text-foreground flex items-center gap-1 transition-colors"
                        >
                          <Youtube className="w-3.5 h-3.5" /> YouTube
                        </a>
                      )}
                    </div>
                  )}

                  {/* Link to Public Profile */}
                  <div className="pt-2">
                    <Link
                      to={`/creators/${inquiry.creator.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-4 bg-foreground text-surface rounded-xl text-xs font-bold hover:bg-foreground/90 transition-colors shadow-subtle flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> View Public Profile
                      <ExternalLink className="w-3 h-3 ml-0.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
