import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PublicCreatorProfilePage } from '../pages/public/PublicCreatorProfilePage';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '@creator-connect/shared';
import * as creatorsApi from '../services/api/creators';
import * as inquiriesApi from '../services/api/inquiries';
import * as savedCreatorsApi from '../services/api/savedCreators';

const mockNavigate = vi.fn();

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../services/api/creators');
vi.mock('../services/api/inquiries');
vi.mock('../services/api/savedCreators');

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Phase 11C — Active Inquiry Profile State Test Suite', () => {
  let queryClient: QueryClient;

  const mockCreator: creatorsApi.CreatorPublicProfile = {
    id: 'cp-001',
    name: 'Elena Rostova',
    profilePhotoUrl: 'https://images.example.com/elena.jpg',
    niche: 'Fashion & Style',
    location: 'Milan, Italy',
    bio: 'Editorial fashion stylist and digital creator.',
    specialties: ['Short-Form Video', 'Editorial Photos'],
    instagramUrl: 'https://instagram.com/elena',
    youtubeUrl: 'https://youtube.com/@elena',
  };

  const sampleInquiryItem = (status: inquiriesApi.InquiryStatus, id = 'inq-001'): inquiriesApi.BusinessInquiryListItem => ({
    id,
    status,
    collaborationType: 'Sponsored Instagram Reel',
    platform: 'Instagram',
    deliverables: '1 Dedicated 60s Reel',
    timelineStart: '2026-10-01',
    timelineEnd: '2026-10-15',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    respondedAt: null,
    creator: {
      id: mockCreator.id,
      name: mockCreator.name,
      profilePhotoUrl: mockCreator.profilePhotoUrl,
      niche: mockCreator.niche,
      location: mockCreator.location,
    },
  });

  const setAuth = (role?: UserRole | null) => {
    if (!role) {
      vi.mocked(useAuth).mockReturnValue({
        firebaseUser: null,
        appUser: null,
        profile: null,
        onboardingCompleted: false,
        status: 'UNAUTHENTICATED',
        refreshMe: vi.fn(),
        signOut: vi.fn(),
        error: null,
      } as any);
      return;
    }

    vi.mocked(useAuth).mockReturnValue({
      firebaseUser: { uid: `firebase_${role.toLowerCase()}`, email: `${role.toLowerCase()}@example.com` } as any,
      appUser: {
        id: `user_${role.toLowerCase()}`,
        email: `${role.toLowerCase()}@example.com`,
        role,
        status: 'ACTIVE',
      } as any,
      profile: null,
      onboardingCompleted: true,
      status: 'AUTHENTICATED',
      refreshMe: vi.fn(),
      signOut: vi.fn(),
      error: null,
    } as any);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    vi.mocked(creatorsApi.getPublicCreatorProfile).mockResolvedValue(mockCreator);
    vi.mocked(savedCreatorsApi.getSavedCreatorIds).mockResolvedValue([]);
  });

  const renderComponent = (creatorId = 'cp-001') => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/creators/${creatorId}`]}>
          <Routes>
            <Route path="/creators/:creatorId" element={<PublicCreatorProfilePage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  // ─── 1. Authenticated Business: No Active Inquiry ───────────────────────────
  it('renders "Send Inquiry" button when authenticated Business has no active inquiry', async () => {
    setAuth(UserRole.BUSINESS);
    vi.mocked(inquiriesApi.listBusinessInquiries).mockResolvedValue({
      inquiries: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Elena Rostova')).toBeInTheDocument();
    });

    // Expect "Send Inquiry" button to be visible
    expect(screen.getByRole('button', { name: /Send Inquiry/i })).toBeInTheDocument();
    // Expect "Inquiry Active" not to be present
    expect(screen.queryByText(/Inquiry Active/i)).toBeNull();
  });

  // ─── 2. Authenticated Business: Active PENDING Inquiry ───────────────────────
  it('renders "Inquiry Active" link when authenticated Business has a PENDING inquiry', async () => {
    setAuth(UserRole.BUSINESS);
    vi.mocked(inquiriesApi.listBusinessInquiries).mockResolvedValue({
      inquiries: [sampleInquiryItem('PENDING', 'inq-pending-123')],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Elena Rostova')).toBeInTheDocument();
    });

    // Expect "Inquiry Active" link to be visible and point to the inquiry detail
    const activeLink = await screen.findByText(/Inquiry Active/i);
    expect(activeLink).toBeInTheDocument();
    expect(activeLink.closest('a')).toHaveAttribute('href', '/business/inquiries/inq-pending-123');

    // "Send Inquiry" action must NOT be available to prevent 409 DUPLICATE_ACTIVE_INQUIRY
    expect(screen.queryByRole('button', { name: /Send Inquiry/i })).toBeNull();
  });

  // ─── 3. Authenticated Business: Active ACCEPTED Inquiry ──────────────────────
  it('renders "Inquiry Active" link when authenticated Business has an ACCEPTED inquiry', async () => {
    setAuth(UserRole.BUSINESS);
    vi.mocked(inquiriesApi.listBusinessInquiries).mockResolvedValue({
      inquiries: [sampleInquiryItem('ACCEPTED', 'inq-accepted-456')],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Elena Rostova')).toBeInTheDocument();
    });

    // Expect "Inquiry Active" link to be visible and point to the inquiry detail
    const activeLink = await screen.findByText(/Inquiry Active/i);
    expect(activeLink).toBeInTheDocument();
    expect(activeLink.closest('a')).toHaveAttribute('href', '/business/inquiries/inq-accepted-456');

    // "Send Inquiry" action must NOT be available
    expect(screen.queryByRole('button', { name: /Send Inquiry/i })).toBeNull();
  });

  // ─── 4. Authenticated Business: Terminal/Inactive Inquiries ─────────────────
  it.each([
    ['REJECTED'],
    ['EXPIRED'],
    ['CLOSED'],
  ] as const)('permits a new inquiry and renders "Send Inquiry" when past inquiry is %s', async (status) => {
    setAuth(UserRole.BUSINESS);
    vi.mocked(inquiriesApi.listBusinessInquiries).mockResolvedValue({
      inquiries: [sampleInquiryItem(status, `inq-${status.toLowerCase()}`)],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Elena Rostova')).toBeInTheDocument();
    });

    // Expect "Send Inquiry" button to be visible again
    expect(screen.getByRole('button', { name: /Send Inquiry/i })).toBeInTheDocument();
    expect(screen.queryByText(/Inquiry Active/i)).toBeNull();
  });

  // ─── 5. Authenticated Creator: Actions Unavailable ──────────────────────────
  it('ensures Business inquiry actions remain completely unavailable for CREATOR users', async () => {
    setAuth(UserRole.CREATOR);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Elena Rostova')).toBeInTheDocument();
    });

    // Neither Send Inquiry nor Inquiry Active should be rendered for Creators
    expect(screen.queryByRole('button', { name: /Send Inquiry/i })).toBeNull();
    expect(screen.queryByText(/Inquiry Active/i)).toBeNull();
    // Save button must also be unavailable for Creators
    expect(screen.queryByRole('button', { name: /Save Creator/i })).toBeNull();
  });

  // ─── 6. Unauthenticated Guest: Preserved Public Behavior ────────────────────
  it('preserves public behavior for unauthenticated guests, redirecting to login on Send Inquiry click', async () => {
    setAuth(null);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Elena Rostova')).toBeInTheDocument();
    });

    // Send Inquiry button is shown to guest as a discovery entrypoint
    const sendInquiryBtn = screen.getByRole('button', { name: /Send Inquiry/i });
    expect(sendInquiryBtn).toBeInTheDocument();
    expect(screen.queryByText(/Inquiry Active/i)).toBeNull();

    // Clicking Send Inquiry redirects guest to login
    fireEvent.click(sendInquiryBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/login', {
      state: { from: '/creators/cp-001' },
    });

    // Active inquiry query should NOT have been called for unauthenticated guest
    expect(inquiriesApi.listBusinessInquiries).not.toHaveBeenCalled();
  });
});
