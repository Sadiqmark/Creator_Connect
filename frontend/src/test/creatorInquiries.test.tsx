import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CreatorInquiriesPage } from '../pages/creator/CreatorInquiriesPage';
import { CreatorInquiryDetailPage } from '../pages/creator/CreatorInquiryDetailPage';
import { CreatorDashboard } from '../pages/dashboards/CreatorDashboard';
import * as inquiriesApi from '../services/api/inquiries';
import * as creatorsApi from '../services/api/creators';

vi.mock('../services/api/inquiries', async () => {
  const actual = await vi.importActual('../services/api/inquiries');
  return {
    ...actual,
    listCreatorInquiries: vi.fn(),
    getCreatorInquiryDetail: vi.fn(),
    acceptInquiry: vi.fn(),
    rejectInquiry: vi.fn(),
  };
});

vi.mock('../services/api/creators', async () => {
  const actual = await vi.importActual('../services/api/creators');
  return {
    ...actual,
    getCreatorDashboard: vi.fn(),
    getMyCreatorProfile: vi.fn(),
  };
});

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    appUser: { id: 'c-user-1', role: 'CREATOR', status: 'ACTIVE' },
    signOut: vi.fn(),
  }),
}));

describe('Phase 10C Frontend Creator Inquiry Management Test Suite', () => {
  let queryClient: QueryClient;

  const mockCreatorInquiryItem: inquiriesApi.CreatorInquiryListItem = {
    id: 'inq-creator-101',
    status: 'PENDING',
    collaborationType: 'Sponsored Instagram Reel',
    platform: 'Instagram',
    deliverables: '1 Dedicated Reel + 2 Stories',
    timelineStart: '2026-10-01',
    timelineEnd: '2026-10-15',
    createdAt: '2026-09-10T10:00:00Z',
    expiresAt: '2026-11-09T10:00:00Z',
    respondedAt: null,
    business: {
      id: 'bp-brand-001',
      businessName: 'Lumina Fashion',
      logoUrl: 'https://images.example.com/lumina.jpg',
      category: 'Fashion & Apparel',
      city: 'Milan',
      country: 'Italy',
    },
  };

  const mockCreatorInquiryDetail: inquiriesApi.CreatorInquiryDetail = {
    id: 'inq-creator-101',
    status: 'PENDING',
    collaborationType: 'Sponsored Instagram Reel',
    platform: 'Instagram',
    deliverables: '1 Dedicated Reel + 2 Stories with link',
    timelineStart: '2026-10-01',
    timelineEnd: '2026-10-15',
    brief: 'Showcase our autumn knitwear line in editorial street settings in Milan.',
    additionalRequirements: 'Provide raw footage within 48h of posting.',
    createdAt: '2026-09-10T10:00:00Z',
    expiresAt: '2026-11-09T10:00:00Z',
    respondedAt: null,
    closedAt: null,
    business: {
      id: 'bp-brand-001',
      businessName: 'Lumina Fashion',
      logoUrl: 'https://images.example.com/lumina.jpg',
      category: 'Fashion & Apparel',
      description: 'Luxury sustainable knitwear brand based in Milan.',
      city: 'Milan',
      stateOrProvince: 'Lombardy',
      country: 'Italy',
      websiteUrl: 'https://luminafashion.example.com',
      instagramUrl: 'https://instagram.com/luminafashion',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  // ─── 1. CREATOR INQUIRIES LIST PAGE ────────────────────────────────────────
  describe('1. CreatorInquiriesPage', () => {
    it('renders the list page with received inquiries and business partner details', async () => {
      vi.mocked(inquiriesApi.listCreatorInquiries).mockResolvedValue({
        inquiries: [mockCreatorInquiryItem],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <CreatorInquiriesPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      // Verify Header and breadcrumbs
      expect(screen.getByRole('heading', { name: /Received Inquiries/i })).toBeInTheDocument();
      expect(screen.getByText(/Review and manage brand collaboration proposals/i)).toBeInTheDocument();

      // Verify tabs
      expect(screen.getByRole('button', { name: /All/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Pending/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Accepted/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Rejected/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Expired/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Closed/i })).toBeInTheDocument();

      // Verify inquiry card content
      await waitFor(() => {
        expect(screen.getByText('Lumina Fashion')).toBeInTheDocument();
        expect(screen.getByText('Sponsored Instagram Reel')).toBeInTheDocument();
        expect(screen.getByText(/Pending Review/i)).toBeInTheDocument();
        expect(screen.getByText(/Milan, Italy/i)).toBeInTheDocument();
      });
    });

    it('switches status filter tabs and refetches inquiries with the new status', async () => {
      vi.mocked(inquiriesApi.listCreatorInquiries).mockResolvedValue({
        inquiries: [mockCreatorInquiryItem],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <CreatorInquiriesPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      const acceptedTab = screen.getByRole('button', { name: /Accepted/i });
      fireEvent.click(acceptedTab);

      await waitFor(() => {
        expect(inquiriesApi.listCreatorInquiries).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'ACCEPTED',
            page: 1,
            limit: 10,
          })
        );
      });
    });

    it('renders empty state when no inquiries match the filter', async () => {
      vi.mocked(inquiriesApi.listCreatorInquiries).mockResolvedValue({
        inquiries: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <CreatorInquiriesPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('No inquiries found')).toBeInTheDocument();
        expect(screen.getByText(/View Profile Settings/i)).toBeInTheDocument();
      });
    });
  });

  // ─── 2. CREATOR INQUIRY DETAIL PAGE ────────────────────────────────────────
  describe('2. CreatorInquiryDetailPage', () => {
    it('renders full proposal details, status banner, brand partner card, and lifecycle timeline', async () => {
      vi.mocked(inquiriesApi.getCreatorInquiryDetail).mockResolvedValue({
        inquiry: mockCreatorInquiryDetail,
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/creator/inquiries/inq-creator-101']}>
            <Routes>
              <Route path="/creator/inquiries/:inquiryId" element={<CreatorInquiryDetailPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Awaiting Your Response')).toBeInTheDocument();
        expect(screen.getByText('Sponsored Instagram Reel')).toBeInTheDocument();
        expect(screen.getByText('1 Dedicated Reel + 2 Stories with link')).toBeInTheDocument();
        expect(screen.getByText(/Showcase our autumn knitwear line/i)).toBeInTheDocument();
        expect(screen.getByText(/Provide raw footage within 48h/i)).toBeInTheDocument();
      });

      // Brand partner details card
      expect(screen.getByRole('heading', { name: 'Lumina Fashion' })).toBeInTheDocument();
      expect(screen.getByText('Luxury sustainable knitwear brand based in Milan.')).toBeInTheDocument();
      expect(screen.getByText('Fashion & Apparel')).toBeInTheDocument();
      expect(screen.getByText(/Milan, Lombardy, Italy/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Instagram Profile/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /luminafashion.example.com/i })).toBeInTheDocument();

      // Action buttons visible for PENDING status
      expect(screen.getByRole('button', { name: /Accept Collaboration/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Decline Proposal/i })).toBeInTheDocument();
    });

    it('NEVER renders business collaboration email in the detail view', async () => {
      vi.mocked(inquiriesApi.getCreatorInquiryDetail).mockResolvedValue({
        inquiry: mockCreatorInquiryDetail,
      });

      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/creator/inquiries/inq-creator-101']}>
            <Routes>
              <Route path="/creator/inquiries/:inquiryId" element={<CreatorInquiryDetailPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Lumina Fashion')).toBeInTheDocument();
      });

      expect(container.textContent).not.toContain('@brand.com');
      expect(container.textContent).not.toContain('collaborationEmail');
    });

    it('renders error/not-found state when inquiry detail fetch fails', async () => {
      vi.mocked(inquiriesApi.getCreatorInquiryDetail).mockRejectedValue(
        new Error('Inquiry not found.')
      );

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/creator/inquiries/non-existent-id']}>
            <Routes>
              <Route path="/creator/inquiries/:inquiryId" element={<CreatorInquiryDetailPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Inquiry Not Found')).toBeInTheDocument();
        expect(screen.getByText('Inquiry not found.')).toBeInTheDocument();
      });
    });
  });

  // ─── 3. ACCEPT FLOW & CONFIRMATION MODAL ────────────────────────────────────
  describe('3. Accept Flow', () => {
    it('opens confirmation modal on clicking Accept, confirms and triggers accept API', async () => {
      vi.mocked(inquiriesApi.getCreatorInquiryDetail).mockResolvedValue({
        inquiry: mockCreatorInquiryDetail,
      });
      vi.mocked(inquiriesApi.acceptInquiry).mockResolvedValue({
        inquiry: { ...mockCreatorInquiryDetail, creatorId: 'cp-001', status: 'ACCEPTED' },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/creator/inquiries/inq-creator-101']}>
            <Routes>
              <Route path="/creator/inquiries/:inquiryId" element={<CreatorInquiryDetailPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Accept Collaboration/i })).toBeInTheDocument();
      });

      // 1. Click Accept button to open confirmation modal
      fireEvent.click(screen.getByRole('button', { name: /Accept Collaboration/i }));

      // 2. Modal appears with confirmation text
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/Accept Collaboration Proposal/i)).toBeInTheDocument();
      expect(screen.getByText(/You are about to accept this collaboration proposal from Lumina Fashion/i)).toBeInTheDocument();

      // 3. Click Confirm in modal
      fireEvent.click(screen.getByRole('button', { name: /Confirm & Accept/i }));

      await waitFor(() => {
        expect(inquiriesApi.acceptInquiry).toHaveBeenCalledWith('inq-creator-101');
      });
    });
  });

  // ─── 4. DECLINE FLOW & CONFIRMATION MODAL ───────────────────────────────────
  describe('4. Decline Flow', () => {
    it('opens confirmation modal on clicking Decline, confirms and triggers reject API', async () => {
      vi.mocked(inquiriesApi.getCreatorInquiryDetail).mockResolvedValue({
        inquiry: mockCreatorInquiryDetail,
      });
      vi.mocked(inquiriesApi.rejectInquiry).mockResolvedValue({
        inquiry: { ...mockCreatorInquiryDetail, creatorId: 'cp-001', status: 'REJECTED' },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/creator/inquiries/inq-creator-101']}>
            <Routes>
              <Route path="/creator/inquiries/:inquiryId" element={<CreatorInquiryDetailPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Decline Proposal/i })).toBeInTheDocument();
      });

      // 1. Click Decline button to open confirmation modal
      fireEvent.click(screen.getByRole('button', { name: /Decline Proposal/i }));

      // 2. Modal appears with confirmation text
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/Decline Collaboration Proposal/i)).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to decline this collaboration proposal from Lumina Fashion/i)).toBeInTheDocument();

      // 3. Click Confirm in modal
      fireEvent.click(screen.getByRole('button', { name: /Confirm & Decline/i }));

      await waitFor(() => {
        expect(inquiriesApi.rejectInquiry).toHaveBeenCalledWith('inq-creator-101');
      });
    });
  });

  // ─── 5. 409 STALE-STATE CONFLICT HANDLING ───────────────────────────────────
  describe('5. 409 Stale-State Conflict Handling', () => {
    it('shows non-destructive conflict alert and invalidates query when 409 occurs', async () => {
      vi.mocked(inquiriesApi.getCreatorInquiryDetail).mockResolvedValue({
        inquiry: mockCreatorInquiryDetail,
      });

      const conflictError: any = new Error('Inquiry is no longer pending.');
      conflictError.response = {
        status: 409,
        data: { error: { code: 'INVALID_INQUIRY_STATE', message: 'Inquiry is no longer pending.' } },
      };

      vi.mocked(inquiriesApi.acceptInquiry).mockRejectedValue(conflictError);

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/creator/inquiries/inq-creator-101']}>
            <Routes>
              <Route path="/creator/inquiries/:inquiryId" element={<CreatorInquiryDetailPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Accept Collaboration/i })).toBeInTheDocument();
      });

      // Click Accept and confirm
      fireEvent.click(screen.getByRole('button', { name: /Accept Collaboration/i }));
      fireEvent.click(screen.getByRole('button', { name: /Confirm & Accept/i }));

      // Conflict message appears on page
      await waitFor(() => {
        expect(screen.getByText(/State Conflict/i)).toBeInTheDocument();
        expect(
          screen.getByText(/This collaboration proposal is no longer pending. It has already been responded to or has expired./i)
        ).toBeInTheDocument();
      });
    });
  });

  // ─── 6. CREATOR DASHBOARD INTEGRATION ───────────────────────────────────────
  describe('6. Creator Dashboard Integration', () => {
    it('renders View All link to /creator/inquiries and clickable recent inquiry rows', async () => {
      vi.mocked(creatorsApi.getCreatorDashboard).mockResolvedValue({
        isDiscoverable: true,
        missingFields: [],
        inquiriesTotal: 5,
        inquiriesPending: 2,
        inquiriesAccepted: 2,
        inquiriesRejected: 1,
        recentInquiries: [
          {
            id: 'inq-creator-101',
            status: 'PENDING',
            collaborationType: 'Sponsored Instagram Reel',
            businessName: 'Lumina Fashion',
            businessLogoUrl: 'https://images.example.com/lumina.jpg',
            createdAt: '2026-09-10T10:00:00Z',
          },
        ],
      } as any);

      vi.mocked(creatorsApi.getMyCreatorProfile).mockResolvedValue({
        id: 'cp-sarah',
        name: 'Sarah Creator',
      } as any);

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <CreatorDashboard />
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Recent Collaboration Inquiries')).toBeInTheDocument();
        const viewAllLink = screen.getByRole('link', { name: /View All/i });
        expect(viewAllLink).toHaveAttribute('href', '/creator/inquiries');
      });

      // Verify recent inquiry item links to detail page
      const inquiryLink = screen.getByRole('link', { name: /Lumina Fashion/i });
      expect(inquiryLink).toHaveAttribute('href', '/creator/inquiries/inq-creator-101');
    });
  });
});
