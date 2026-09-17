import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BusinessInquiriesPage } from '../pages/business/BusinessInquiriesPage';
import { BusinessInquiryDetailPage } from '../pages/business/BusinessInquiryDetailPage';
import * as inquiriesApi from '../services/api/inquiries';

vi.mock('../services/api/inquiries', async () => {
  const actual = await vi.importActual('../services/api/inquiries');
  return {
    ...actual,
    listBusinessInquiries: vi.fn(),
    getBusinessInquiryDetail: vi.fn(),
  };
});

describe('Phase 9B Frontend Business Inquiry Management Test Suite', () => {
  let queryClient: QueryClient;

  const mockInquiryListItem: inquiriesApi.BusinessInquiryListItem = {
    id: 'inq-101',
    status: 'PENDING',
    collaborationType: 'Sponsored Instagram Reel',
    platform: 'Instagram',
    deliverables: '1 Dedicated Reel + 2 Stories',
    timelineStart: '2026-10-01',
    timelineEnd: '2026-10-15',
    createdAt: '2026-09-10T10:00:00Z',
    expiresAt: '2026-11-09T10:00:00Z',
    respondedAt: null,
    creator: {
      id: 'cp-001',
      name: 'Elena Rostova',
      profilePhotoUrl: 'https://images.example.com/elena.jpg',
      niche: 'Fashion',
      location: 'Milan, Italy',
    },
  };

  const mockInquiryDetail: inquiriesApi.BusinessInquiryDetail = {
    id: 'inq-101',
    status: 'PENDING',
    collaborationType: 'Sponsored Instagram Reel',
    platform: 'Instagram',
    deliverables: '1 Dedicated Reel + 2 Stories with affiliate link',
    timelineStart: '2026-10-01',
    timelineEnd: '2026-10-15',
    brief: 'Campaign brief introducing the upcoming winter jacket collection.',
    additionalRequirements: 'Provide raw footage within 48h.',
    createdAt: '2026-09-10T10:00:00Z',
    expiresAt: '2026-11-09T10:00:00Z',
    respondedAt: null,
    closedAt: null,
    creator: {
      id: 'cp-001',
      name: 'Elena Rostova',
      profilePhotoUrl: 'https://images.example.com/elena.jpg',
      niche: 'Fashion',
      location: 'Milan, Italy',
      bio: 'High-fashion editorial stylist and visual creator.',
      specialties: ['Fashion Styling', 'Photography'],
      instagramUrl: 'https://instagram.com/elenarostova',
      youtubeUrl: 'https://youtube.com/@elenarostova',
    },
    contact: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  // ─── 1. BUSINESS INQUIRIES LIST PAGE ────────────────────────────────────────
  describe('1. BusinessInquiriesPage', () => {
    it('renders the list page with inquiries and safe creator details', async () => {
      vi.mocked(inquiriesApi.listBusinessInquiries).mockResolvedValue({
        inquiries: [mockInquiryListItem],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <BusinessInquiriesPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      // Verify Header and breadcrumbs
      expect(screen.getByRole('heading', { name: /Collaboration Inquiries/i })).toBeInTheDocument();
      expect(screen.getByText(/Track, review, and manage collaboration proposals/i)).toBeInTheDocument();

      // Verify tabs
      expect(screen.getByRole('button', { name: /All/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Pending/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Accepted/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Rejected/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Expired/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Closed/i })).toBeInTheDocument();

      // Verify inquiry card content
      await waitFor(() => {
        expect(screen.getByText('Elena Rostova')).toBeInTheDocument();
        expect(screen.getByText('Sponsored Instagram Reel')).toBeInTheDocument();
        expect(screen.getByText(/Pending Review/i)).toBeInTheDocument();
        expect(screen.getByText(/Milan, Italy/i)).toBeInTheDocument();
      });
    });

    it('switches status filter tabs and refetches inquiries with the new status', async () => {
      vi.mocked(inquiriesApi.listBusinessInquiries).mockResolvedValue({
        inquiries: [mockInquiryListItem],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <BusinessInquiriesPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      const acceptedTab = screen.getByRole('button', { name: /Accepted/i });
      fireEvent.click(acceptedTab);

      await waitFor(() => {
        expect(inquiriesApi.listBusinessInquiries).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'ACCEPTED',
            page: 1,
            limit: 10,
          })
        );
      });
    });

    it('renders empty state when no inquiries match the filter', async () => {
      vi.mocked(inquiriesApi.listBusinessInquiries).mockResolvedValue({
        inquiries: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <BusinessInquiriesPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('No inquiries found')).toBeInTheDocument();
        expect(screen.getByText(/Browse Creator Directory/i)).toBeInTheDocument();
      });
    });
  });

  // ─── 2. BUSINESS INQUIRY DETAIL PAGE ────────────────────────────────────────
  describe('2. BusinessInquiryDetailPage', () => {
    it('renders full proposal details, status banner, and creator profile card', async () => {
      vi.mocked(inquiriesApi.getBusinessInquiryDetail).mockResolvedValue({
        inquiry: mockInquiryDetail,
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/business/inquiries/inq-101']}>
            <Routes>
              <Route path="/business/inquiries/:inquiryId" element={<BusinessInquiryDetailPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Awaiting Creator Response')).toBeInTheDocument();
        expect(screen.getByText('Sponsored Instagram Reel')).toBeInTheDocument();
        expect(screen.getByText('1 Dedicated Reel + 2 Stories with affiliate link')).toBeInTheDocument();
        expect(screen.getByText('Campaign brief introducing the upcoming winter jacket collection.')).toBeInTheDocument();
        expect(screen.getByText('Provide raw footage within 48h.')).toBeInTheDocument();
      });

      // Target creator details card
      expect(screen.getByRole('heading', { name: 'Elena Rostova' })).toBeInTheDocument();
      expect(screen.getByText('High-fashion editorial stylist and visual creator.')).toBeInTheDocument();
      expect(screen.getByText('Fashion Styling')).toBeInTheDocument();
      expect(screen.getByText('Photography')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Instagram/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /YouTube/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /View Public Profile/i })).toHaveAttribute(
        'href',
        '/creators/cp-001'
      );
    });

    it('NEVER renders creator private collaboration email in the detail view', async () => {
      vi.mocked(inquiriesApi.getBusinessInquiryDetail).mockResolvedValue({
        inquiry: mockInquiryDetail,
      });

      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/business/inquiries/inq-101']}>
            <Routes>
              <Route path="/business/inquiries/:inquiryId" element={<BusinessInquiryDetailPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Elena Rostova')).toBeInTheDocument();
      });

      expect(container.textContent).not.toContain('private@agency.com');
      expect(container.textContent).not.toContain('collaborationEmail');
    });

    it('renders error/not-found state when inquiry detail fetch fails', async () => {
      vi.mocked(inquiriesApi.getBusinessInquiryDetail).mockRejectedValue(
        new Error('Inquiry not found.')
      );

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/business/inquiries/non-existent-id']}>
            <Routes>
              <Route path="/business/inquiries/:inquiryId" element={<BusinessInquiryDetailPage />} />
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
});
