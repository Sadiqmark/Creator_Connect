import React from 'react';
import { cn } from '../../lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'rectangular' | 'circular' | 'text';
}

/**
 * Base Skeleton primitive adhering to DESIGN_SYSTEM.md Section 24.
 * By default, individual skeleton blocks are marked `aria-hidden="true"` to prevent
 * screen-reader announcement spam. When used standalone, callers may pass `aria-label`
 * to expose status semantics.
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'rectangular',
  className,
  'aria-label': ariaLabel,
  ...props
}) => {
  const isSelfAnnouncing = Boolean(ariaLabel);

  return (
    <div
      role={isSelfAnnouncing ? 'status' : undefined}
      aria-busy={isSelfAnnouncing ? 'true' : undefined}
      aria-label={ariaLabel}
      aria-hidden={isSelfAnnouncing ? undefined : 'true'}
      className={cn(
        'animate-pulse bg-surface-muted',
        variant === 'circular' && 'rounded-full',
        variant === 'text' && 'h-4 rounded-md',
        variant === 'rectangular' && 'rounded-xl',
        className
      )}
      {...props}
    />
  );
};

export interface SkeletonTextProps extends React.HTMLAttributes<HTMLDivElement> {
  lines?: number;
  lastLineWidth?: string;
  label?: string;
}

/**
 * Multi-line text skeleton with variable line widths to simulate natural paragraph flow.
 * The containing element communicates loading state while individual decorative lines
 * are hidden from assistive technology.
 */
export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3,
  className,
  lastLineWidth = 'w-3/5',
  label = 'Loading text...',
  ...props
}) => {
  return (
    <div
      className={cn('space-y-2.5 w-full', className)}
      role="status"
      aria-busy="true"
      aria-label={label}
      {...props}
    >
      {Array.from({ length: lines }).map((_, idx) => {
        const isLast = idx === lines - 1;
        const widthClass = isLast ? lastLineWidth : idx % 2 === 1 ? 'w-4/5' : 'w-full';
        return (
          <Skeleton
            key={idx}
            variant="text"
            className={cn('h-3.5', widthClass)}
          />
        );
      })}
    </div>
  );
};

export interface SkeletonAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Circular avatar skeleton sized to match AvatarWithFallback dimensions.
 * Marked decorative by default unless wrapped in a labeled container.
 */
export const SkeletonAvatar: React.FC<SkeletonAvatarProps> = ({
  size = 'md',
  className,
  ...props
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  };

  return (
    <Skeleton
      variant="circular"
      className={cn(sizeClasses[size], 'shrink-0', className)}
      {...props}
    />
  );
};

export interface SkeletonCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  label?: string;
}

/**
 * Standard card skeleton container matching DESIGN_SYSTEM.md surface and border styles.
 * The outer card acts as the single accessible loading status region.
 */
export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  children,
  className,
  label = 'Loading card content...',
  ...props
}) => {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className={cn(
        'bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-subtle space-y-4',
        className
      )}
      {...props}
    >
      {children || (
        <>
          <div className="flex items-center gap-3">
            <SkeletonAvatar size="md" />
            <div className="space-y-2 flex-1">
              <Skeleton variant="text" className="w-1/3 h-4" />
              <Skeleton variant="text" className="w-1/4 h-3" />
            </div>
          </div>
          <SkeletonText lines={2} />
          <div className="pt-2 flex justify-end">
            <Skeleton className="w-24 h-8 rounded-xl" />
          </div>
        </>
      )}
    </div>
  );
};

export interface SkeletonRowProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  label?: string;
}

/**
 * List row skeleton matching inquiry and activity list row items.
 * The outer row acts as the single accessible loading status region.
 */
export const SkeletonRow: React.FC<SkeletonRowProps> = ({
  children,
  className,
  label = 'Loading list item...',
  ...props
}) => {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className={cn(
        'bg-surface border border-border rounded-xl p-4 flex items-center justify-between gap-4',
        className
      )}
      {...props}
    >
      {children || (
        <>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <SkeletonAvatar size="sm" />
            <div className="space-y-1.5 flex-1 min-w-0">
              <Skeleton variant="text" className="w-2/5 h-3.5" />
              <Skeleton variant="text" className="w-1/4 h-2.5" />
            </div>
          </div>
          <Skeleton className="w-16 h-6 rounded-lg shrink-0" />
        </>
      )}
    </div>
  );
};
