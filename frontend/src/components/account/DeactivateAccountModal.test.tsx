import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeactivateAccountModal } from './DeactivateAccountModal';

const mockNavigate = vi.fn();
const mockQueryClientClear = vi.fn();
const mockDeactivateAccount = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    clear: mockQueryClientClear,
  }),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    deactivateAccount: mockDeactivateAccount,
  }),
}));

describe('DeactivateAccountModal Component Tests', () => {
  const onClose = vi.fn();
  const onSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <DeactivateAccountModal isOpen={false} onClose={onClose} onSuccess={onSuccess} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders warning description and 30-day grace period consequences when open', () => {
    render(<DeactivateAccountModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Deactivate Account' })).toBeInTheDocument();
    expect(screen.getByText(/30-day grace period/i)).toBeInTheDocument();
    expect(screen.getByText(/Your public profile will be hidden immediately/i)).toBeInTheDocument();
    expect(screen.getByText(/Active inquiries involving your account will be paused/i)).toBeInTheDocument();
    expect(screen.getByText(/You may sign back in at any time within 30 days to reactivate/i)).toBeInTheDocument();
    expect(screen.getByText(/After 30 days without reactivation, your account and personal data will be permanently deleted/i)).toBeInTheDocument();
  });

  it('destructive action is disabled initially', () => {
    render(<DeactivateAccountModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />);

    const deactivateBtn = screen.getByRole('button', { name: /Deactivate Account/i });
    expect(deactivateBtn).toBeDisabled();
  });

  it('incorrect confirmation string remains disabled', async () => {
    const user = userEvent.setup();
    render(<DeactivateAccountModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />);

    const input = screen.getByPlaceholderText('DEACTIVATE');
    const deactivateBtn = screen.getByRole('button', { name: /Deactivate Account/i });

    await user.type(input, 'deactivate');
    expect(deactivateBtn).toBeDisabled();

    await user.clear(input);
    await user.type(input, 'DEACTIVATE ');
    expect(deactivateBtn).toBeDisabled();

    await user.clear(input);
    await user.type(input, 'DELETE');
    expect(deactivateBtn).toBeDisabled();
  });

  it('exact confirmation "DEACTIVATE" enables destructive action', async () => {
    const user = userEvent.setup();
    render(<DeactivateAccountModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />);

    const input = screen.getByPlaceholderText('DEACTIVATE');
    const deactivateBtn = screen.getByRole('button', { name: /Deactivate Account/i });

    await user.type(input, 'DEACTIVATE');
    expect(deactivateBtn).toBeEnabled();
  });

  it('cancel button calls onClose', async () => {
    const user = userEvent.setup();
    render(<DeactivateAccountModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />);

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Escape key triggers onClose', () => {
    render(<DeactivateAccountModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('successful deactivation clears query cache, invokes callbacks, and navigates to /login with accountDeactivated state', async () => {
    const user = userEvent.setup();
    mockDeactivateAccount.mockResolvedValueOnce(undefined);

    render(<DeactivateAccountModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />);

    const input = screen.getByPlaceholderText('DEACTIVATE');
    await user.type(input, 'DEACTIVATE');

    const deactivateBtn = screen.getByRole('button', { name: /Deactivate Account/i });
    await user.click(deactivateBtn);

    await waitFor(() => {
      expect(mockDeactivateAccount).toHaveBeenCalledTimes(1);
      expect(mockQueryClientClear).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/login', {
        replace: true,
        state: { accountDeactivated: true },
      });
    });
  });

  it('loading state disables controls and displays spinner', async () => {
    const user = userEvent.setup();
    let resolveDeactivation: () => void = () => {};
    const deactivatePromise = new Promise<void>((resolve) => {
      resolveDeactivation = resolve;
    });
    mockDeactivateAccount.mockReturnValueOnce(deactivatePromise);

    render(<DeactivateAccountModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />);

    const input = screen.getByPlaceholderText('DEACTIVATE');
    await user.type(input, 'DEACTIVATE');

    const deactivateBtn = screen.getByRole('button', { name: /Deactivate Account/i });
    await user.click(deactivateBtn);

    // Controls should now be disabled
    expect(screen.getByText(/Deactivating Account.../i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('DEACTIVATE')).toBeDisabled();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeDisabled();
    expect(screen.getByLabelText('Close dialog')).toBeDisabled();

    // Escape should not trigger onClose while deactivating
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();

    resolveDeactivation();
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('API/context failure displays error and keeps modal open without navigating', async () => {
    const user = userEvent.setup();
    mockDeactivateAccount.mockRejectedValueOnce(new Error('Server error deactivating account'));

    render(<DeactivateAccountModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />);

    const input = screen.getByPlaceholderText('DEACTIVATE');
    await user.type(input, 'DEACTIVATE');

    const deactivateBtn = screen.getByRole('button', { name: /Deactivate Account/i });
    await user.click(deactivateBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Server error deactivating account');
    });

    expect(mockQueryClientClear).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(deactivateBtn).toBeEnabled();
  });
});
