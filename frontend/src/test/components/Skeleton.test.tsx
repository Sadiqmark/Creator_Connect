import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonRow,
} from '../../components/ui/Skeleton';

describe('Skeleton Primitive & Layout Components', () => {
  it('renders base skeleton as decorative by default to avoid screen-reader spam', () => {
    render(<Skeleton data-testid="base-skeleton" />);
    const el = screen.getByTestId('base-skeleton');

    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute('aria-hidden', 'true');
    expect(el).not.toHaveAttribute('role');
    expect(el).toHaveClass('animate-pulse', 'bg-surface-muted', 'rounded-xl');
  });

  it('exposes accessible status semantics when aria-label is explicitly provided on standalone skeleton', () => {
    render(<Skeleton data-testid="standalone-skeleton" aria-label="Loading profile photo..." />);
    const el = screen.getByTestId('standalone-skeleton');

    expect(el).toHaveAttribute('role', 'status');
    expect(el).toHaveAttribute('aria-busy', 'true');
    expect(el).toHaveAttribute('aria-label', 'Loading profile photo...');
    expect(el).not.toHaveAttribute('aria-hidden');
  });

  it('renders circular variant for avatars or rounded elements', () => {
    render(<Skeleton variant="circular" data-testid="circular-skeleton" />);
    const el = screen.getByTestId('circular-skeleton');
    expect(el).toHaveClass('rounded-full');
  });

  it('renders text variant with appropriate height and radius', () => {
    render(<Skeleton variant="text" data-testid="text-skeleton" />);
    const el = screen.getByTestId('text-skeleton');
    expect(el).toHaveClass('h-4', 'rounded-md');
  });

  it('renders SkeletonText with single status region and variable line widths', () => {
    render(<SkeletonText lines={4} className="custom-text-skeleton" />);
    const container = screen.getByRole('status', { name: /Loading text.../i });
    expect(container).toBeInTheDocument();
    expect(container).toHaveAttribute('aria-busy', 'true');
    expect(container.children.length).toBe(4);
    // Children decorative lines
    expect(container.children[0]).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders SkeletonAvatar with requested sizes', () => {
    const { rerender } = render(<SkeletonAvatar size="sm" data-testid="avatar-skeleton" />);
    expect(screen.getByTestId('avatar-skeleton')).toHaveClass('w-8', 'h-8');

    rerender(<SkeletonAvatar size="lg" data-testid="avatar-skeleton" />);
    expect(screen.getByTestId('avatar-skeleton')).toHaveClass('w-14', 'h-14');
  });

  it('renders SkeletonCard with structure and accessible semantics', () => {
    render(<SkeletonCard data-testid="skeleton-card" />);
    const card = screen.getByTestId('skeleton-card');
    expect(card).toBeInTheDocument();
    expect(card).toHaveAttribute('role', 'status');
    expect(card).toHaveAttribute('aria-busy', 'true');
    expect(card).toHaveClass('bg-surface', 'border', 'border-border', 'rounded-2xl');
  });

  it('renders SkeletonRow matching inquiry/activity list item format', () => {
    render(<SkeletonRow data-testid="skeleton-row" />);
    const row = screen.getByTestId('skeleton-row');
    expect(row).toBeInTheDocument();
    expect(row).toHaveAttribute('role', 'status');
    expect(row).toHaveAttribute('aria-busy', 'true');
    expect(row).toHaveClass('bg-surface', 'border', 'border-border', 'rounded-xl');
  });
});
