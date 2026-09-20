import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { AlertTriangle, X, Loader2 } from 'lucide-react';

interface DeactivateAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const DeactivateAccountModal: React.FC<DeactivateAccountModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { deactivateAccount } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [confirmText, setConfirmText] = useState('');
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setConfirmText('');
      setErrorMessage(null);
      setIsDeactivating(false);
      return;
    }

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeactivating) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isDeactivating, onClose]);

  if (!isOpen) return null;

  const isConfirmed = confirmText === 'DEACTIVATE';

  const handleDeactivate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isConfirmed || isDeactivating) return;

    setIsDeactivating(true);
    setErrorMessage(null);

    try {
      await deactivateAccount();
      queryClient.clear();
      if (onSuccess) {
        onSuccess();
      }
      onClose();
      navigate('/login', { replace: true, state: { accountDeactivated: true } });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to deactivate account. Please try again.');
      setIsDeactivating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deactivate-account-modal-title"
      aria-describedby="deactivate-account-modal-description"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeactivating) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-md bg-surface border border-border rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-5 bg-surface-muted/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-danger/10 text-danger">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="deactivate-account-modal-title"
                className="text-base font-bold text-foreground"
              >
                Deactivate Account
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeactivating}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-muted transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div id="deactivate-account-modal-description" className="space-y-3">
            <p className="text-sm text-foreground-muted leading-relaxed">
              Deactivating your account initiates a <strong>30-day grace period</strong> before permanent deletion. Here is what happens next:
            </p>
            <ul className="text-xs text-foreground-muted space-y-1.5 list-disc pl-5">
              <li>Your public profile will be hidden immediately.</li>
              <li>Active inquiries involving your account will be paused.</li>
              <li>You will be signed out of your current session.</li>
              <li>You may sign back in at any time within 30 days to reactivate your account.</li>
              <li>After 30 days without reactivation, your account and personal data will be permanently deleted.</li>
            </ul>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="p-3 bg-danger/10 border border-danger/20 rounded-xl text-xs text-danger"
            >
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleDeactivate} className="space-y-4 pt-1">
            <div>
              <label
                htmlFor="confirm-deactivate-input"
                className="block text-xs font-semibold text-foreground mb-1.5"
              >
                To confirm deactivation, type <span className="font-mono text-danger font-bold">DEACTIVATE</span> below:
              </label>
              <input
                id="confirm-deactivate-input"
                ref={inputRef}
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                disabled={isDeactivating}
                placeholder="DEACTIVATE"
                autoComplete="off"
                className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-danger/50 focus:border-danger disabled:opacity-50"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                disabled={isDeactivating}
                className="px-4 py-2 bg-surface border border-border hover:bg-surface-muted rounded-xl text-xs font-semibold text-foreground transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isConfirmed || isDeactivating}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-danger hover:bg-danger/90 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-subtle"
              >
                {isDeactivating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Deactivating Account...
                  </>
                ) : (
                  'Deactivate Account'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
