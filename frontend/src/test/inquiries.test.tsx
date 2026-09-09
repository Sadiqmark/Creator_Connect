import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { InquiryFormModal } from '../components/inquiry/InquiryFormModal';
import * as inquiriesApi from '../services/api/inquiries';

vi.mock('../services/api/inquiries');

describe('Phase 7B Frontend Inquiry Form Modal Test Suite', () => {
  let queryClient: QueryClient;

  const mockCreator = {
    id: 'cp-001',
    name: 'Elena Rostova',
    profilePhotoUrl: 'https://images.example.com/elena.jpg',
    niche: 'Fashion & Style',
    location: 'Milan, Italy',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  it('renders InquiryFormModal with creator details and fields when open', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <InquiryFormModal
          creator={mockCreator}
          isOpen={true}
          onClose={vi.fn()}
        />
      </QueryClientProvider>
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Send Inquiry to Elena Rostova/i })).toBeInTheDocument();
    expect(screen.getByText('Fashion & Style')).toBeInTheDocument();
    expect(screen.getByText('Milan, Italy')).toBeInTheDocument();

    expect(screen.getByLabelText(/Collaboration Type/i)).toBeInTheDocument();
    expect(screen.getByText('Instagram')).toBeInTheDocument();
    expect(screen.getByText('YouTube')).toBeInTheDocument();
    expect(screen.getByLabelText(/Expected Deliverables/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Collaboration Brief/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send Inquiry/i })).toBeInTheDocument();
  });

  it('validates required fields and shows validation errors on empty submission', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <InquiryFormModal
          creator={mockCreator}
          isOpen={true}
          onClose={vi.fn()}
        />
      </QueryClientProvider>
    );

    const submitBtn = screen.getByRole('button', { name: /Send Inquiry/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Collaboration type is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Deliverables must be at least 10 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/Brief must be at least 20 characters/i)).toBeInTheDocument();
    });

    expect(inquiriesApi.createInquiry).not.toHaveBeenCalled();
  });

  it('submits successfully with valid data and calls createInquiry', async () => {
    const mockCreatedInquiry: inquiriesApi.InquiryDTO = {
      id: 'inq-101',
      creatorId: mockCreator.id,
      status: 'PENDING',
      collaborationType: 'Sponsored Instagram Reel',
      platform: 'Instagram',
      deliverables: '1 Dedicated 60s Reel + 3 Stories with Link',
      timelineStart: '2026-10-01',
      timelineEnd: '2026-10-15',
      brief: 'We are launching our Monsoon Cold Brew blend and seeking an authentic lifestyle reel.',
      additionalRequirements: 'Deliver raw video footage.',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    };

    vi.mocked(inquiriesApi.createInquiry).mockResolvedValue({ inquiry: mockCreatedInquiry });

    const onSuccessMock = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <InquiryFormModal
          creator={mockCreator}
          isOpen={true}
          onClose={vi.fn()}
          onSuccess={onSuccessMock}
        />
      </QueryClientProvider>
    );

    // Fill form
    fireEvent.change(screen.getByLabelText(/Collaboration Type/i), {
      target: { value: 'Sponsored Instagram Reel' },
    });
    fireEvent.change(screen.getByLabelText(/Expected Deliverables/i), {
      target: { value: '1 Dedicated 60s Reel + 3 Stories with Link' },
    });
    fireEvent.change(screen.getByLabelText(/Collaboration Brief/i), {
      target: {
        value: 'We are launching our Monsoon Cold Brew blend and seeking an authentic lifestyle reel.',
      },
    });

    const submitBtn = screen.getByRole('button', { name: /Send Inquiry/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(inquiriesApi.createInquiry).toHaveBeenCalledWith(
        expect.objectContaining({
          creatorId: mockCreator.id,
          collaborationType: 'Sponsored Instagram Reel',
          platform: 'Instagram',
          deliverables: '1 Dedicated 60s Reel + 3 Stories with Link',
        })
      );
      expect(onSuccessMock).toHaveBeenCalledWith(mockCreatedInquiry);
      expect(screen.getByText(/Inquiry Sent Successfully/i)).toBeInTheDocument();
    });
  });

  it('handles 409 DUPLICATE_ACTIVE_INQUIRY conflict error and displays clear alert', async () => {
    vi.mocked(inquiriesApi.createInquiry).mockRejectedValue({
      code: 'DUPLICATE_ACTIVE_INQUIRY',
      statusCode: 409,
      message: 'You already have an active inquiry with this creator.',
    });

    render(
      <QueryClientProvider client={queryClient}>
        <InquiryFormModal
          creator={mockCreator}
          isOpen={true}
          onClose={vi.fn()}
        />
      </QueryClientProvider>
    );

    // Fill minimum required fields
    fireEvent.change(screen.getByLabelText(/Collaboration Type/i), {
      target: { value: 'Sponsored Instagram Reel' },
    });
    fireEvent.change(screen.getByLabelText(/Expected Deliverables/i), {
      target: { value: '1 Dedicated 60s Reel + 3 Stories with Link' },
    });
    fireEvent.change(screen.getByLabelText(/Collaboration Brief/i), {
      target: {
        value: 'We are launching our Monsoon Cold Brew blend and seeking an authentic lifestyle reel.',
      },
    });

    const submitBtn = screen.getByRole('button', { name: /Send Inquiry/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(
        screen.getByText(/You already have an active inquiry with this creator/i)
      ).toBeInTheDocument();
    });
  });
});
