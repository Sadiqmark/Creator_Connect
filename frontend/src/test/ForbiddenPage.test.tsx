import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ForbiddenPage } from '../pages/ForbiddenPage';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '@creator-connect/shared';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('ForbiddenPage (403)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Sign In link to /login for unauthenticated users', () => {
    (useAuth as any).mockReturnValue({
      appUser: null,
      status: 'UNAUTHENTICATED',
    });

    render(
      <MemoryRouter>
        <ForbiddenPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: /Access Denied \(403\)/i })).toBeInTheDocument();
    expect(screen.getByText(/You do not have permission to view or access this resource/i)).toBeInTheDocument();

    const link = screen.getByRole('link', { name: /Sign In/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/login');
  });

  it('renders Return to Workspace link to /creator/dashboard for authenticated Creator', () => {
    (useAuth as any).mockReturnValue({
      appUser: { id: 'c1', role: UserRole.CREATOR },
      status: 'AUTHENTICATED',
    });

    render(
      <MemoryRouter>
        <ForbiddenPage />
      </MemoryRouter>
    );

    const link = screen.getByRole('link', { name: /Return to Workspace/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/creator/dashboard');
  });

  it('renders Return to Workspace link to /business/dashboard for authenticated Business', () => {
    (useAuth as any).mockReturnValue({
      appUser: { id: 'b1', role: UserRole.BUSINESS },
      status: 'AUTHENTICATED',
    });

    render(
      <MemoryRouter>
        <ForbiddenPage />
      </MemoryRouter>
    );

    const link = screen.getByRole('link', { name: /Return to Workspace/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/business/dashboard');
  });
});
