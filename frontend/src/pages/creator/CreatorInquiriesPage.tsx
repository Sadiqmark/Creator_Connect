import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  listCreatorInquiries,
  InquiryStatus,
  CreatorInquiryListItem,
} from '../../services/api/inquiries';
import { AvatarWithFallback } from '../../components/ui/AvatarWithFallback';
import {
  Inbox,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Archive,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Calendar,
  Layers,
  MapPin,
} from 'lucide-react';

type FilterTab = 'ALL' | InquiryStatus;

const TABS: { id: FilterTab; label: string; icon?: React.ElementType }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'PENDING', label: 'Pending', icon: Clock },
  { id: 'ACCEPTED', label: 'Accepted', icon: CheckCircle2 },
  { id: 'REJECTED', label: 'Rejected', icon: XCircle },
  { id: 'EXPIRED', label: 'Expired', icon: AlertTriangle },
  { id: 'CLOSED', label: 'Closed', icon: Archive },
];

export const CreatorInquiriesPage: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<FilterTab>('ALL');
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['creator-inquiries', { status: selectedTab, page, limit }],
    queryFn: () => listCreatorInquiries({ status: selectedTab, page, limit }),
    placeholderData: (previousData) => previousData,
  });

  const handleTabChange = (tab: FilterTab) => {
    setSelectedTab(tab);
    setPage(1);
  };

  const inquiries = data?.inquiries || [];
  const pagination = data?.pagination;

  const getStatusBadge = (status: InquiryStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold bg-warning/10 text-warning border border-warning/20">
            <Clock className="w-3 h-3" /> Pending Review
          </span>
        );
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold bg-success/10 text-success border border-success/20">
            <CheckCircle2 className="w-3 h-3" /> Accepted
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold bg-danger/10 text-danger border border-danger/20">
            <XCircle className="w-3 h-3" /> Declined
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold bg-surface-muted text-foreground-muted border border-border">
            <AlertTriangle className="w-3 h-3" /> Expired
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold bg-surface-muted text-foreground-subtle border border-border">
            <Archive className="w-3 h-3" /> Closed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header with Breadcrumbs */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground-muted mb-1.5">
              <Link to="/creator/dashboard" className="hover:text-foreground transition-colors">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-foreground">Inquiries</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
              Received Inquiries
            </h1>
            <p className="text-xs text-foreground-muted mt-1">
              Review and manage brand collaboration proposals.
            </p>
          </div>
        </header>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border">
          {TABS.map((tab) => {
            const isActive = selectedTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-foreground text-surface shadow-subtle'
                    : 'bg-surface hover:bg-surface-muted text-foreground-muted hover:text-foreground border border-border'
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="space-y-4" aria-label="Loading inquiries">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-surface rounded-2xl border border-border p-6 shadow-card animate-pulse space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-surface-muted" />
                    <div className="space-y-2">
                      <div className="h-4 bg-surface-muted rounded w-40" />
                      <div className="h-3 bg-surface-muted rounded w-24" />
                    </div>
                  </div>
                  <div className="h-6 bg-surface-muted rounded-full w-24" />
                </div>
                <div className="h-4 bg-surface-muted rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : isError ? (
          /* Error State */
          <div className="p-8 text-center bg-surface border border-danger/20 rounded-2xl shadow-card space-y-3">
            <p className="text-sm font-semibold text-danger">
              {(error as any)?.message || 'Failed to load inquiries.'}
            </p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-surface border border-border rounded-xl text-xs font-bold text-foreground hover:bg-surface-muted inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Try Again
            </button>
          </div>
        ) : inquiries.length === 0 ? (
          /* Empty State */
          <div className="py-16 text-center bg-surface border border-border rounded-2xl shadow-card space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-surface-muted mx-auto flex items-center justify-center text-foreground-subtle">
              <Inbox className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">No inquiries found</h3>
              <p className="text-xs text-foreground-muted mt-1 max-w-sm mx-auto">
                {selectedTab === 'ALL'
                  ? 'You have not received any collaboration proposals yet. Ensure your profile is complete and discoverable.'
                  : `There are currently no inquiries in "${selectedTab}" state.`}
              </p>
            </div>
            <Link
              to="/creator/profile"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-foreground text-surface rounded-xl text-xs font-semibold hover:bg-foreground/90 transition-colors shadow-subtle"
            >
              View Profile Settings
            </Link>
          </div>
        ) : (
          /* Inquiry List Cards */
          <div className="space-y-4">
            {inquiries.map((inq: CreatorInquiryListItem) => (
              <Link
                key={inq.id}
                to={`/creator/inquiries/${inq.id}`}
                className="block bg-surface border border-border hover:border-foreground/30 rounded-2xl p-6 shadow-card hover:shadow-subtle transition-all group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Business Partner Info */}
                  <div className="flex items-center gap-3.5">
                    <AvatarWithFallback
                      src={inq.business.logoUrl}
                      alt={inq.business.businessName || ''}
                      size="lg"
                      className="border border-border"
                    />
                    <div>
                      <h2 className="text-sm font-bold text-foreground group-hover:text-accent transition-colors">
                        {inq.business.businessName}
                      </h2>
                      <div className="flex items-center gap-2 text-xs text-foreground-muted mt-0.5">
                        {inq.business.category && <span>{inq.business.category}</span>}
                        {inq.business.category && (inq.business.city || inq.business.country) && <span>•</span>}
                        {(inq.business.city || inq.business.country) && (
                          <span className="flex items-center gap-0.5">
                            <MapPin className="w-3 h-3" />
                            {[inq.business.city, inq.business.country].filter(Boolean).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status & Received Date */}
                  <div className="flex items-center sm:flex-col sm:items-end justify-between gap-2">
                    {getStatusBadge(inq.status)}
                    <span className="text-[11px] text-foreground-subtle">
                      Received {new Date(inq.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Collaboration Summary */}
                <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="flex items-center gap-1.5 text-foreground">
                    <Layers className="w-3.5 h-3.5 text-accent shrink-0" />
                    <span className="font-semibold">{inq.collaborationType}</span>
                    <span className="text-foreground-muted">({inq.platform})</span>
                  </div>

                  <div className="sm:col-span-2 flex items-center justify-between gap-4">
                    <p className="text-foreground-muted truncate">
                      <span className="font-semibold text-foreground">Deliverables:</span>{' '}
                      {inq.deliverables}
                    </p>

                    {(inq.timelineStart || inq.timelineEnd) && (
                      <div className="shrink-0 flex items-center gap-1 text-[11px] text-foreground-subtle">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {inq.timelineStart ? new Date(inq.timelineStart).toLocaleDateString() : 'TBD'}{' '}
                          - {inq.timelineEnd ? new Date(inq.timelineEnd).toLocaleDateString() : 'TBD'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border pt-6">
            <p className="text-xs text-foreground-muted">
              Showing <span className="font-semibold text-foreground">{(page - 1) * limit + 1}</span> to{' '}
              <span className="font-semibold text-foreground">
                {Math.min(page * limit, pagination.total)}
              </span>{' '}
              of <span className="font-semibold text-foreground">{pagination.total}</span> inquiries
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 border border-border rounded-xl text-foreground-muted hover:text-foreground hover:bg-surface disabled:opacity-40 transition-colors cursor-pointer"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold text-foreground px-2">
                Page {page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="p-2 border border-border rounded-xl text-foreground-muted hover:text-foreground hover:bg-surface disabled:opacity-40 transition-colors cursor-pointer"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
