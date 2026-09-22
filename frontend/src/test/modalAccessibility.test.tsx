import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

import { InquiryFormModal } from '../components/inquiry/InquiryFormModal';
import { SessionExpiredModal } from '../pages/auth/SessionExpiredModal';
import { DeactivateAccountModal } from '../components/account/DeactivateAccountModal';
import { ToastProvider } from '../components/ui/Toast';

// Mocks
const mockNavigate = vi.fn();
const mockClearSessionExpired = vi.fn();
const mockDeactivateAccount = vi.fn();
const mockQueryClientClear = vi.fn();

let mockAuthStatus = 'AUTHENTICATED';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    status: mockAuthStatus,
    clearSessionExpired: mockClearSessionExpired,
    deactivateAccount: mockDeactivateAccount,
  }),
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: () => ({
      clear: mockQueryClientClear,
      invalidateQueries: vi.fn(),
    }),
  };
});

vi.mock('../services/api/inquiries', () => ({
  createInquiry: vi.fn(),
}));

describe('Phase 18 Part 1 — Modal & Dialog Accessibility Hardening', () => {
  let queryClient: QueryClient;

  const mockCreator = {
    id: 'cp-001',
    name: 'Elena Rostova',
    profilePhotoUrl: 'https://images.example.com/elena.jpg',
    niche: 'Fashion & Style',
    location: 'Milan, Italy',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthStatus = 'AUTHENTICATED';
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // PART 1A — InquiryFormModal
  // ============================================================================
  describe('InquiryFormModal Accessibility', () => {
    const renderInquiryModal = (props: Partial<React.ComponentProps<typeof InquiryFormModal>> = {}) => {
      return render(
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <InquiryFormModal
              creator={mockCreator}
              isOpen={true}
              onClose={vi.fn()}
              {...props}
            />
          </ToastProvider>
        </QueryClientProvider>
      );
    };

    it('1. renders as dialog with aria-modal="true" and accessible title', () => {
      renderInquiryModal();

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');

      const heading = screen.getByRole('heading', { name: /Send Inquiry to Elena Rostova/i });
      expect(heading).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-labelledby', heading.id);
    });

    it('2. closes on Escape when not mutating', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderInquiryModal({ onClose });

      await user.keyboard('{Escape}');
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('3. moves initial focus inside modal without stealing focus if already within', async () => {
      renderInquiryModal();

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog.contains(document.activeElement)).toBe(true);
      });
    });

    it('4. traps keyboard focus: Tab wraps from last element to first element', async () => {
      const user = userEvent.setup();
      renderInquiryModal();

      const closeBtn = screen.getByRole('button', { name: /Close dialog/i });
      const submitBtn = screen.getByRole('button', { name: /Send Inquiry/i });

      // Focus the last interactive element
      submitBtn.focus();
      expect(document.activeElement).toBe(submitBtn);

      // Tab should wrap to the first interactive element (close button)
      await user.tab();
      expect(document.activeElement).toBe(closeBtn);
    });

    it('5. traps keyboard focus: Shift+Tab wraps from first element to last element', async () => {
      const user = userEvent.setup();
      renderInquiryModal();

      const closeBtn = screen.getByRole('button', { name: /Close dialog/i });
      const submitBtn = screen.getByRole('button', { name: /Send Inquiry/i });

      // Focus the first interactive element
      closeBtn.focus();
      expect(document.activeElement).toBe(closeBtn);

      // Shift+Tab should wrap to the last interactive element (submit button)
      await user.tab({ shift: true });
      expect(document.activeElement).toBe(submitBtn);
    });

    it('6. restores focus to opener element when modal closes', async () => {
      const user = userEvent.setup();

      const TestHarness = () => {
        const [open, setOpen] = useState(false);
        return (
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <button id="inquiry-opener-btn" onClick={() => setOpen(true)}>
                Open Inquiry Modal
              </button>
              {open && (
                <InquiryFormModal
                  creator={mockCreator}
                  isOpen={open}
                  onClose={() => setOpen(false)}
                />
              )}
            </ToastProvider>
          </QueryClientProvider>
        );
      };

      render(<TestHarness />);

      const openerBtn = screen.getByRole('button', { name: /Open Inquiry Modal/i });
      openerBtn.focus();
      expect(document.activeElement).toBe(openerBtn);

      await user.click(openerBtn);
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Press Escape to dismiss
      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(document.activeElement).toBe(openerBtn);
      });
    });

    it('7. platform radio options expose visible focus via focus-within on label card', () => {
      renderInquiryModal();

      const radioGroup = screen.getByRole('radiogroup');
      expect(radioGroup).toBeInTheDocument();
      expect(radioGroup).toHaveAttribute('aria-labelledby', 'platformSelect-label');

      const instagramRadio = screen.getByRole('radio', { name: 'Instagram' });
      expect(instagramRadio).toHaveClass('sr-only');

      const parentLabel = instagramRadio.closest('label');
      expect(parentLabel).toHaveClass('focus-within:ring-2');
      expect(parentLabel).toHaveClass('focus-within:ring-accent');
    });

    it('8. associates validation errors programmatically with aria-invalid and aria-describedby', async () => {
      const user = userEvent.setup();
      renderInquiryModal();

      const collabInput = screen.getByPlaceholderText(/Sponsored Instagram Reel/i);
      const deliverablesInput = screen.getByPlaceholderText(/01 1 Dedicated 60s Reel/i);
      const briefInput = screen.getByPlaceholderText(/Describe your brand goals/i);

      // Initially valid: aria-invalid should not be true, aria-describedby should not point to error
      expect(collabInput).not.toHaveAttribute('aria-invalid');
      expect(collabInput).not.toHaveAttribute('aria-describedby');

      // Submit empty form to trigger validation
      const submitBtn = screen.getByRole('button', { name: /Send Inquiry/i });
      await user.click(submitBtn);

      // Collaboration Type error
      await waitFor(() => {
        expect(collabInput).toHaveAttribute('aria-invalid', 'true');
        expect(collabInput).toHaveAttribute('aria-describedby', 'collaborationType-error');
        const collabError = document.getElementById('collaborationType-error');
        expect(collabError).toBeInTheDocument();
        expect(collabError).toHaveAttribute('role', 'alert');
      });

      // Deliverables error
      expect(deliverablesInput).toHaveAttribute('aria-invalid', 'true');
      expect(deliverablesInput).toHaveAttribute('aria-describedby', 'deliverables-error');
      const deliverablesError = document.getElementById('deliverables-error');
      expect(deliverablesError).toBeInTheDocument();
      expect(deliverablesError).toHaveAttribute('role', 'alert');

      // Brief error
      expect(briefInput).toHaveAttribute('aria-invalid', 'true');
      expect(briefInput).toHaveAttribute('aria-describedby', 'brief-error');
      const briefError = document.getElementById('brief-error');
      expect(briefError).toBeInTheDocument();
      expect(briefError).toHaveAttribute('role', 'alert');
    });

    it('9. clears aria-invalid and aria-describedby when field is corrected', async () => {
      const user = userEvent.setup();
      renderInquiryModal();

      const collabInput = screen.getByPlaceholderText(/Sponsored Instagram Reel/i);
      const submitBtn = screen.getByRole('button', { name: /Send Inquiry/i });

      await user.click(submitBtn);

      await waitFor(() => {
        expect(collabInput).toHaveAttribute('aria-invalid', 'true');
      });

      // Click preset to populate collaboration type
      const presetBtn = screen.getByRole('button', { name: /\+ Sponsored Reel/i });
      await user.click(presetBtn);

      await waitFor(() => {
        expect(collabInput).not.toHaveAttribute('aria-invalid');
        expect(collabInput).not.toHaveAttribute('aria-describedby');
        expect(document.getElementById('collaborationType-error')).toBeNull();
      });
    });
  });

  // ============================================================================
  // PART 1B — SessionExpiredModal
  // ============================================================================
  describe('SessionExpiredModal Accessibility', () => {
    it('1. does not render when status is not SESSION_EXPIRED', () => {
      mockAuthStatus = 'AUTHENTICATED';
      render(
        <MemoryRouter>
          <SessionExpiredModal />
        </MemoryRouter>
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('2. renders as dialog with aria-modal="true" and accessible title and description', () => {
      mockAuthStatus = 'SESSION_EXPIRED';
      render(
        <MemoryRouter>
          <SessionExpiredModal />
        </MemoryRouter>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'session-expired-title');
      expect(dialog).toHaveAttribute('aria-describedby', 'session-expired-description');

      expect(screen.getByRole('heading', { level: 2, name: 'Session Expired' })).toBeInTheDocument();
      expect(screen.getByText(/Your authenticated session has ended for security/i)).toBeInTheDocument();
    });

    it('3. places initial focus on the primary action "Sign In Again"', async () => {
      mockAuthStatus = 'SESSION_EXPIRED';
      render(
        <MemoryRouter>
          <SessionExpiredModal />
        </MemoryRouter>
      );

      const signInBtn = screen.getByRole('button', { name: /Sign In Again/i });
      await waitFor(() => {
        expect(signInBtn).toHaveFocus();
      });
    });

    it('4. traps Tab and Shift+Tab keyboard focus within the dialog and prevents background leakage', async () => {
      const user = userEvent.setup();
      mockAuthStatus = 'SESSION_EXPIRED';
      render(
        <MemoryRouter>
          <div>
            <button id="background-page-btn">Background Control</button>
            <SessionExpiredModal />
          </div>
        </MemoryRouter>
      );

      const backgroundBtn = screen.getByRole('button', { name: /Background Control/i });
      const signInBtn = screen.getByRole('button', { name: /Sign In Again/i });

      await waitFor(() => {
        expect(signInBtn).toHaveFocus();
      });

      // Tabbing from the modal button keeps focus trapped on that button and never reaches background
      await user.tab();
      expect(document.activeElement).toBe(signInBtn);
      expect(document.activeElement).not.toBe(backgroundBtn);

      // Shift+Tabbing also keeps focus on the modal button and never reaches background
      await user.tab({ shift: true });
      expect(document.activeElement).toBe(signInBtn);
      expect(document.activeElement).not.toBe(backgroundBtn);
    });

    it('5. Escape does NOT dismiss the blocking session expired modal or leak focus', async () => {
      const user = userEvent.setup();
      mockAuthStatus = 'SESSION_EXPIRED';
      render(
        <MemoryRouter>
          <SessionExpiredModal />
        </MemoryRouter>
      );

      const dialog = screen.getByRole('dialog');
      const signInBtn = screen.getByRole('button', { name: /Sign In Again/i });
      signInBtn.focus();

      await user.keyboard('{Escape}');

      // Modal must stay open
      expect(dialog).toBeInTheDocument();
      expect(mockClearSessionExpired).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('6. primary action button clicks navigate to /login and clear session state', async () => {
      const user = userEvent.setup();
      mockAuthStatus = 'SESSION_EXPIRED';
      render(
        <MemoryRouter>
          <SessionExpiredModal />
        </MemoryRouter>
      );

      const signInBtn = screen.getByRole('button', { name: /Sign In Again/i });
      await user.click(signInBtn);

      expect(mockClearSessionExpired).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  // ============================================================================
  // PART 1C — DeactivateAccountModal
  // ============================================================================
  describe('DeactivateAccountModal Accessibility', () => {
    it('1. renders with correct dialog semantics and accessible descriptions', () => {
      render(<DeactivateAccountModal isOpen={true} onClose={vi.fn()} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'deactivate-account-modal-title');
      expect(dialog).toHaveAttribute('aria-describedby', 'deactivate-account-modal-description');
    });

    it('2. traps focus: Tab wraps from Deactivate button to Close button', async () => {
      const user = userEvent.setup();
      render(<DeactivateAccountModal isOpen={true} onClose={vi.fn()} />);

      const closeBtn = screen.getByRole('button', { name: /Close dialog/i });
      const input = screen.getByPlaceholderText('DEACTIVATE');
      await user.type(input, 'DEACTIVATE');

      const deactivateBtn = screen.getByRole('button', { name: /Deactivate Account/i });
      expect(deactivateBtn).toBeEnabled();

      deactivateBtn.focus();
      expect(document.activeElement).toBe(deactivateBtn);

      // Tab wraps from last interactive element to first
      await user.tab();
      expect(document.activeElement).toBe(closeBtn);
    });

    it('3. traps focus: Shift+Tab wraps from Close button to last enabled button', async () => {
      const user = userEvent.setup();
      render(<DeactivateAccountModal isOpen={true} onClose={vi.fn()} />);

      const closeBtn = screen.getByRole('button', { name: /Close dialog/i });
      const cancelBtn = screen.getByRole('button', { name: /Cancel/i });

      closeBtn.focus();
      expect(document.activeElement).toBe(closeBtn);

      // When Deactivate is disabled, Cancel is the last focusable element
      await user.tab({ shift: true });
      expect(document.activeElement).toBe(cancelBtn);
    });

    it('4. restores focus to opener element when modal closes', async () => {
      const user = userEvent.setup();

      const TestHarness = () => {
        const [open, setOpen] = useState(false);
        return (
          <div>
            <button id="deactivate-opener-btn" onClick={() => setOpen(true)}>
              Open Deactivate Modal
            </button>
            {open && (
              <DeactivateAccountModal
                isOpen={open}
                onClose={() => setOpen(false)}
              />
            )}
          </div>
        );
      };

      render(<TestHarness />);

      const openerBtn = screen.getByRole('button', { name: /Open Deactivate Modal/i });
      openerBtn.focus();
      expect(document.activeElement).toBe(openerBtn);

      await user.click(openerBtn);
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Press Escape to close
      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(document.activeElement).toBe(openerBtn);
      });
    });

    it('5. close button has accessible label and comfortable touch padding', () => {
      render(<DeactivateAccountModal isOpen={true} onClose={vi.fn()} />);

      const closeBtn = screen.getByRole('button', { name: /Close dialog/i });
      expect(closeBtn).toBeInTheDocument();
      expect(closeBtn).toHaveClass('p-2');
    });
  });
});
