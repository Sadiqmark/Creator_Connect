import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCreatorInquiryDetail,
  acceptInquiry,
  rejectInquiry,
  InquiryStatus,
} from '../../services/api/inquiries';
import { AvatarWithFallback } from '../../components/ui/AvatarWithFallback';
import {
  InquiryActionConfirmationModal,
  InquiryActionType,
} from '../../components/inquiry/InquiryActionConfirmationModal';
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
  RefreshCw,
  MapPin,
  Tag,
  AlertCircle,
} from 'lucide-react';

export const CreatorInquiryDetailPage: React.FC = () => {
  const { inquiryId } = useParams<{ inquiryId: string }>();
  const queryClient = useQueryClient();

  const [modalAction, setModalAction] = useState<InquiryActionType | null>(null);
  const [staleStateError, setStaleStateError] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['creator-inquiry-detail', inquiryId],
    queryFn: () => getCreatorInquiryDetail(inquiryId!),
    enabled: Boolean(inquiryId),
  });

  const inquiry = data?.inquiry;

  // Accept Mutation
  const acceptMutation = useMutation({
    mutationFn: () => acceptInquiry(inquiryId!),
    onSuccess: () => {
      setModalAction(null);
      queryClient.invalidateQueries({ queryKey: ['creator-inquiry-detail', inquiryId] });
      queryClient.invalidateQueries({ queryKey: ['creator-inquiries'] });
      queryClient.invalidateQueries({ queryKey: ['creator-dashboard'] });
    },
    onError: (err: any) => {
      if (
        err.response?.status === 409 ||
        err.response?.data?.error?.code === 'INVALID_INQUIRY_STATE'
      ) {
        setModalAction(null);
        setStaleStateError(
          'This collaboration proposal is no longer pending. It has already been responded to or has expired.'
        );
        queryClient.invalidateQueries({ queryKey: ['creator-inquiry-detail', inquiryId] });
        queryClient.invalidateQueries({ queryKey: ['creator-inquiries'] });
        queryClient.invalidateQueries({ queryKey: ['creator-dashboard'] });
      }
    },
  });

  // Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: () => rejectInquiry(inquiryId!),
    onSuccess: () => {
      setModalAction(null);
      queryClient.invalidateQueries({ queryKey: ['creator-inquiry-detail', inquiryId] });
      queryClient.invalidateQueries({ queryKey: ['creator-inquiries'] });
      queryClient.invalidateQueries({ queryKey: ['creator-dashboard'] });
    },
    onError: (err: any) => {
      if (
        err.response?.status === 409 ||
        err.response?.data?.error?.code === 'INVALID_INQUIRY_STATE'
      ) {
        setModalAction(null);
        setStaleStateError(
          'This collaboration proposal is no longer pending. It has already been responded to or has expired.'
        );
        queryClient.invalidateQueries({ queryKey: ['creator-inquiry-detail', inquiryId] });
        queryClient.invalidateQueries({ queryKey: ['creator-inquiries'] });
        queryClient.invalidateQueries({ queryKey: ['creator-dashboard'] });
      }
    },
  });

  const isMutating = acceptMutation.isPending || rejectMutation.isPending;
  const mutationError =
    acceptMutation.error?.message || rejectMutation.error?.message || null;

  const handleConfirmAction = () => {
    if (modalAction === 'ACCEPT') {
      acceptMutation.mutate();
    } else if (modalAction === 'REJECT') {
      rejectMutation.mutate();
    }
  };

  const renderStatusBanner = (status: InquiryStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <div className="p-4 rounded-2xl bg-warning/10 border border-warning/30 flex items-start gap-3">
            <Clock className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-warning">Awaiting Your Response</h3>
              <p className="text-xs text-foreground-muted mt-0.5">
                This proposal is active and awaiting your review. If no action is taken, it will
                automatically expire on{' '}
                {inquiry
                  ? new Date(inquiry.expiresAt).toLocaleDateString()
                  : 'the expiration date'}
                .
              </p>
            </div>
          </div>
        );
      case 'ACCEPTED':
        return (
          <div className="p-4 rounded-2xl bg-success/10 border border-success/30 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-success">Collaboration Accepted</h3>
              <p className="text-xs text-foreground-muted mt-0.5">
                You confirmed this collaboration proposal on{' '}
                {inquiry?.respondedAt
                  ? new Date(inquiry.respondedAt).toLocaleDateString()
                  : 'recent date'}
                .
              </p>
            </div>
          </div>
        );
      case 'REJECTED':
        return (
          <div className="p-4 rounded-2xl bg-danger/10 border border-danger/30 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-danger">Collaboration Declined</h3>
              <p className="text-xs text-foreground-muted mt-0.5">
                You declined this collaboration proposal on{' '}
                {inquiry?.respondedAt
                  ? new Date(inquiry.respondedAt).toLocaleDateString()
                  : 'recent date'}
                .
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
                This inquiry reached its response window without confirmation and is no longer
                active.
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
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-6 animate-pulse" aria-label="Loading inquiry details">
          <div className="h-6 bg-surface-muted rounded w-32" />
          <div className="h-20 bg-surface rounded-2xl border border-border" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-96 bg-surface rounded-2xl border border-border" />
            <div className="h-96 bg-surface rounded-2xl border border-border" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !inquiry) {
    return (
      <div className="min-h-screen bg-background py-16 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-surface border border-border rounded-2xl p-8 shadow-card text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-danger/10 text-danger mx-auto flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Inquiry Not Found</h2>
          <p className="text-xs text-foreground-muted">
            {(error as any)?.message ||
              'The requested collaboration proposal could not be found or you do not have permission to view it.'}
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              to="/creator/inquiries"
              className="px-4 py-2 bg-foreground text-surface rounded-xl text-xs font-semibold hover:bg-foreground/90 transition-colors shadow-subtle"
            >
              Back to Inquiries
            </Link>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-surface border border-border hover:bg-surface-muted rounded-xl text-xs font-semibold text-foreground transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { business } = inquiry;

  return (
    <div className="min-h-screen bg-background py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation & Breadcrumbs */}
        <div className="flex items-center justify-between">
          <Link
            to="/creator/inquiries"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Inquiries
          </Link>
          <div className="text-xs text-foreground-subtle">
            Received {new Date(inquiry.createdAt).toLocaleDateString()}
          </div>
        </div>

        {/* 409 Stale-State Conflict Alert */}
        {staleStateError && (
          <div className="p-4 rounded-2xl bg-danger/10 border border-danger/30 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-danger">State Conflict</h3>
              <p className="text-xs text-foreground-muted mt-0.5">{staleStateError}</p>
            </div>
          </div>
        )}

        {/* Status Banner */}
        {renderStatusBanner(inquiry.status)}

        {/* Action Header Card when PENDING */}
        {inquiry.status === 'PENDING' && (
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-foreground">Respond to Proposal</h2>
              <p className="text-xs text-foreground-muted mt-0.5">
                Review deliverables and terms below before confirming or declining this collaboration.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setModalAction('REJECT')}
                disabled={isMutating}
                className="px-4 py-2 border border-border hover:border-danger hover:text-danger rounded-xl text-xs font-semibold text-foreground-muted transition-colors disabled:opacity-50 cursor-pointer"
              >
                Decline Proposal
              </button>
              <button
                type="button"
                onClick={() => setModalAction('ACCEPT')}
                disabled={isMutating}
                className="px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-xl text-xs font-semibold transition-colors shadow-subtle disabled:opacity-50 cursor-pointer"
              >
                Accept Collaboration
              </button>
            </div>
          </div>
        )}

        {/* Main Content Two-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Proposal Details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-card space-y-6">
              <div className="border-b border-border pb-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
                  Collaboration Overview
                </span>
                <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground mt-1">
                  {inquiry.collaborationType}
                </h1>
              </div>

              {/* Grid specs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-surface-muted/50 rounded-xl border border-border/60">
                  <div className="flex items-center gap-1.5 text-foreground-muted mb-1">
                    <Layers className="w-3.5 h-3.5 text-accent" />
                    <span className="font-semibold">Target Platform</span>
                  </div>
                  <p className="text-sm font-bold text-foreground">{inquiry.platform}</p>
                </div>

                <div className="p-3.5 bg-surface-muted/50 rounded-xl border border-border/60">
                  <div className="flex items-center gap-1.5 text-foreground-muted mb-1">
                    <Calendar className="w-3.5 h-3.5 text-accent" />
                    <span className="font-semibold">Timeline</span>
                  </div>
                  <p className="text-sm font-bold text-foreground">
                    {inquiry.timelineStart
                      ? new Date(inquiry.timelineStart).toLocaleDateString()
                      : 'Flexible'}{' '}
                    -{' '}
                    {inquiry.timelineEnd
                      ? new Date(inquiry.timelineEnd).toLocaleDateString()
                      : 'Flexible'}
                  </p>
                </div>
              </div>

              {/* Deliverables */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Deliverables
                </h3>
                <div className="p-4 bg-surface-muted/30 rounded-xl border border-border text-xs text-foreground leading-relaxed whitespace-pre-line">
                  {inquiry.deliverables}
                </div>
              </div>

              {/* Brief */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-foreground-muted" /> Collaboration Brief
                </h3>
                <div className="p-4 bg-surface-muted/30 rounded-xl border border-border text-xs text-foreground leading-relaxed whitespace-pre-line">
                  {inquiry.brief}
                </div>
              </div>

              {/* Additional Requirements */}
              {inquiry.additionalRequirements && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Additional Requirements
                  </h3>
                  <div className="p-4 bg-surface-muted/30 rounded-xl border border-border text-xs text-foreground-muted leading-relaxed whitespace-pre-line">
                    {inquiry.additionalRequirements}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Business Profile & Lifecycle */}
          <div className="space-y-6">
            {/* Brand Partner Card */}
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-card space-y-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
                Brand Partner
              </span>

              <div className="flex items-center gap-3.5">
                <AvatarWithFallback
                  src={business.logoUrl}
                  alt={business.businessName || ''}
                  size="lg"
                  className="border border-border shadow-subtle"
                />
                <div>
                  <h2 className="text-base font-bold text-foreground">
                    {business.businessName}
                  </h2>
                  {business.category && (
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-surface-muted text-foreground-muted mt-1 border border-border/60 font-medium">
                      <Tag className="w-2.5 h-2.5" /> {business.category}
                    </span>
                  )}
                </div>
              </div>

              {(business.city || business.country) && (
                <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
                  <MapPin className="w-3.5 h-3.5 text-foreground-subtle shrink-0" />
                  <span>
                    {[business.city, business.stateOrProvince, business.country]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </div>
              )}

              {business.description && (
                <p className="text-xs text-foreground-muted leading-relaxed border-t border-border pt-3">
                  {business.description}
                </p>
              )}

              {/* Public Links */}
              {(business.websiteUrl || business.instagramUrl) && (
                <div className="pt-3 border-t border-border flex flex-col gap-2">
                  {business.websiteUrl && (
                    <a
                      href={business.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-between text-xs text-foreground hover:text-accent font-semibold p-2 bg-surface-muted/50 hover:bg-surface-muted rounded-xl transition-colors"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <ExternalLink className="w-3.5 h-3.5 text-foreground-muted shrink-0" />
                        <span className="truncate">{business.websiteUrl.replace(/^https?:\/\//, '')}</span>
                      </span>
                      <ExternalLink className="w-3 h-3 text-foreground-subtle shrink-0" />
                    </a>
                  )}

                  {business.instagramUrl && (
                    <a
                      href={business.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-between text-xs text-foreground hover:text-accent font-semibold p-2 bg-surface-muted/50 hover:bg-surface-muted rounded-xl transition-colors"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Instagram className="w-3.5 h-3.5 text-foreground-muted shrink-0" />
                        <span className="truncate">Instagram Profile</span>
                      </span>
                      <ExternalLink className="w-3 h-3 text-foreground-subtle shrink-0" />
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Lifecycle Timeline Card (Omits UUID as per guidance) */}
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-card space-y-3 text-xs">
              <h3 className="font-bold text-foreground uppercase tracking-wider text-[11px]">
                Proposal Timeline
              </h3>

              <div className="space-y-2.5 text-foreground-muted">
                <div className="flex items-center justify-between">
                  <span>Received</span>
                  <span className="font-medium text-foreground">
                    {new Date(inquiry.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span>Expires</span>
                  <span className="font-medium text-foreground">
                    {new Date(inquiry.expiresAt).toLocaleDateString()}
                  </span>
                </div>

                {inquiry.respondedAt && (
                  <div className="flex items-center justify-between">
                    <span>Responded</span>
                    <span className="font-medium text-foreground">
                      {new Date(inquiry.respondedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {inquiry.closedAt && (
                  <div className="flex items-center justify-between">
                    <span>Closed</span>
                    <span className="font-medium text-foreground">
                      {new Date(inquiry.closedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {modalAction && (
        <InquiryActionConfirmationModal
          isOpen={Boolean(modalAction)}
          actionType={modalAction}
          businessName={business.businessName}
          isLoading={isMutating}
          errorMessage={mutationError}
          onConfirm={handleConfirmAction}
          onClose={() => setModalAction(null)}
        />
      )}
    </div>
  );
};
