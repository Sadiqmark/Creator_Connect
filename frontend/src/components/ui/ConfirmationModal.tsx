import React, { useEffect, useId, useRef } from 'react';
import { X, Loader2, AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'success' | 'default';
  isLoading?: boolean;
  loadingText?: string;
  errorMessage?: string | null;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  confirmDisabled?: boolean;
  className?: string;
  closeOnBackdropClick?: boolean;
  autoFocusButton?: 'confirm' | 'cancel' | 'none';
}

/**
 * Reusable ConfirmationModal dialog foundation.
 * Provides accessible dialog semantics (role="dialog", aria-modal="true"),
 * focus trapping, Escape dismissal, configurable backdrop safety, and design-system styling.
 */
export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  isLoading = false,
  loadingText,
  errorMessage,
  icon,
  children,
  confirmDisabled = false,
  className,
  closeOnBackdropClick,
  autoFocusButton,
}) => {
  const titleId = useId();
  const descriptionId = useId();
  const modalRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // For destructive actions (variant === 'danger'), default to safe backdrop and cancel focus
  const shouldCloseOnBackdrop = closeOnBackdropClick ?? (variant !== 'danger');
  const targetAutoFocus = autoFocusButton ?? (variant === 'danger' ? 'cancel' : 'confirm');

  // Focus management and keyboard listener
  useEffect(() => {
    if (!isOpen) return;

    // Save previous active element for restoration
    previousActiveElementRef.current = document.activeElement as HTMLElement | null;

    // Safe initial focus based on action severity
    const focusTimer = setTimeout(() => {
      if (targetAutoFocus === 'cancel' && cancelButtonRef.current) {
        cancelButtonRef.current.focus();
      } else if (targetAutoFocus === 'confirm' && confirmButtonRef.current) {
        confirmButtonRef.current.focus();
      } else if (modalRef.current) {
        modalRef.current.focus();
      }
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
        return;
      }

      // Focus trap
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      // Restore previous focus on close
      if (previousActiveElementRef.current) {
        previousActiveElementRef.current.focus();
      }
    };
  }, [isOpen, isLoading, onClose, targetAutoFocus]);

  if (!isOpen) return null;

  const defaultIcons = {
    danger: <AlertTriangle className="w-5 h-5" />,
    success: <CheckCircle2 className="w-5 h-5" />,
    default: <HelpCircle className="w-5 h-5" />,
  };

  const iconColors = {
    danger: 'bg-danger/10 text-danger',
    success: 'bg-success/10 text-success',
    default: 'bg-surface-muted text-foreground',
  };

  const confirmButtonColors = {
    danger: 'bg-danger hover:bg-danger/90 text-white focus:ring-danger/50',
    success: 'bg-success hover:bg-success/90 text-white focus:ring-success/50',
    default: 'bg-foreground hover:bg-foreground/90 text-background focus:ring-foreground/50',
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading && shouldCloseOnBackdrop) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className={cn(
          'relative w-full max-w-md bg-surface border border-border rounded-2xl shadow-dialog overflow-hidden animate-in fade-in zoom-in-95 duration-200 outline-none',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-5 bg-surface-muted/40">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                iconColors[variant]
              )}
              aria-hidden="true"
            >
              {icon || defaultIcons[variant]}
            </div>
            <h2 id={titleId} className="text-base font-bold text-foreground">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-muted transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-foreground/20"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {description && (
            <div id={descriptionId} className="text-sm text-foreground-muted leading-relaxed">
              {typeof description === 'string' ? <p>{description}</p> : description}
            </div>
          )}

          {errorMessage && (
            <div
              role="alert"
              aria-live="assertive"
              className="p-3 bg-danger/10 border border-danger/20 rounded-xl text-xs text-danger"
            >
              {errorMessage}
            </div>
          )}

          {children}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
            <button
              ref={cancelButtonRef}
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 bg-surface border border-border hover:bg-surface-muted rounded-xl text-xs sm:text-sm font-semibold text-foreground transition-colors disabled:opacity-50 shadow-subtle focus:outline-none focus:ring-2 focus:ring-foreground/20"
            >
              {cancelText}
            </button>
            <button
              ref={confirmButtonRef}
              type="button"
              onClick={onConfirm}
              disabled={isLoading || confirmDisabled}
              className={cn(
                'px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-subtle focus:outline-none focus:ring-2',
                confirmButtonColors[variant]
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  <span>{loadingText || 'Processing...'}</span>
                </>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
