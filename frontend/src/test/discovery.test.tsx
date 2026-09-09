import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CreatorDiscoveryPage } from '../pages/public/CreatorDiscoveryPage';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '@creator-connect/shared';
import * as creatorsApi from '../services/api/creators';
import * as savedCreatorsApi from '../services/api/savedCreators';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../services/api/creators');
vi.mock('../services/api/savedCreators');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Phase 6B Frontend Creator Discovery Page', () => {
  let queryClient: QueryClient;

  const sampleCreators: creatorsApi.CreatorPublicProfile[] = [
    {
      id: 'cp-001',
      name: 'Elena Rostova',
      profilePhotoUrl: 'https://images.example.com/elena.jpg',
      niche: 'Fashion',
      location: 'Milan, Italy',
      bio: 'High-fashion editorial stylist and visual creator.',
      specialties: ['Fashion Styling', 'Photography'],
      instagramUrl: 'https://instagram.com/elenarostova',
      youtubeUrl: null,
    },
    {
      id: 'cp-002',
      name: 'Marco Rossi',
      profilePhotoUrl: null,
      niche: 'Food & Beverage',
      location: 'Rome, Italy',
      bio: 'Artisanal culinary storyteller.',
      specialties: ['Food & Recipes'],
      instagramUrl: null,
      youtubeUrl: 'https://youtube.com/@marcocooks',
    },
  ];

  const samplePagination: creatorsApi.PaginationMeta = {
    page: 1,
    limit: 24,
    total: 2,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  };

  const setAuthRole = (role?: UserRole) => {
    vi.mocked(useAuth).mockReturnValue({
      firebaseUser: role ? ({ uid: 'user_123', email: 'test@example.com' } as any) : null,
      appUser: role
        ? ({
            id: 'u-1',
            email: 'test@example.com',
            role,
            status: 'ACTIVE',
          } as any)
        : null,
      profile: null,
      onboardingCompleted: true,
      status: (role ? 'AUTHENTICATED' : 'UNAUTHENTICATED') as any,
      refreshMe: vi.fn(),
      signOut: vi.fn(),
      error: null,
      signIn: vi.fn(),
      signUp: vi.fn(),
      sendVerificationEmail: vi.fn(),
      reloadUser: vi.fn(),
      sendPasswordReset: vi.fn(),
      provision: vi.fn(),
      clearSessionExpired: vi.fn(),
    } as any);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    vi.mocked(savedCreatorsApi.getSavedCreatorIds).mockResolvedValue([]);
    setAuthRole(undefined); // Default to guest
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/creators']}>
          <CreatorDiscoveryPage />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('renders creators in the discovery grid with safe public fields', async () => {
    vi.mocked(creatorsApi.listCreators).mockResolvedValue({
      creators: sampleCreators,
      pagination: samplePagination,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Elena Rostova')).toBeInTheDocument();
      expect(screen.getByText('Marco Rossi')).toBeInTheDocument();
    });

    expect(screen.getByText('Milan, Italy')).toBeInTheDocument();
    expect(screen.getByText('Rome, Italy')).toBeInTheDocument();
    expect(screen.getAllByText('Fashion').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Food & Beverage').length).toBeGreaterThan(0);

    // Privacy verification: no collaborationEmail
    expect(screen.queryByText(/elena\.private/i)).not.toBeInTheDocument();
  });

  it('renders loading skeleton while query is in flight', () => {
    vi.mocked(creatorsApi.listCreators).mockReturnValue(new Promise(() => {}));

    renderComponent();

    expect(screen.getByLabelText('Loading creators')).toBeInTheDocument();
  });

  it('renders empty state when no creators match filters', async () => {
    vi.mocked(creatorsApi.listCreators).mockResolvedValue({
      creators: [],
      pagination: {
        page: 1,
        limit: 24,
        total: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('No Creators Found')).toBeInTheDocument();
    });
  });

  it('renders error state and retries on Retry click', async () => {
    vi.mocked(creatorsApi.listCreators).mockRejectedValueOnce(new Error('Network error'));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    vi.mocked(creatorsApi.listCreators).mockResolvedValueOnce({
      creators: sampleCreators,
      pagination: samplePagination,
    });

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => {
      expect(screen.getByText('Elena Rostova')).toBeInTheDocument();
    });
  });

  it('triggers search query with debounced input', async () => {
    vi.mocked(creatorsApi.listCreators).mockResolvedValue({
      creators: sampleCreators,
      pagination: samplePagination,
    });

    renderComponent();

    const searchInput = screen.getByPlaceholderText(/Search creators by name/i);
    fireEvent.change(searchInput, { target: { value: 'Elena' } });

    await waitFor(() => {
      expect(creatorsApi.listCreators).toHaveBeenCalledWith(
        expect.objectContaining({
          q: 'Elena',
        })
      );
    });
  });

  it('updates query when niche filter pill is clicked', async () => {
    vi.mocked(creatorsApi.listCreators).mockResolvedValue({
      creators: sampleCreators,
      pagination: samplePagination,
    });

    renderComponent();

    const fashionPill = screen.getByRole('button', { name: 'Fashion' });
    fireEvent.click(fashionPill);

    await waitFor(() => {
      expect(creatorsApi.listCreators).toHaveBeenCalledWith(
        expect.objectContaining({
          niche: 'Fashion',
        })
      );
    });
  });

  it('allows Business to see Save button and toggle save/unsave', async () => {
    setAuthRole(UserRole.BUSINESS);
    vi.mocked(creatorsApi.listCreators).mockResolvedValue({
      creators: sampleCreators,
      pagination: samplePagination,
    });
    vi.mocked(savedCreatorsApi.getSavedCreatorIds).mockResolvedValue(['cp-001']);
    vi.mocked(savedCreatorsApi.unsaveCreator).mockResolvedValue({
      success: true,
      message: 'Unsaved',
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByLabelText('Unsave Elena Rostova')).toBeInTheDocument();
      expect(screen.getByLabelText('Save Marco Rossi')).toBeInTheDocument();
    });

    // Click to unsave Elena
    fireEvent.click(screen.getByLabelText('Unsave Elena Rostova'));

    await waitFor(() => {
      expect(savedCreatorsApi.unsaveCreator).toHaveBeenCalledWith('cp-001');
    });
  });

  it('hides Save button for Creator users', async () => {
    setAuthRole(UserRole.CREATOR);
    vi.mocked(creatorsApi.listCreators).mockResolvedValue({
      creators: sampleCreators,
      pagination: samplePagination,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Elena Rostova')).toBeInTheDocument();
    });

    expect(screen.queryByLabelText(/Save Elena Rostova/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Unsave Elena Rostova/i)).not.toBeInTheDocument();
  });

  it('redirects unauthenticated Guest to login when clicking Save', async () => {
    setAuthRole(undefined); // Guest
    vi.mocked(creatorsApi.listCreators).mockResolvedValue({
      creators: sampleCreators,
      pagination: samplePagination,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByLabelText('Save Elena Rostova')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Save Elena Rostova'));

    expect(mockNavigate).toHaveBeenCalledWith('/login', {
      state: { from: '/creators' },
    });
  });
});
