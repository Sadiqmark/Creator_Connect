import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ToastProvider } from '../components/ui/Toast';
import { UserRole } from '@creator-connect/shared';

// API mocks
import * as savedCreatorsApi from '../services/api/savedCreators';
import * as creatorsApi from '../services/api/creators';
import * as businessesApi from '../services/api/businesses';
import * as inquiriesApi from '../services/api/inquiries';
import { useAuth } from '../context/AuthContext';

// Pages and components under test
import { SavedCreatorsPage } from '../pages/business/SavedCreatorsPage';
import { CreatorProfilePage } from '../pages/creator/CreatorProfilePage';
import { BusinessProfilePage } from '../pages/business/BusinessProfilePage';
import { InquiryFormModal } from '../components/inquiry/InquiryFormModal';
import { CreatorInquiryDetailPage } from '../pages/creator/CreatorInquiryDetailPage';
import { CreatorDashboard } from '../pages/dashboards/CreatorDashboard';
import { BusinessDashboard } from '../pages/dashboards/BusinessDashboard';

vi.mock('../services/api/savedCreators');
vi.mock('../services/api/creators');
vi.mock('../services/api/businesses');
vi.mock('../services/api/inquiries');
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('Phase 16 Part 3 — Toast Mutation Feedback Integration Suite', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.mocked(useAuth).mockReturnValue({
      firebaseUser: { uid: 'test-uid' } as any,
      appUser: {
        id: 'u-1',
        email: 'test@example.com',
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
      signOut: vi.fn(),
      sendVerificationEmail: vi.fn(),
      reloadUser: vi.fn(),
      sendPasswordReset: vi.fn(),
      provision: vi.fn(),
      reactivateAccount: vi.fn(),
      deactivateAccount: vi.fn(),
      clearSessionExpired: vi.fn(),
    });
  });

  const renderWithProviders = (ui: React.ReactElement, initialEntries = ['/']) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MemoryRouter initialEntries={initialEntries}>
            {ui}
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    );
  };

  describe('1. Bookmark Success & Failure Toasts', () => {
    const sampleSavedCreator: savedCreatorsApi.SavedCreatorItem = {
      id: 'sc-1',
      savedAt: new Date().toISOString(),
      creator: {
        id: 'cp-001',
        name: 'Elena Rostova',
        profilePhotoUrl: null,
        niche: 'Fashion & Style',
        location: 'Milan, Italy',
        bio: 'Fashion creator bio here.',
        specialties: ['Styling'],
        instagramUrl: 'https://instagram.com/elena',
        youtubeUrl: null,
      },
    };

    it('shows "Creator removed from saved" toast on successful unsave', async () => {
      vi.mocked(savedCreatorsApi.listSavedCreators).mockResolvedValue({
        savedCreators: [sampleSavedCreator],
        pagination: { page: 1, limit: 24, total: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false },
      });
      vi.mocked(savedCreatorsApi.unsaveCreator).mockResolvedValue({ success: true, message: 'Unsaved' });

      renderWithProviders(<SavedCreatorsPage />, ['/business/saved-creators']);

      await waitFor(() => {
        expect(screen.getByText('Elena Rostova')).toBeInTheDocument();
      });

      const unsaveBtn = screen.getByLabelText('Unsave Elena Rostova');
      fireEvent.click(unsaveBtn);

      await waitFor(() => {
        expect(screen.getByText('Creator removed from saved')).toBeInTheDocument();
      });
    });

    it('shows "Failed to update saved creator. Please try again." error toast on bookmark mutation failure', async () => {
      vi.mocked(savedCreatorsApi.listSavedCreators).mockResolvedValue({
        savedCreators: [sampleSavedCreator],
        pagination: { page: 1, limit: 24, total: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false },
      });
      vi.mocked(savedCreatorsApi.unsaveCreator).mockRejectedValue(new Error('Network failure'));

      renderWithProviders(<SavedCreatorsPage />, ['/business/saved-creators']);

      await waitFor(() => {
        expect(screen.getByText('Elena Rostova')).toBeInTheDocument();
      });

      const unsaveBtn = screen.getByLabelText('Unsave Elena Rostova');
      fireEvent.click(unsaveBtn);

      await waitFor(() => {
        expect(
          screen.getByText('Failed to update saved creator. Please try again.')
        ).toBeInTheDocument();
      });
    });
  });

  describe('2. Profile Save Toasts', () => {
    it('shows "Profile updated successfully" toast on creator profile update', async () => {
      vi.mocked(useAuth).mockReturnValue({
        firebaseUser: { uid: 'creator-uid' } as any,
        appUser: { id: 'u-c1', email: 'creator@example.com', role: UserRole.CREATOR, status: 'ACTIVE' } as any,
        profile: null,
        onboardingCompleted: true,
        status: 'AUTHENTICATED' as any,
        refreshMe: vi.fn(),
        error: null,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        sendVerificationEmail: vi.fn(),
        reloadUser: vi.fn(),
        sendPasswordReset: vi.fn(),
        provision: vi.fn(),
        reactivateAccount: vi.fn(),
        deactivateAccount: vi.fn(),
        clearSessionExpired: vi.fn(),
      });

      const mockCreatorProfile: creatorsApi.CreatorPrivateProfile = {
        id: 'cp-001',
        userId: 'u-c1',
        name: 'Alex Rivera',
        niche: 'Fashion & Style',
        location: 'Milan, Italy',
        bio: 'Editorial stylist and visual creator bio.',
        specialties: ['Styling'],
        profilePhotoUrl: 'https://images.example.com/alex.jpg',
        instagramUrl: 'https://instagram.com/alex',
        youtubeUrl: null,
        collaborationEmail: 'alex@example.com',
        isDiscoverable: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(creatorsApi.getMyCreatorProfile).mockResolvedValue(mockCreatorProfile);
      vi.mocked(creatorsApi.updateMyCreatorProfile).mockResolvedValue(mockCreatorProfile);

      renderWithProviders(<CreatorProfilePage />, ['/creator/profile']);

      await waitFor(() => {
        expect(screen.getByText('Edit Creator Profile')).toBeInTheDocument();
      });

      const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.getByText('Profile updated successfully')).toBeInTheDocument();
      });

      // Confirm no disruptive inline success alert
      expect(screen.queryByText(/Profile successfully saved and updated!/i)).not.toBeInTheDocument();
    });

    it('shows "Brand profile updated successfully" toast on business profile update', async () => {
      const mockBusinessProfile: businessesApi.BusinessPrivateProfile = {
        id: 'bp-001',
        userId: 'u-1',
        businessName: 'Lumina Activewear',
        category: 'Fitness & Wellness',
        description: 'Sustainable athletic apparel brand overview with proper length.',
        city: 'Denver',
        stateOrProvince: 'CO',
        country: 'USA',
        collaborationEmail: 'biz@lumina.com',
        logoUrl: null,
        websiteUrl: 'https://lumina.com',
        instagramUrl: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(businessesApi.getMyBusinessProfile).mockResolvedValue(mockBusinessProfile);
      vi.mocked(businessesApi.updateMyBusinessProfile).mockResolvedValue(mockBusinessProfile);

      renderWithProviders(<BusinessProfilePage />, ['/business/profile']);

      await waitFor(() => {
        expect(screen.getByText('Edit Business Profile')).toBeInTheDocument();
      });

      const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.getByText('Brand profile updated successfully')).toBeInTheDocument();
      });

      // Confirm no disruptive inline success alert
      expect(screen.queryByText(/Business profile successfully saved and updated!/i)).not.toBeInTheDocument();
    });
  });

  describe('3. Inquiry Submission Toast', () => {
    it('shows "Collaboration proposal sent successfully" toast and closes modal immediately on submission', async () => {
      const mockCreator = {
        id: 'cp-001',
        name: 'Elena Rostova',
        profilePhotoUrl: null,
        niche: 'Fashion & Style',
        location: 'Milan, Italy',
      };

      const mockInquiryRes = {
        id: 'inq-001',
        creatorId: 'cp-001',
        businessId: 'bp-001',
        status: 'PENDING' as const,
        collaborationType: 'Sponsored Instagram Reel',
        platform: 'Instagram',
        deliverables: '1 Reel + 3 Stories',
        brief: 'Test brief with valid description details.',
        timelineStart: null,
        timelineEnd: null,
        additionalRequirements: null,
        respondedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      };

      vi.mocked(inquiriesApi.createInquiry).mockResolvedValue({ inquiry: mockInquiryRes });

      const onCloseMock = vi.fn();
      const onSuccessMock = vi.fn();

      renderWithProviders(
        <InquiryFormModal
          creator={mockCreator}
          isOpen={true}
          onClose={onCloseMock}
          onSuccess={onSuccessMock}
        />
      );

      fireEvent.change(screen.getByLabelText(/Collaboration Type/i), {
        target: { value: 'Sponsored Instagram Reel' },
      });
      fireEvent.change(screen.getByLabelText(/Expected Deliverables/i), {
        target: { value: '1 Reel + 3 Stories' },
      });
      fireEvent.change(screen.getByLabelText(/Collaboration Brief/i), {
        target: { value: 'Test brief with valid description details.' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Send Inquiry/i }));

      await waitFor(() => {
        expect(inquiriesApi.createInquiry).toHaveBeenCalled();
        expect(onSuccessMock).toHaveBeenCalledWith(mockInquiryRes);
        expect(onCloseMock).toHaveBeenCalledTimes(1);
        expect(screen.getByText('Collaboration proposal sent successfully')).toBeInTheDocument();
      });
    });
  });

  describe('4. Inquiry Accept & Reject Toasts', () => {
    const mockInquiryDetail = {
      inquiry: {
        id: 'inq-123',
        status: 'PENDING' as const,
        collaborationType: 'Sponsored Reel',
        platform: 'Instagram',
        deliverables: '1 Reel with link',
        timelineStart: '2026-06-01',
        timelineEnd: '2026-06-15',
        brief: 'Detailed collaboration brief.',
        additionalRequirements: null,
        respondedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        business: {
          id: 'bp-1',
          businessName: 'Brand Co',
          category: 'Retail',
          description: 'Brand description',
          city: 'New York',
          stateOrProvince: 'NY',
          country: 'USA',
          logoUrl: null,
          websiteUrl: null,
          instagramUrl: null,
        },
      },
    };

    it('shows "Collaboration proposal accepted" toast when inquiry is accepted', async () => {
      vi.mocked(inquiriesApi.getCreatorInquiryDetail).mockResolvedValue(mockInquiryDetail as any);
      vi.mocked(inquiriesApi.acceptInquiry).mockResolvedValue({
        inquiry: { ...mockInquiryDetail.inquiry, status: 'ACCEPTED' as const },
        contactExchange: { businessEmail: 'biz@brand.com', creatorEmail: 'creator@agency.com' },
      } as any);

      render(
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <MemoryRouter initialEntries={['/creator/inquiries/inq-123']}>
              <Routes>
                <Route path="/creator/inquiries/:inquiryId" element={<CreatorInquiryDetailPage />} />
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Brand Co/i)).toBeInTheDocument();
      });

      // Click Accept button to open confirmation modal
      const acceptBtn = screen.getByRole('button', { name: /Accept Collaboration/i });
      fireEvent.click(acceptBtn);

      // Click Confirm in modal
      const confirmBtn = screen.getByRole('button', { name: /Confirm & Accept/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(inquiriesApi.acceptInquiry).toHaveBeenCalledWith('inq-123');
        expect(screen.getByText('Collaboration proposal accepted')).toBeInTheDocument();
      });
    });

    it('shows "Collaboration proposal declined" toast when inquiry is rejected', async () => {
      vi.mocked(inquiriesApi.getCreatorInquiryDetail).mockResolvedValue(mockInquiryDetail as any);
      vi.mocked(inquiriesApi.rejectInquiry).mockResolvedValue({
        inquiry: { ...mockInquiryDetail.inquiry, status: 'REJECTED' as const },
      } as any);

      render(
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <MemoryRouter initialEntries={['/creator/inquiries/inq-123']}>
              <Routes>
                <Route path="/creator/inquiries/:inquiryId" element={<CreatorInquiryDetailPage />} />
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Brand Co/i)).toBeInTheDocument();
      });

      // Click Decline button
      const declineBtn = screen.getByRole('button', { name: /Decline Proposal/i });
      fireEvent.click(declineBtn);

      // Confirm decline in modal
      const confirmDeclineBtn = screen.getByRole('button', { name: /Confirm & Decline/i });
      fireEvent.click(confirmDeclineBtn);

      await waitFor(() => {
        expect(inquiriesApi.rejectInquiry).toHaveBeenCalledWith('inq-123');
        expect(screen.getByText('Collaboration proposal declined')).toBeInTheDocument();
      });
    });
  });

  describe('5. Reactivation Navigation State Toast Behavior', () => {
    it('consumes accountReactivated state on CreatorDashboard and displays success toast', async () => {
      vi.mocked(useAuth).mockReturnValue({
        firebaseUser: { uid: 'u-c1' } as any,
        appUser: { id: 'u-c1', email: 'creator@test.com', role: UserRole.CREATOR, status: 'ACTIVE' } as any,
        profile: null,
        onboardingCompleted: true,
        status: 'AUTHENTICATED' as any,
        refreshMe: vi.fn(),
        error: null,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        sendVerificationEmail: vi.fn(),
        reloadUser: vi.fn(),
        sendPasswordReset: vi.fn(),
        provision: vi.fn(),
        reactivateAccount: vi.fn(),
        deactivateAccount: vi.fn(),
        clearSessionExpired: vi.fn(),
      });

      vi.mocked(creatorsApi.getCreatorDashboard).mockResolvedValue({
        totalInquiries: 0,
        pendingInquiries: 0,
        acceptedInquiries: 0,
        declinedInquiries: 0,
        isDiscoverable: true,
        missingFields: [],
      } as any);
      vi.mocked(creatorsApi.getMyCreatorProfile).mockResolvedValue({
        id: 'cp-1',
        name: 'Creator One',
        isDiscoverable: true,
      } as any);

      render(
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <MemoryRouter
              initialEntries={[
                { pathname: '/creator/dashboard', state: { accountReactivated: true } },
              ]}
            >
              <CreatorDashboard />
            </MemoryRouter>
          </ToastProvider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Account successfully reactivated')).toBeInTheDocument();
      });
    });

    it('consumes accountReactivated state on BusinessDashboard and displays success toast', async () => {
      vi.mocked(businessesApi.getBusinessDashboard).mockResolvedValue({
        totalInquiries: 0,
        pendingInquiries: 0,
        acceptedInquiries: 0,
        declinedInquiries: 0,
        savedCreatorsCount: 0,
      } as any);
      vi.mocked(businessesApi.getMyBusinessProfile).mockResolvedValue({
        id: 'bp-1',
        businessName: 'Brand Inc',
      } as any);

      render(
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <MemoryRouter
              initialEntries={[
                { pathname: '/business/dashboard', state: { accountReactivated: true } },
              ]}
            >
              <BusinessDashboard />
            </MemoryRouter>
          </ToastProvider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Account successfully reactivated')).toBeInTheDocument();
      });
    });
  });
});
