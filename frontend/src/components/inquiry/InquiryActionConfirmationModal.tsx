import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { ConfirmationModal } from '../ui/ConfirmationModal';

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

/**
 * Inquiry acceptance/rejection confirmation dialog.
 * Composes the shared accessible ConfirmationModal primitive.
 */
export const InquiryActionConfirmationModal: React.FC<InquiryActionConfirmationModalProps> = ({
  isOpen,
  actionType,
  businessName,
  isLoading,
  errorMessage,
  onConfirm,
  onClose,
}) => {
  const isAccept = actionType === 'ACCEPT';

  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={isAccept ? 'Accept Collaboration Proposal' : 'Decline Collaboration Proposal'}
      variant={isAccept ? 'success' : 'danger'}
      confirmText={isAccept ? 'Confirm & Accept' : 'Confirm & Decline'}
      loadingText={isAccept ? 'Accepting...' : 'Declining...'}
      isLoading={isLoading}
      errorMessage={errorMessage}
      icon={isAccept ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
      description={
        isAccept ? (
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
        )
      }
    />
  );
};
