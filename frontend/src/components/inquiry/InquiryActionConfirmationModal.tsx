import React, { useEffect, useRef } from 'react';
import { X, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export type InquiryActionType = 'ACCEPT' | 'REJECT';

interface InquiryActionConfirmationModalProps {
  isOpen: boolean;
  actionType: InquiryActionType;
  businessName: string;
  isLoading: boolean;
  errorMessage?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

export const InquiryActionConfirmationModal: React.FC<InquiryActionConfirmationModalProps> = ({
  isOpen,
  actionType,
  businessName,
  isLoading,
  errorMessage,
  onConfirm,
  onClose,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Focus confirmation button when modal opens
    confirmButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const isAccept = actionType === 'ACCEPT';

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inquiry-action-modal-title"
      aria-describedby="inquiry-action-modal-description"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-md bg-surface border border-border rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-5 bg-surface-muted/40">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isAccept
                  ? 'bg-success/10 text-success'
                  : 'bg-danger/10 text-danger'
              }`}
            >
              {isAccept ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2
                id="inquiry-action-modal-title"
                className="text-base font-bold text-foreground"
              >
                {isAccept ? 'Accept Collaboration Proposal' : 'Decline Collaboration Proposal'}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-muted transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p
            id="inquiry-action-modal-description"
            className="text-sm text-foreground-muted leading-relaxed"
          >
            {isAccept ? (
              <>
                You are about to accept this collaboration proposal
                {businessName ? ` from ${businessName}` : ''}.
                The brand partner will be notified immediately of your confirmation.
              </>
            ) : (
              <>
                Are you sure you want to decline this collaboration proposal
                {businessName ? ` from ${businessName}` : ''}?
                The brand partner will be notified that you are unable to proceed with this collaboration.
              </>
            )}
          </p>

          {errorMessage && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl text-xs text-danger">
              {errorMessage}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 bg-surface border border-border hover:bg-surface-muted rounded-xl text-xs font-semibold text-foreground transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              ref={confirmButtonRef}
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`px-4 py-2 rounded-xl text-xs font-semibold text-white transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-subtle ${
                isAccept
                  ? 'bg-success hover:bg-success/90'
                  : 'bg-danger hover:bg-danger/90'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {isAccept ? 'Accepting...' : 'Declining...'}
                </>
              ) : (
                <>{isAccept ? 'Confirm & Accept' : 'Confirm & Decline'}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
