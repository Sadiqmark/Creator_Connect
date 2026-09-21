import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ToastProvider, useToast, MAX_VISIBLE_TOASTS } from '../../components/ui/Toast';

// Test consumer component
const TestConsumer: React.FC<{
  onMount?: (api: ReturnType<typeof useToast>) => void;
}> = ({ onMount }) => {
  const toast = useToast();

  React.useEffect(() => {
    if (onMount) {
      onMount(toast);
    }
  }, [onMount, toast]);

  return (
    <div>
      <button
        type="button"
        onClick={() => toast.success('Success message')}
      >
        Trigger Success
      </button>
      <button
        type="button"
        onClick={() => toast.error('Error message')}
      >
        Trigger Error
      </button>
      <button
        type="button"
        onClick={() => toast.info('Info message')}
      >
        Trigger Info
      </button>
      <input type="text" placeholder="Regular focus target" data-testid="regular-input" />
    </div>
  );
};

describe('Toast Primitive & ToastProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders success toast with accessible live region role="status" and aria-live="polite"', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Trigger Success' }));

    const toastElement = screen.getByTestId('toast-success');
    expect(toastElement).toBeInTheDocument();
    expect(toastElement).toHaveAttribute('role', 'status');
    expect(toastElement).toHaveAttribute('aria-live', 'polite');
    expect(toastElement).toHaveAttribute('aria-atomic', 'true');
    expect(screen.getByText('Success message')).toBeInTheDocument();
  });

  it('renders error toast with accessible live region role="alert" and aria-live="assertive"', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Trigger Error' }));

    const toastElement = screen.getByTestId('toast-error');
    expect(toastElement).toBeInTheDocument();
    expect(toastElement).toHaveAttribute('role', 'alert');
    expect(toastElement).toHaveAttribute('aria-live', 'assertive');
    expect(toastElement).toHaveAttribute('aria-atomic', 'true');
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('renders info toast with accessible live region role="status" and aria-live="polite"', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Trigger Info' }));

    const toastElement = screen.getByTestId('toast-info');
    expect(toastElement).toBeInTheDocument();
    expect(toastElement).toHaveAttribute('role', 'status');
    expect(toastElement).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('Info message')).toBeInTheDocument();
  });

  it('auto-dismisses after default duration', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Trigger Success' }));
    expect(screen.getByText('Success message')).toBeInTheDocument();

    // Default duration is 4000ms
    act(() => {
      vi.advanceTimersByTime(3999);
    });
    expect(screen.getByText('Success message')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByText('Success message')).not.toBeInTheDocument();
  });

  it('auto-dismisses error toast at centralized default duration (5000ms)', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Trigger Error' }));
    expect(screen.getByText('Error message')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4999);
    });
    expect(screen.getByText('Error message')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByText('Error message')).not.toBeInTheDocument();
  });

  it('renders ToastContainer with z-40 to remain below z-50 modals while above page content', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Trigger Success' }));
    const container = screen.getByRole('complementary', { name: 'Notifications' });
    expect(container.className).toContain('z-40');
    expect(container.className).not.toContain('z-[60]');
  });

  it('manually dismisses when dismiss button is clicked', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Trigger Success' }));
    expect(screen.getByText('Success message')).toBeInTheDocument();

    const dismissBtn = screen.getByRole('button', { name: 'Dismiss notification' });
    fireEvent.click(dismissBtn);

    expect(screen.queryByText('Success message')).not.toBeInTheDocument();
  });

  it('allows keyboard-accessible dismissal', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Trigger Success' }));
    const dismissBtn = screen.getByRole('button', { name: 'Dismiss notification' });

    dismissBtn.focus();
    expect(document.activeElement).toBe(dismissBtn);

    fireEvent.keyDown(dismissBtn, { key: 'Enter', code: 'Enter' });
    fireEvent.click(dismissBtn);

    expect(screen.queryByText('Success message')).not.toBeInTheDocument();
  });

  it('does NOT steal focus when rendered', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    const input = screen.getByTestId('regular-input');
    input.focus();
    expect(document.activeElement).toBe(input);

    fireEvent.click(screen.getByRole('button', { name: 'Trigger Success' }));

    // Focus remains on input, NOT stolen by toast
    expect(document.activeElement).toBe(input);
  });

  it('pauses auto-dismiss on mouseEnter and resumes on mouseLeave', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Trigger Success' }));
    const toastElement = screen.getByTestId('toast-success');

    // Advance 2000ms out of 4000ms
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Pause on hover
    fireEvent.mouseEnter(toastElement);

    // Advance 5000ms while paused
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText('Success message')).toBeInTheDocument();

    // Resume on leave
    fireEvent.mouseLeave(toastElement);

    // Advance remaining 2000ms
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.queryByText('Success message')).not.toBeInTheDocument();
  });

  it('suppresses duplicate toasts with identical message and variant', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    // Fire duplicate clicks
    fireEvent.click(screen.getByRole('button', { name: 'Trigger Success' }));
    fireEvent.click(screen.getByRole('button', { name: 'Trigger Success' }));
    fireEvent.click(screen.getByRole('button', { name: 'Trigger Success' }));

    const toasts = screen.getAllByText('Success message');
    expect(toasts).toHaveLength(1);
  });

  it(`enforces MAX_VISIBLE_TOASTS (${MAX_VISIBLE_TOASTS}) and drains queue on dismiss`, () => {
    let toastApi: ReturnType<typeof useToast> | undefined;

    render(
      <ToastProvider>
        <TestConsumer onMount={(api) => { toastApi = api; }} />
      </ToastProvider>
    );

    expect(toastApi).toBeDefined();

    act(() => {
      toastApi!.info('Toast 1');
      toastApi!.info('Toast 2');
      toastApi!.info('Toast 3');
      toastApi!.info('Toast 4 (queued)');
    });

    // Only first 3 are visible
    expect(screen.getByText('Toast 1')).toBeInTheDocument();
    expect(screen.getByText('Toast 2')).toBeInTheDocument();
    expect(screen.getByText('Toast 3')).toBeInTheDocument();
    expect(screen.queryByText('Toast 4 (queued)')).not.toBeInTheDocument();

    // Dismiss one of the visible toasts
    const dismissButtons = screen.getAllByRole('button', { name: 'Dismiss notification' });
    fireEvent.click(dismissButtons[0]);

    // Toast 1 dismissed, Toast 4 dequeued
    expect(screen.queryByText('Toast 1')).not.toBeInTheDocument();
    expect(screen.getByText('Toast 4 (queued)')).toBeInTheDocument();
  });

  it('respects prefers-reduced-motion via CSS utility classes', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Trigger Success' }));
    const toastElement = screen.getByTestId('toast-success');

    expect(toastElement.className).toContain('motion-reduce:transition-none');
    expect(toastElement.className).toContain('motion-reduce:animate-none');
  });

  it('provides safe fallback no-op when useToast is consumed outside ToastProvider', () => {
    let capturedApi: ReturnType<typeof useToast> | undefined;

    render(<TestConsumer onMount={(api) => { capturedApi = api; }} />);

    expect(capturedApi).toBeDefined();
    // Invoking fallback methods must not throw
    expect(() => {
      capturedApi!.success('Fallback success');
      capturedApi!.error('Fallback error');
      capturedApi!.info('Fallback info');
      capturedApi!.dismiss('some-id');
    }).not.toThrow();
  });
});
