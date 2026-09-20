import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ErrorState } from '../../components/ui/ErrorState';

describe('ErrorState Primitive', () => {
  it('renders default concise human language message and alert role', () => {
    render(<ErrorState />);

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
    expect(
      screen.getByText(/We encountered an unexpected problem loading this information/i)
    ).toBeInTheDocument();
  });

  it('renders customized user-friendly title and message', () => {
    render(
      <ErrorState
        title="Unable to load creators."
        message="Please check your connection and try again."
      />
    );

    expect(screen.getByText('Unable to load creators.')).toBeInTheDocument();
    expect(screen.getByText('Please check your connection and try again.')).toBeInTheDocument();
  });

  it('renders retry button and fires onRetry callback when clicked', () => {
    const handleRetry = vi.fn();

    render(
      <ErrorState
        onRetry={handleRetry}
        retryLabel="Reload Inquiries"
      />
    );

    const retryBtn = screen.getByRole('button', { name: /Reload Inquiries/i });
    expect(retryBtn).toBeInTheDocument();

    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('supports banner variant layout', () => {
    render(
      <ErrorState
        variant="banner"
        title="Sync Failed"
        message="Changes could not be saved."
      />
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('rounded-xl', 'bg-danger/10');
    expect(screen.getByText('Sync Failed')).toBeInTheDocument();
  });

  it('supports inline variant layout', () => {
    render(
      <ErrorState
        variant="inline"
        title="Inline Failure"
        message="Failed to update field"
      />
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('flex', 'items-center', 'text-danger');
    expect(screen.getByText('Failed to update field')).toBeInTheDocument();
  });

  it('displays loading indicator on retry button when isRetrying is true', () => {
    render(
      <ErrorState
        onRetry={() => {}}
        isRetrying={true}
      />
    );

    const button = screen.getByRole('button', { name: /Try Again/i });
    expect(button).toBeDisabled();
  });
});
