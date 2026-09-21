import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { OfflineBanner } from '../components/ui/OfflineBanner';
import { queryClient } from '../lib/queryClient';

describe('OfflineBanner Component', () => {
  const originalOnLine = navigator.onLine;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: originalOnLine,
    });
  });

  it('renders nothing when navigator is initially online', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });

    const { container } = render(<OfflineBanner />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders accessible offline banner when navigator is initially offline', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });

    render(<OfflineBanner />);

    const banner = screen.getByRole('status');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveAttribute('aria-live', 'polite');
    expect(banner).toHaveTextContent(/You are currently offline\. Changes cannot be saved until your connection is restored\./i);

    // Verify stacking hierarchy and motion reduction classes
    expect(banner.className).toContain('z-20');
    expect(banner.className).toContain('motion-reduce:transition-none');
  });

  it('displays offline banner when window transitions to offline', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });

    render(<OfflineBanner />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    const banner = screen.getByRole('status');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent(/You are currently offline/i);
  });

  it('revalidates active TanStack queries and shows temporary confirmation on reconnection', async () => {
    const refetchSpy = vi.spyOn(queryClient, 'refetchQueries').mockResolvedValue();

    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });

    render(<OfflineBanner />);
    expect(screen.getByText(/You are currently offline/i)).toBeInTheDocument();

    // Reconnect
    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    // Verify revalidation of active queries
    expect(refetchSpy).toHaveBeenCalledWith({ type: 'active' });

    // Verify "Connection restored" feedback
    expect(screen.getByText(/Connection restored\. Updating\.\.\./i)).toBeInTheDocument();

    // Advance timer past 2500ms dismiss window
    act(() => {
      vi.advanceTimersByTime(2600);
    });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
