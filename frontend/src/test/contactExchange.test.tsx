import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BusinessInquiriesPage } from '../pages/business/BusinessInquiriesPage';
import { BusinessInquiryDetailPage } from '../pages/business/BusinessInquiryDetailPage';
import { CreatorInquiriesPage } from '../pages/creator/CreatorInquiriesPage';
import { CreatorInquiryDetailPage } from '../pages/creator/CreatorInquiryDetailPage';
import * as inquiriesApi from '../services/api/inquiries';

vi.mock('../services/api/inquiries', async () => {
  const actual = await vi.importActual('../services/api/inquiries');
  return {
    ...actual,
    listBusinessInquiries: vi.fn(),
    getBusinessInquiryDetail: vi.fn(),
    listCreatorInquiries: vi.fn(),
    getCreatorInquiryDetail: vi.fn(),
    acceptInquiry: vi.fn(),
    rejectInquiry: vi.fn(),
  };
});

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    appUser: { id: 'auth-user-id', email: 'auth-secret@firebase.internal', role: 'CREATOR', status: 'ACTIVE' },
    signOut: vi.fn(),
  }),
}));

describe('Phase 11B Frontend Controlled Contact Exchange Test Suite', () => {
  let queryClient: QueryClient;

  const baseBusinessDetail: inquiriesApi.BusinessInquiryDetail = {
    id: 'inq-biz-01',
    status: 'ACCEPTED',
    collaborationType: 'Sponsored Reel',
    platform: 'Instagram',
    deliverables: '1 Reel + 2 Stories',
    timelineStart: '2026-10-01',
    timelineEnd: '2026-10-15',
    brief: 'Autumn knitwear campaign promotion.',
    additionalRequirements: 'Raw footage in 48h.',
    createdAt: '2026-09-10T10:00:00Z',
    expiresAt: '2026-11-09T10:00:00Z',
    respondedAt: '2026-09-11T12:00:00Z',
    closedAt: null,
    creator: {
      id: 'cp-elena-01',
      name: 'Elena Rostova',
      profilePhotoUrl: 'https://images.example.com/elena.jpg',
      niche: 'Fashion',
      location: 'Milan, Italy',
      bio: 'Fashion creator based in Milan.',
      specialties: ['Editorial', 'Styling'],
      instagramUrl: 'https://instagram.com/elenarostova',
      youtubeUrl: 'https://youtube.com/@elenarostova',
    },
    contact: null,
  };

  const baseCreatorDetail: inquiriesApi.CreatorInquiryDetail = {
    id: 'inq-creat-01',
    status: 'ACCEPTED',
    collaborationType: 'Sponsored Reel',
    platform: 'Instagram',
    deliverables: '1 Reel + 2 Stories',
    timelineStart: '2026-10-01',
    timelineEnd: '2026-10-15',
    brief: 'Showcase autumn knitwear in editorial settings.',
    additionalRequirements: 'Raw footage in 48h.',
    createdAt: '2026-09-10T10:00:00Z',
    expiresAt: '2026-11-09T10:00:00Z',
    respondedAt: '2026-09-11T12:00:00Z',
    closedAt: null,
    business: {
      id: 'bp-lumina-01',
      businessName: 'Lumina Fashion',
      logoUrl: 'https://images.example.com/lumina.jpg',
      category: 'Fashion & Apparel',
      description: 'Luxury sustainable knitwear brand.',
      city: 'Milan',
      stateOrProvince: 'Lombardy',
      country: 'Italy',
      websiteUrl: 'https://luminafashion.example.com',
      instagramUrl: 'https://instagram.com/luminafashion',
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

    // Mock clipboard writeText
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  const renderBusinessDetail = (inquiryId = 'inq-biz-01') =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/business/inquiries/${inquiryId}`]}>
          <Routes>
            <Route path="/business/inquiries/:inquiryId" element={<BusinessInquiryDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

  const renderCreatorDetail = (inquiryId = 'inq-creat-01') =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/creator/inquiries/${inquiryId}`]}>
          <Routes>
            <Route path="/creator/inquiries/:inquiryId" element={<CreatorInquiryDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

  // 1. Business accepted inquiry with complete contact
  it('1. Business accepted inquiry displays complete Creator Contact with name, email, Instagram, and YouTube', async () => {
    vi.mocked(inquiriesApi.getBusinessInquiryDetail).mockResolvedValue({
      inquiry: {
        ...baseBusinessDetail,
        status: 'ACCEPTED',
        contact: {
          name: 'Elena Rostova',
          collaborationEmail: 'elena.collab@agency.com',
          instagramUrl: 'https://instagram.com/elenarostova',
          youtubeUrl: 'https://youtube.com/@elenarostova',
        },
      },
    });

    renderBusinessDetail();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Creator Contact' })).toBeInTheDocument();
    });

    // Name visible in contact card description
    expect(screen.getByText('Elena Rostova', { selector: 'span' })).toBeInTheDocument();

    // Collaboration email with mailto link
    const emailLink = screen.getByRole('link', { name: /Send email to elena\.collab@agency\.com/i });
    expect(emailLink).toBeInTheDocument();
    expect(emailLink).toHaveAttribute('href', 'mailto:elena.collab@agency.com');

    // Instagram link with target="_blank" and rel="noopener noreferrer"
    const igLink = screen.getAllByRole('link', { name: /Instagram/i }).find(
      (el) => el.getAttribute('href') === 'https://instagram.com/elenarostova'
    );
    expect(igLink).toBeDefined();
    expect(igLink).toHaveAttribute('target', '_blank');
    expect(igLink).toHaveAttribute('rel', 'noopener noreferrer');

    // YouTube link with target="_blank" and rel="noopener noreferrer"
    const ytLink = screen.getAllByRole('link', { name: /YouTube/i }).find(
      (el) => el.getAttribute('href') === 'https://youtube.com/@elenarostova'
    );
    expect(ytLink).toBeDefined();
    expect(ytLink).toHaveAttribute('target', '_blank');
    expect(ytLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  // 2. Business accepted inquiry with nullable fields
  it('2. Business accepted inquiry with nullable fields cleanly omits null email, null Instagram, and null YouTube', async () => {
    vi.mocked(inquiriesApi.getBusinessInquiryDetail).mockResolvedValue({
      inquiry: {
        ...baseBusinessDetail,
        status: 'ACCEPTED',
        creator: {
          ...baseBusinessDetail.creator,
          instagramUrl: null,
          youtubeUrl: null,
        },
        contact: {
          name: 'Elena Rostova',
          collaborationEmail: null,
          instagramUrl: null,
          youtubeUrl: null,
        },
      },
    });

    renderBusinessDetail();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Creator Contact' })).toBeInTheDocument();
    });

    // Name is present
    expect(screen.getByText('Elena Rostova', { selector: 'span' })).toBeInTheDocument();

    // Null email omitted: no mailto link anywhere
    expect(screen.queryByText(/Collaboration Email/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^mailto:/i })).not.toBeInTheDocument();

    // Social links omitted from contact card
    const allLinks = screen.getAllByRole('link');
    const mailtoLinks = allLinks.filter((l) => l.getAttribute('href')?.startsWith('mailto:'));
    expect(mailtoLinks).toHaveLength(0);
  });

  // 3. Creator accepted inquiry with complete contact
  it('3. Creator accepted inquiry displays complete Business Contact with business name, email, website, and Instagram', async () => {
    vi.mocked(inquiriesApi.getCreatorInquiryDetail).mockResolvedValue({
      inquiry: {
        ...baseCreatorDetail,
        status: 'ACCEPTED',
        contact: {
          businessName: 'Lumina Fashion',
          collaborationEmail: 'partnerships@luminafashion.example.com',
          websiteUrl: 'https://luminafashion.example.com',
          instagramUrl: 'https://instagram.com/luminafashion',
        },
      },
    });

    renderCreatorDetail();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Business Contact' })).toBeInTheDocument();
    });

    // Business name visible in contact card description
    expect(screen.getByText('Lumina Fashion', { selector: 'span' })).toBeInTheDocument();

    // Collaboration email with mailto link
    const emailLink = screen.getByRole('link', {
      name: /Send email to partnerships@luminafashion\.example\.com/i,
    });
    expect(emailLink).toBeInTheDocument();
    expect(emailLink).toHaveAttribute('href', 'mailto:partnerships@luminafashion.example.com');

    // Website link with target="_blank" and rel="noopener noreferrer"
    const websiteLink = screen.getAllByRole('link', { name: /Website/i }).find(
      (el) => el.getAttribute('href') === 'https://luminafashion.example.com'
    );
    expect(websiteLink).toBeDefined();
    expect(websiteLink).toHaveAttribute('target', '_blank');
    expect(websiteLink).toHaveAttribute('rel', 'noopener noreferrer');

    // Instagram link with target="_blank" and rel="noopener noreferrer"
    const igLink = screen.getAllByRole('link', { name: /Instagram/i }).find(
      (el) => el.getAttribute('href') === 'https://instagram.com/luminafashion'
    );
    expect(igLink).toBeDefined();
    expect(igLink).toHaveAttribute('target', '_blank');
    expect(igLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  // 4. Creator accepted inquiry with nullable fields
  it('4. Creator accepted inquiry with nullable fields cleanly omits null email, null website, and null Instagram', async () => {
    vi.mocked(inquiriesApi.getCreatorInquiryDetail).mockResolvedValue({
      inquiry: {
        ...baseCreatorDetail,
        status: 'ACCEPTED',
        business: {
          ...baseCreatorDetail.business,
          websiteUrl: null,
          instagramUrl: null,
        },
        contact: {
          businessName: 'Lumina Fashion',
          collaborationEmail: null,
          websiteUrl: null,
          instagramUrl: null,
        },
      },
    });

    renderCreatorDetail();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Business Contact' })).toBeInTheDocument();
    });

    // Business name visible
    expect(screen.getByText('Lumina Fashion', { selector: 'span' })).toBeInTheDocument();

    // Null email omitted
    expect(screen.queryByText(/Collaboration Email/i)).not.toBeInTheDocument();
    const allLinks = screen.getAllByRole('link');
    const mailtoLinks = allLinks.filter((l) => l.getAttribute('href')?.startsWith('mailto:'));
    expect(mailtoLinks).toHaveLength(0);
  });

  // 5. Pending inquiry: contact not displayed
  it('5. Pending inquiry: contact card is not rendered on either Business or Creator detail page', async () => {
    // Business side
    vi.mocked(inquiriesApi.getBusinessInquiryDetail).mockResolvedValue({
      inquiry: {
        ...baseBusinessDetail,
        status: 'PENDING',
        contact: null,
      },
    });

    renderBusinessDetail();
    await waitFor(() => {
      expect(screen.getByText('Awaiting Creator Response')).toBeInTheDocument();
    });
    expect(screen.queryByRole('heading', { name: 'Creator Contact' })).not.toBeInTheDocument();

    // Creator side
    vi.mocked(inquiriesApi.getCreatorInquiryDetail).mockResolvedValue({
      inquiry: {
        ...baseCreatorDetail,
        status: 'PENDING',
        contact: null,
      },
    });

    renderCreatorDetail();
    await waitFor(() => {
      expect(screen.getByText('Awaiting Your Response')).toBeInTheDocument();
    });
    expect(screen.queryByRole('heading', { name: 'Business Contact' })).not.toBeInTheDocument();
  });

  // 6. Rejected inquiry: contact not displayed
  it('6. Rejected inquiry: contact card is not rendered on either Business or Creator detail page', async () => {
    vi.mocked(inquiriesApi.getBusinessInquiryDetail).mockResolvedValue({
      inquiry: {
        ...baseBusinessDetail,
        status: 'REJECTED',
        contact: null,
      },
    });

    renderBusinessDetail();
    await waitFor(() => {
      expect(screen.getByText('Proposal Declined')).toBeInTheDocument();
    });
    expect(screen.queryByRole('heading', { name: 'Creator Contact' })).not.toBeInTheDocument();

    vi.mocked(inquiriesApi.getCreatorInquiryDetail).mockResolvedValue({
      inquiry: {
        ...baseCreatorDetail,
        status: 'REJECTED',
        contact: null,
      },
    });

    renderCreatorDetail();
    await waitFor(() => {
      expect(screen.getByText('Proposal Declined')).toBeInTheDocument();
    });
    expect(screen.queryByRole('heading', { name: 'Business Contact' })).not.toBeInTheDocument();
  });

  // 7. Expired inquiry: contact not displayed
  it('7. Expired inquiry: contact card is not rendered on either Business or Creator detail page', async () => {
    vi.mocked(inquiriesApi.getBusinessInquiryDetail).mockResolvedValue({
      inquiry: {
        ...baseBusinessDetail,
        status: 'EXPIRED',
        contact: null,
      },
    });

    renderBusinessDetail();
    await waitFor(() => {
      expect(screen.getByText('Proposal Expired')).toBeInTheDocument();
    });
    expect(screen.queryByRole('heading', { name: 'Creator Contact' })).not.toBeInTheDocument();

    vi.mocked(inquiriesApi.getCreatorInquiryDetail).mockResolvedValue({
      inquiry: {
        ...baseCreatorDetail,
        status: 'EXPIRED',
        contact: null,
      },
    });

    renderCreatorDetail();
    await waitFor(() => {
      expect(screen.getByText('Proposal Expired')).toBeInTheDocument();
    });
    expect(screen.queryByRole('heading', { name: 'Business Contact' })).not.toBeInTheDocument();
  });

  // 8. Closed inquiry: contact not displayed
  it('8. Closed inquiry: contact card is not rendered on either Business or Creator detail page', async () => {
    vi.mocked(inquiriesApi.getBusinessInquiryDetail).mockResolvedValue({
      inquiry: {
        ...baseBusinessDetail,
        status: 'CLOSED',
        contact: null,
      },
    });

    renderBusinessDetail();
    await waitFor(() => {
      expect(screen.getByText('Inquiry Closed')).toBeInTheDocument();
    });
    expect(screen.queryByRole('heading', { name: 'Creator Contact' })).not.toBeInTheDocument();

    vi.mocked(inquiriesApi.getCreatorInquiryDetail).mockResolvedValue({
      inquiry: {
        ...baseCreatorDetail,
        status: 'CLOSED',
        contact: null,
      },
    });

    renderCreatorDetail();
    await waitFor(() => {
      expect(screen.getByText('Inquiry Closed')).toBeInTheDocument();
    });
    expect(screen.queryByRole('heading', { name: 'Business Contact' })).not.toBeInTheDocument();
  });

  // 9. Verify authentication email is never rendered as collaboration contact
  it('9. NEVER renders Firebase/User authentication email as collaboration contact fallback', async () => {
    vi.mocked(inquiriesApi.getBusinessInquiryDetail).mockResolvedValue({
      inquiry: {
        ...baseBusinessDetail,
        status: 'ACCEPTED',
        contact: {
          name: 'Elena Rostova',
          collaborationEmail: null,
          instagramUrl: null,
          youtubeUrl: null,
        },
      },
    });

    const { container: bizContainer } = renderBusinessDetail();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Creator Contact' })).toBeInTheDocument();
    });

    expect(bizContainer.textContent).not.toContain('auth-secret@firebase.internal');

    vi.mocked(inquiriesApi.getCreatorInquiryDetail).mockResolvedValue({
      inquiry: {
        ...baseCreatorDetail,
        status: 'ACCEPTED',
        contact: {
          businessName: 'Lumina Fashion',
          collaborationEmail: null,
          websiteUrl: null,
          instagramUrl: null,
        },
      },
    });

    const { container: creatContainer } = renderCreatorDetail();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Business Contact' })).toBeInTheDocument();
    });

    expect(creatContainer.textContent).not.toContain('auth-secret@firebase.internal');
  });

  // 10. Verify contact is not rendered on inquiry LIST pages
  it('10. Contact information is NOT rendered on Business or Creator inquiry LIST pages', async () => {
    // Business List Page
    vi.mocked(inquiriesApi.listBusinessInquiries).mockResolvedValue({
      inquiries: [
        {
          id: 'inq-biz-01',
          status: 'ACCEPTED',
          collaborationType: 'Sponsored Reel',
          platform: 'Instagram',
          deliverables: '1 Reel',
          timelineStart: '2026-10-01',
          timelineEnd: '2026-10-15',
          createdAt: '2026-09-10T10:00:00Z',
          expiresAt: '2026-11-09T10:00:00Z',
          respondedAt: '2026-09-11T12:00:00Z',
          creator: {
            id: 'cp-01',
            name: 'Elena Rostova',
            profilePhotoUrl: null,
            niche: 'Fashion',
            location: 'Milan, Italy',
          },
        },
      ],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    const { container: bizListContainer } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <BusinessInquiriesPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Elena Rostova')).toBeInTheDocument();
    });

    expect(bizListContainer.textContent).not.toContain('Creator Contact');
    expect(bizListContainer.textContent).not.toContain('Collaboration Email');

    // Creator List Page
    vi.mocked(inquiriesApi.listCreatorInquiries).mockResolvedValue({
      inquiries: [
        {
          id: 'inq-creat-01',
          status: 'ACCEPTED',
          collaborationType: 'Sponsored Reel',
          platform: 'Instagram',
          deliverables: '1 Reel',
          timelineStart: '2026-10-01',
          timelineEnd: '2026-10-15',
          createdAt: '2026-09-10T10:00:00Z',
          expiresAt: '2026-11-09T10:00:00Z',
          respondedAt: '2026-09-11T12:00:00Z',
          business: {
            id: 'bp-01',
            businessName: 'Lumina Fashion',
            logoUrl: null,
            category: 'Fashion & Apparel',
            city: 'Milan',
            country: 'Italy',
          },
        },
      ],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    const { container: creatListContainer } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CreatorInquiriesPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Lumina Fashion')).toBeInTheDocument();
    });

    expect(creatListContainer.textContent).not.toContain('Business Contact');
    expect(creatListContainer.textContent).not.toContain('Collaboration Email');
  });

  // 11. Verify existing inquiry actions continue working
  it('11. Existing creator inquiry actions (Accept / Reject) continue working normally', async () => {
    vi.mocked(inquiriesApi.getCreatorInquiryDetail).mockResolvedValue({
      inquiry: {
        ...baseCreatorDetail,
        status: 'PENDING',
        contact: null,
      },
    });

    vi.mocked(inquiriesApi.acceptInquiry).mockResolvedValue({
      inquiry: {
        id: 'inq-creat-01',
        businessId: 'bp-lumina-01',
        creatorId: 'cp-elena-01',
        collaborationType: 'Sponsored Reel',
        platform: 'Instagram',
        deliverables: '1 Reel + 2 Stories',
        timelineStart: '2026-10-01',
        timelineEnd: '2026-10-15',
        brief: 'Showcase autumn knitwear in editorial settings.',
        additionalRequirements: 'Raw footage in 48h.',
        status: 'ACCEPTED',
        createdAt: '2026-09-10T10:00:00Z',
        expiresAt: '2026-11-09T10:00:00Z',
      } as any,
    });

    renderCreatorDetail();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Accept Collaboration/i })).toBeInTheDocument();
    });

    // Open accept modal
    fireEvent.click(screen.getByRole('button', { name: /Accept Collaboration/i }));

    expect(screen.getByRole('heading', { name: /Accept Collaboration Proposal/i })).toBeInTheDocument();

    // Confirm accept action
    const confirmButton = screen.getByRole('button', { name: /Confirm & Accept/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(inquiriesApi.acceptInquiry).toHaveBeenCalledWith('inq-creat-01');
    });
  });

  // 12. Verify role isolation remains intact
  it('12. Role isolation remains intact between business and creator inquiry detail endpoints', async () => {
    vi.mocked(inquiriesApi.getBusinessInquiryDetail).mockResolvedValue({
      inquiry: {
        ...baseBusinessDetail,
        status: 'ACCEPTED',
        contact: {
          name: 'Elena Rostova',
          collaborationEmail: 'elena@example.com',
          instagramUrl: null,
          youtubeUrl: null,
        },
      },
    });

    renderBusinessDetail('inq-biz-01');

    await waitFor(() => {
      expect(inquiriesApi.getBusinessInquiryDetail).toHaveBeenCalledWith('inq-biz-01');
    });
    expect(inquiriesApi.getCreatorInquiryDetail).not.toHaveBeenCalled();

    vi.mocked(inquiriesApi.getCreatorInquiryDetail).mockResolvedValue({
      inquiry: {
        ...baseCreatorDetail,
        status: 'ACCEPTED',
        contact: {
          businessName: 'Lumina Fashion',
          collaborationEmail: 'brand@example.com',
          websiteUrl: null,
          instagramUrl: null,
        },
      },
    });

    renderCreatorDetail('inq-creat-01');

    await waitFor(() => {
      expect(inquiriesApi.getCreatorInquiryDetail).toHaveBeenCalledWith('inq-creat-01');
    });
  });

  // 13. Verify responsive/accessibility behavior and clipboard copy interaction
  it('13. Provides accessible attributes, copy-to-clipboard functionality, and safe external links', async () => {
    vi.mocked(inquiriesApi.getBusinessInquiryDetail).mockResolvedValue({
      inquiry: {
        ...baseBusinessDetail,
        status: 'ACCEPTED',
        contact: {
          name: 'Elena Rostova',
          collaborationEmail: 'elena.collab@agency.com',
          instagramUrl: 'https://instagram.com/elenarostova',
          youtubeUrl: 'https://youtube.com/@elenarostova',
        },
      },
    });

    renderBusinessDetail();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Creator Contact' })).toBeInTheDocument();
    });

    // Verify copy email button works and calls navigator.clipboard.writeText
    const copyButton = screen.getByRole('button', { name: /Copy email address/i });
    expect(copyButton).toBeInTheDocument();

    fireEvent.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('elena.collab@agency.com');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Email copied/i })).toBeInTheDocument();
    });

    // Verify safe external links (rel="noopener noreferrer")
    const externalLinks = screen.getAllByRole('link').filter((link) => link.getAttribute('target') === '_blank');
    expect(externalLinks.length).toBeGreaterThanOrEqual(2);
    externalLinks.forEach((link) => {
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });
});
