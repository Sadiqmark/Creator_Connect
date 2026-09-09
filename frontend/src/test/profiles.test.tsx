import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PublicCreatorProfilePage } from '../pages/public/PublicCreatorProfilePage';
import { CreatorDiscoveryPage } from '../pages/public/CreatorDiscoveryPage';
import { BusinessProfileViewPage } from '../pages/creator/BusinessProfileViewPage';
import { AuthProvider } from '../context/AuthContext';
import * as creatorsApi from '../services/api/creators';
import * as businessesApi from '../services/api/businesses';

// Mock Firebase Client SDK
vi.mock('../config/firebase', () => ({
  auth: { currentUser: null },
  storage: {},
  default: {},
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ currentUser: null })),
  onAuthStateChanged: vi.fn((_auth, callback) => {
    callback(null);
    return vi.fn();
  }),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  sendEmailVerification: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

vi.mock('../services/api/creators');
vi.mock('../services/api/businesses');

describe('Phase 4B Frontend Profiles & Public Views Test Suite', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  describe('1. Public Creator Profile & Privacy Boundary', () => {
    it('renders creator profile for unauthenticated guest and STRICTLY OMITS collaborationEmail', async () => {
      const mockProfile: creatorsApi.CreatorPublicProfile = {
        id: 'creator-123',
        name: 'Elena Rostova',
        profilePhotoUrl: 'https://images.example.com/elena.jpg',
        niche: 'Fashion & Style',
        location: 'Milan, Italy',
        bio: 'Editorial fashion stylist and digital creator.',
        specialties: ['Short-Form Video', 'Editorial Photos'],
        instagramUrl: 'https://instagram.com/elena',
        youtubeUrl: 'https://youtube.com/@elena',
      };

      vi.mocked(creatorsApi.getPublicCreatorProfile).mockResolvedValue(mockProfile);

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/creators/creator-123']}>
            <AuthProvider>
              <Routes>
                <Route path="/creators/:creatorId" element={<PublicCreatorProfilePage />} />
              </Routes>
            </AuthProvider>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Elena Rostova')).toBeInTheDocument();
      });

      expect(screen.getByText('Milan, Italy')).toBeInTheDocument();
      expect(screen.getByText('Fashion & Style')).toBeInTheDocument();
      expect(screen.getByText('Short-Form Video')).toBeInTheDocument();
      expect(screen.getByText('Editorial Photos')).toBeInTheDocument();

      // STRICT PRIVACY CHECK: Collaboration email address must NOT be present in the document
      expect(screen.queryByText(/@/)).toBeNull();
      expect(screen.queryByText(/elena@/i)).toBeNull();
    });

    it('renders 404 state when creator profile is not found', async () => {
      const notFoundError = { statusCode: 404, message: 'Creator profile not found.' };
      vi.mocked(creatorsApi.getPublicCreatorProfile).mockRejectedValue(notFoundError);

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/creators/non-existent']}>
            <AuthProvider>
              <Routes>
                <Route path="/creators/:creatorId" element={<PublicCreatorProfilePage />} />
              </Routes>
            </AuthProvider>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Profile Not Available/i)).toBeInTheDocument();
      });
    });
  });

  describe('2. Public Creator Discovery Page', () => {
    it('allows guest to browse creators without logging in', async () => {
      const mockCreators: creatorsApi.CreatorPublicProfile[] = [
        {
          id: 'c-1',
          name: 'Alex Rivera',
          profilePhotoUrl: null,
          niche: 'Fitness & Health',
          location: 'Austin, TX',
          bio: 'Functional strength trainer and mobility coach.',
          specialties: ['UGC', 'Product Reviews'],
          instagramUrl: 'https://instagram.com/alex',
          youtubeUrl: null,
        },
      ];

      vi.mocked(creatorsApi.listCreators).mockResolvedValue({
        creators: mockCreators,
        pagination: {
          page: 1,
          limit: 24,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/creators']}>
            <AuthProvider>
              <CreatorDiscoveryPage />
            </AuthProvider>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Alex Rivera')).toBeInTheDocument();
      });

      expect(screen.getByText('Austin, TX')).toBeInTheDocument();
      expect(screen.getByText('Connect with Trusted Creators')).toBeInTheDocument();
    });
  });

  describe('3. Public / Creator-Facing Business Profile View', () => {
    it('renders business brand card and STRICTLY OMITS collaborationEmail', async () => {
      const mockBusiness: businessesApi.BusinessPublicProfile = {
        id: 'biz-123',
        userId: 'user-biz',
        businessName: 'Lumina Activewear',
        category: 'Fitness & Wellness',
        description: 'Eco-conscious athletic wear designed for performance.',
        city: 'Denver',
        stateOrProvince: 'CO',
        country: 'USA',
        logoUrl: 'https://images.example.com/lumina.jpg',
        websiteUrl: 'https://luminaactive.com',
        instagramUrl: 'https://instagram.com/luminaactive',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(businessesApi.getPublicBusinessProfile).mockResolvedValue(mockBusiness);

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/businesses/biz-123']}>
            <AuthProvider>
              <Routes>
                <Route path="/businesses/:businessId" element={<BusinessProfileViewPage />} />
              </Routes>
            </AuthProvider>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Lumina Activewear')).toBeInTheDocument();
      });

      expect(screen.getByText('Fitness & Wellness')).toBeInTheDocument();
      expect(screen.getByText(/Denver, CO, USA/)).toBeInTheDocument();
      expect(screen.getByText(/Eco-conscious athletic wear/)).toBeInTheDocument();

      // STRICT PRIVACY CHECK: Collaboration email address must NOT be present in the document
      expect(screen.queryByText(/@/)).toBeNull();
      expect(screen.queryByText(/lumina@/i)).toBeNull();
    });
  });

  describe('4. Creator Profile Page & Discoverability Invariants', () => {
    it('renders creator profile form with binary discoverability and Content Specialties', async () => {
      const mockPrivateProfile: creatorsApi.CreatorPrivateProfile = {
        id: 'cp-001',
        userId: 'u-1',
        name: 'Elena Rostova',
        niche: 'Fashion & Style',
        location: 'Milan, Italy',
        bio: 'Editorial stylist and digital creator.',
        specialties: ['Short-Form Video'],
        instagramUrl: 'https://instagram.com/elena',
        youtubeUrl: null,
        collaborationEmail: 'private-collab@elena.com',
        profilePhotoUrl: null,
        isDiscoverable: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(creatorsApi.getMyCreatorProfile).mockResolvedValue(mockPrivateProfile);

      const { CreatorProfilePage } = await import('../pages/creator/CreatorProfilePage');

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/creator/profile']}>
            <AuthProvider>
              <CreatorProfilePage />
            </AuthProvider>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Edit Creator Profile')).toBeInTheDocument();
      });

      // Binary discoverability banner
      expect(screen.getByText(/Profile Complete — Discoverable/i)).toBeInTheDocument();

      // STRICT Phase 4A decision #1: NO percentage, progress bar, or profile score
      expect(screen.queryByText(/\d+%/)).toBeNull();
      expect(screen.queryByText(/Profile Score/i)).toBeNull();

      // Content Specialties terminology check
      expect(screen.getAllByText(/Content Specialties/i).length).toBeGreaterThan(0);
      expect(screen.queryByText(/Deliverables & Specialties/i)).toBeNull();

      // Private collaboration email is visible to owner
      expect(screen.getByDisplayValue('private-collab@elena.com')).toBeInTheDocument();
    });
  });

  describe('5. Business Profile Page & Privacy', () => {
    it('renders business profile form with private collaboration email', async () => {
      const mockBusinessPrivate: businessesApi.BusinessPrivateProfile = {
        id: 'bp-001',
        userId: 'u-biz',
        businessName: 'Lumina Activewear',
        category: 'Fitness & Wellness',
        description: 'Sustainable activewear brand.',
        city: 'Denver',
        stateOrProvince: 'CO',
        country: 'USA',
        collaborationEmail: 'biz-private@lumina.com',
        logoUrl: null,
        websiteUrl: 'https://lumina.com',
        instagramUrl: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(businessesApi.getMyBusinessProfile).mockResolvedValue(mockBusinessPrivate);

      const { BusinessProfilePage } = await import('../pages/business/BusinessProfilePage');

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/business/profile']}>
            <AuthProvider>
              <BusinessProfilePage />
            </AuthProvider>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Edit Business Profile')).toBeInTheDocument();
      });

      expect(screen.getByDisplayValue('Lumina Activewear')).toBeInTheDocument();
      expect(screen.getByDisplayValue('biz-private@lumina.com')).toBeInTheDocument();
    });
  });

  describe('6. Creator Onboarding (3-Step)', () => {
    it('renders 3-step creator onboarding wizard', async () => {
      const { CreatorOnboardingPage } = await import('../pages/onboarding/CreatorOnboardingPage');

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/onboarding/creator']}>
            <AuthProvider>
              <CreatorOnboardingPage />
            </AuthProvider>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Complete Your Creator Profile')).toBeInTheDocument();
      });

      // Step indicator displays 3 steps
      expect(screen.getByText('Basics')).toBeInTheDocument();
      expect(screen.getByText('Socials & Contact')).toBeInTheDocument();
      expect(screen.getByText('Bio & Content Specialties')).toBeInTheDocument();

      // Step 1 fields
      expect(screen.getByText(/Creator Name or Handle/i)).toBeInTheDocument();
      expect(screen.getByText(/Primary Niche/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Continue/i })).toBeInTheDocument();
    });
  });

  describe('7. Business Onboarding (Single Form)', () => {
    it('renders business onboarding form with required inputs', async () => {
      const { BusinessOnboardingPage } = await import('../pages/onboarding/BusinessOnboardingPage');

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/onboarding/business']}>
            <AuthProvider>
              <BusinessOnboardingPage />
            </AuthProvider>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Set Up Your Business Profile')).toBeInTheDocument();
      });

      expect(screen.getByText(/Brand \/ Business Name/i)).toBeInTheDocument();
      expect(screen.getByText(/Industry Category/i)).toBeInTheDocument();
      expect(screen.getByText(/Brand Overview/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Enter Brand Workspace/i })).toBeInTheDocument();
    });
  });
});
