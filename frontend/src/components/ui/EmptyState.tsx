import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';

export interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: 'primary' | 'secondary';
}

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: EmptyStateAction | React.ReactNode;
  className?: string;
  compact?: boolean;
}

/**
 * Reusable EmptyState primitive adhering to DESIGN_SYSTEM.md Section 23.
 * Designed experiences for empty list, search, or dashboard states.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
  compact = false,
}) => {
  const renderAction = () => {
    if (!action) return null;

    if (React.isValidElement(action)) {
      return action;
    }

    const actionConfig = action as EmptyStateAction;
    const isPrimary = actionConfig.variant !== 'secondary';

    const buttonClasses = cn(
      'inline-flex items-center justify-center font-semibold rounded-xl text-xs sm:text-sm transition-colors shadow-subtle',
      compact ? 'px-3.5 py-1.5' : 'px-5 py-2.5',
      isPrimary
        ? 'bg-foreground text-background hover:bg-foreground/90'
        : 'bg-surface border border-border text-foreground hover:bg-surface-muted'
    );

    if (actionConfig.href) {
      return (
        <Link to={actionConfig.href} className={buttonClasses}>
          {actionConfig.label}
        </Link>
      );
    }

    return (
      <button
        type="button"
        onClick={actionConfig.onClick}
        className={buttonClasses}
      >
        {actionConfig.label}
      </button>
    );
  };

  return (
    <div
      role="region"
      aria-label={title}
      className={cn(
        'w-full flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-border bg-surface/40',
        compact ? 'p-6 sm:p-8' : 'p-8 sm:p-12',
        className
      )}
    >
      {icon && (
        <div
          className={cn(
            'rounded-2xl bg-surface-muted flex items-center justify-center text-foreground-muted mb-4 shadow-subtle shrink-0',
            compact ? 'w-10 h-10' : 'w-12 h-12'
          )}
          aria-hidden="true"
        >
          {icon}
        </div>
      )}

      <h3 className={cn('font-bold text-foreground mb-1.5', compact ? 'text-sm' : 'text-base sm:text-lg')}>
        {title}
      </h3>

      {description && (
        <div className="text-xs sm:text-sm text-foreground-muted max-w-sm leading-relaxed mb-5">
          {typeof description === 'string' ? <p>{description}</p> : description}
        </div>
      )}

      {action && <div className="mt-1">{renderAction()}</div>}
    </div>
  );
};
