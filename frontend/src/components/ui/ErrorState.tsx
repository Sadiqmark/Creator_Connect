import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ErrorStateProps {
  title?: string;
  message?: React.ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  variant?: 'card' | 'inline' | 'banner';
  isRetrying?: boolean;
}

/**
 * Reusable ErrorState primitive adhering to DESIGN_SYSTEM.md Section 25.
 * Displays concise, human-friendly error messages with optional retry capabilities.
 * Caller controls the retry logic; component remains decoupled from network clients.
 */
export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong.',
  message = "We encountered an unexpected problem loading this information. Please try again.",
  onRetry,
  retryLabel = 'Try Again',
  className,
  variant = 'card',
  isRetrying = false,
}) => {
  if (variant === 'banner') {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className={cn(
          'p-4 rounded-xl bg-danger/10 border border-danger/20 flex items-start gap-3 text-left',
          className
        )}
      >
        <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-danger">{title}</h4>
          {message && (
            <div className="text-xs text-foreground-muted mt-0.5 leading-relaxed">
              {typeof message === 'string' ? <p>{message}</p> : message}
            </div>
          )}
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={isRetrying}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface border border-border text-foreground hover:bg-surface-muted transition-colors disabled:opacity-50 shrink-0 shadow-subtle"
          >
            <RotateCcw className={cn('w-3.5 h-3.5', isRetrying && 'animate-spin')} aria-hidden="true" />
            <span>{retryLabel}</span>
          </button>
        )}
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className={cn('flex items-center gap-2 text-danger text-xs sm:text-sm', className)}
      >
        <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span className="flex-1">{typeof message === 'string' ? message : title}</span>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={isRetrying}
            className="underline font-semibold hover:text-danger/80 disabled:opacity-50"
          >
            {retryLabel}
          </button>
        )}
      </div>
    );
  }

  // Default: 'card'
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'w-full flex flex-col items-center justify-center text-center p-8 sm:p-10 rounded-2xl border border-danger/20 bg-danger/5 shadow-subtle',
        className
      )}
    >
      <div
        className="w-12 h-12 rounded-2xl bg-danger/10 text-danger flex items-center justify-center mb-4 shadow-subtle shrink-0"
        aria-hidden="true"
      >
        <AlertCircle className="w-6 h-6" />
      </div>

      <h3 className="text-base sm:text-lg font-bold text-foreground mb-1.5">
        {title}
      </h3>

      {message && (
        <div className="text-xs sm:text-sm text-foreground-muted max-w-sm mx-auto mb-6 leading-relaxed">
          {typeof message === 'string' ? <p>{message}</p> : message}
        </div>
      )}

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-surface border border-border text-foreground hover:bg-surface-muted transition-colors disabled:opacity-50 shadow-subtle focus:outline-none focus:ring-2 focus:ring-foreground/20"
        >
          <RotateCcw className={cn('w-4 h-4 text-foreground-muted', isRetrying && 'animate-spin')} aria-hidden="true" />
          <span>{retryLabel}</span>
        </button>
      )}
    </div>
  );
};
