import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';

describe('ConfirmationModal Primitive', () => {
  it('does not render when isOpen is false', () => {
    render(
      <ConfirmationModal
        isOpen={false}
        title="Test Modal"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders with dialog semantics and labels when isOpen is true', () => {
    render(
      <ConfirmationModal
        isOpen={true}
        title="Confirm Action"
        description="Are you sure you want to proceed?"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
  });

  it('triggers onConfirm when confirm button is clicked', () => {
    const handleConfirm = vi.fn();
    render(
      <ConfirmationModal
        isOpen={true}
        title="Delete Item"
        confirmText="Confirm Delete"
        onClose={vi.fn()}
        onConfirm={handleConfirm}
      />
    );

    const confirmBtn = screen.getByRole('button', { name: 'Confirm Delete' });
    fireEvent.click(confirmBtn);
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('triggers onClose when cancel button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <ConfirmationModal
        isOpen={true}
        title="Cancel Action"
        cancelText="Nevermind"
        onClose={handleClose}
        onConfirm={vi.fn()}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: 'Nevermind' });
    fireEvent.click(cancelBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('triggers onClose when close icon button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <ConfirmationModal
        isOpen={true}
        title="Close Icon Test"
        onClose={handleClose}
        onConfirm={vi.fn()}
      />
    );

    const closeBtn = screen.getByRole('button', { name: 'Close dialog' });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('handles Escape key to close modal', () => {
    const handleClose = vi.fn();
    render(
      <ConfirmationModal
        isOpen={true}
        title="Escape Key Test"
        onClose={handleClose}
        onConfirm={vi.fn()}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('disables buttons and shows loading text during isLoading state', () => {
    const handleConfirm = vi.fn();
    const handleClose = vi.fn();

    render(
      <ConfirmationModal
        isOpen={true}
        title="Loading Modal"
        isLoading={true}
        loadingText="Saving Changes..."
        onClose={handleClose}
        onConfirm={handleConfirm}
      />
    );

    expect(screen.getByText('Saving Changes...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Saving Changes.../i })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();

    // Escape should not trigger onClose while loading
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('renders error message in an accessible alert container', () => {
    render(
      <ConfirmationModal
        isOpen={true}
        title="Error State Modal"
        errorMessage="Network connection timed out"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    const errorAlert = screen.getByRole('alert');
    expect(errorAlert).toBeInTheDocument();
    expect(screen.getByText('Network connection timed out')).toBeInTheDocument();
  });

  describe('Destructive modal safety behavior', () => {
    it('prevents accidental dismissal on backdrop click for danger variant by default', () => {
      const handleClose = vi.fn();

      render(
        <ConfirmationModal
          isOpen={true}
          variant="danger"
          title="Deactivate Account"
          onClose={handleClose}
          onConfirm={vi.fn()}
        />
      );

      const backdrop = screen.getByRole('dialog');
      fireEvent.click(backdrop);
      expect(handleClose).not.toHaveBeenCalled();
    });

    it('allows closing on backdrop click for default non-destructive variant', () => {
      const handleClose = vi.fn();

      render(
        <ConfirmationModal
          isOpen={true}
          variant="default"
          title="Standard Confirmation"
          onClose={handleClose}
          onConfirm={vi.fn()}
        />
      );

      const backdrop = screen.getByRole('dialog');
      fireEvent.click(backdrop);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('auto-focuses cancel button on danger variant to prevent accidental Enter confirmation', async () => {
      render(
        <ConfirmationModal
          isOpen={true}
          variant="danger"
          title="Destructive Danger Modal"
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />
      );

      const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
      await waitFor(() => {
        expect(cancelBtn).toHaveFocus();
      });
    });
  });
});
