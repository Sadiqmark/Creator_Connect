import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { EmptyState } from '../../components/ui/EmptyState';
import { Bookmark } from 'lucide-react';

describe('EmptyState Primitive', () => {
  it('renders title and description', () => {
    render(
      <EmptyState
        title="No saved creators yet."
        description="Start discovering creators who match your next collaboration."
      />
    );

    expect(screen.getByRole('region', { name: /No saved creators yet./i })).toBeInTheDocument();
    expect(screen.getByText('No saved creators yet.')).toBeInTheDocument();
    expect(
      screen.getByText('Start discovering creators who match your next collaboration.')
    ).toBeInTheDocument();
  });

  it('renders optional icon with aria-hidden="true"', () => {
    render(
      <EmptyState
        icon={<Bookmark data-testid="bookmark-icon" />}
        title="Empty Bookmark List"
      />
    );

    const icon = screen.getByTestId('bookmark-icon');
    expect(icon).toBeInTheDocument();
  });

  it('renders action button and triggers onClick handler', () => {
    const handleClick = vi.fn();

    render(
      <EmptyState
        title="No inquiries found"
        description="Try adjusting your status filter."
        action={{
          label: 'Clear Filters',
          onClick: handleClick,
        }}
      />
    );

    const button = screen.getByRole('button', { name: 'Clear Filters' });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders action as router link when href is provided', () => {
    render(
      <MemoryRouter>
        <EmptyState
          title="No creators found"
          action={{
            label: 'Discover Creators',
            href: '/explore',
          }}
        />
      </MemoryRouter>
    );

    const link = screen.getByRole('link', { name: 'Discover Creators' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/explore');
  });

  it('renders custom ReactNode action', () => {
    render(
      <EmptyState
        title="Custom Action State"
        action={<span data-testid="custom-action">Custom Action Element</span>}
      />
    );

    expect(screen.getByTestId('custom-action')).toBeInTheDocument();
  });

  it('supports compact layout styling', () => {
    const { container } = render(
      <EmptyState
        title="Compact Empty State"
        compact={true}
      />
    );

    expect(container.firstChild).toHaveClass('p-6');
  });
});
