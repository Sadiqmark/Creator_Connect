import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SavedCreatorsPage } from '../pages/business/SavedCreatorsPage';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '@creator-connect/shared';
import * as savedCreatorsApi from '../services/api/savedCreators';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../services/api/savedCreators');

describe('Phase 6B Frontend Business Saved Creators Page', () => {
  let queryClient: QueryClient;

  const sampleSavedList: savedCreatorsApi.SavedCreatorItem[] = [
    {
      id: 'sc-101',
      savedAt: '2026-02-01T10:00:00Z',
      creator: {
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
    },
  ];

  const samplePagination = {
    page: 1,
    limit: 24,
    total: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
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

    vi.mocked(useAuth).mockReturnValue({
      firebaseUser: { uid: 'biz_uid_1', email: 'business@example.com' } as any,
      appUser: {
        id: 'u-biz-1',
        email: 'business@example.com',
        role: UserRole.BUSINESS,
        status: 'ACTIVE',
      } as any,
      profile: null,
      onboardingCompleted: true,
      status: 'AUTHENTICATED' as any,
      refreshMe: vi.fn(),
      error: null,
      signIn: vi.fn(),
      signUp: vi.fn(),
      sendVerificationEmail: vi.fn(),
      reloadUser: vi.fn(),
      sendPasswordReset: vi.fn(),
      provision: vi.fn(),
      clearSessionExpired: vi.fn(),
    } as any);
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/business/saved-creators']}>
          <SavedCreatorsPage />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('renders saved creators list with creator details and unsave action', async () => {
    vi.mocked(savedCreatorsApi.listSavedCreators).mockResolvedValue({
      savedCreators: sampleSavedList,
      pagination: samplePagination,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Elena Rostova')).toBeInTheDocument();
      expect(screen.getByText('Milan, Italy')).toBeInTheDocument();
      expect(screen.getByText('Fashion')).toBeInTheDocument();
      expect(screen.getByLabelText('Unsave Elena Rostova')).toBeInTheDocument();
    });

    // Privacy check: no collaborationEmail rendered
    expect(screen.queryByText(/@agency\.com/i)).not.toBeInTheDocument();
  });

  it('allows unsaving a creator and triggers API call', async () => {
    vi.mocked(savedCreatorsApi.listSavedCreators).mockResolvedValue({
      savedCreators: sampleSavedList,
      pagination: samplePagination,
    });
    vi.mocked(savedCreatorsApi.unsaveCreator).mockResolvedValue({
      success: true,
      message: 'Creator unsaved',
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByLabelText('Unsave Elena Rostova')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Unsave Elena Rostova'));

    await waitFor(() => {
      expect(savedCreatorsApi.unsaveCreator).toHaveBeenCalledWith('cp-001');
    });
  });

  it('renders empty state when there are no saved creators', async () => {
    vi.mocked(savedCreatorsApi.listSavedCreators).mockResolvedValue({
      savedCreators: [],
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
      expect(screen.getByText('No saved creators yet.')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /discover creators/i })).toBeInTheDocument();
    });
  });
});
