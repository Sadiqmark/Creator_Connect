import { apiClient } from './client';

export type InquiryStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CLOSED';

export interface CreateInquiryPayload {
  creatorId: string;
  collaborationType: string;
  platform: string;
  deliverables: string;
  timelineStart?: string | null;
  timelineEnd?: string | null;
  brief: string;
  additionalRequirements?: string | null;
}

export interface InquiryDTO {
  id: string;
  creatorId: string;
  status: InquiryStatus;
  collaborationType: string;
  platform: string;
  deliverables: string;
  timelineStart: string | null;
  timelineEnd: string | null;
  brief: string;
  additionalRequirements: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface CreateInquiryResponse {
  inquiry: InquiryDTO;
}

export const createInquiry = async (
  payload: CreateInquiryPayload
): Promise<CreateInquiryResponse> => {
  const res = await apiClient.post<CreateInquiryResponse>('/inquiries', payload);
  return res.data;
};

// ─── Phase 9: Business Inquiry Management ────────────────────────────────────

export interface BusinessInquiryCreatorSummary {
  id: string; // canonical CreatorProfile.id
  name: string;
  profilePhotoUrl: string | null;
  niche: string;
  location: string;
}

export interface BusinessInquiryCreatorDetail extends BusinessInquiryCreatorSummary {
  bio: string;
  specialties: string[];
  instagramUrl: string | null;
  youtubeUrl: string | null;
}

export interface BusinessInquiryListItem {
  id: string;
  status: InquiryStatus;
  collaborationType: string;
  platform: string;
  deliverables: string;
  timelineStart: string | null;
  timelineEnd: string | null;
  createdAt: string;
  expiresAt: string;
  respondedAt: string | null;
  creator: BusinessInquiryCreatorSummary;
}

export interface BusinessInquiryDetail {
  id: string;
  status: InquiryStatus;
  collaborationType: string;
  platform: string;
  deliverables: string;
  timelineStart: string | null;
  timelineEnd: string | null;
  brief: string;
  additionalRequirements: string | null;
  createdAt: string;
  expiresAt: string;
  respondedAt: string | null;
  closedAt: string | null;
  creator: BusinessInquiryCreatorDetail;
}

export interface ListBusinessInquiriesParams {
  status?: InquiryStatus | 'ALL';
  page?: number;
  limit?: number;
}

export interface ListBusinessInquiriesResponse {
  inquiries: BusinessInquiryListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface GetBusinessInquiryDetailResponse {
  inquiry: BusinessInquiryDetail;
}

export const listBusinessInquiries = async (
  params?: ListBusinessInquiriesParams
): Promise<ListBusinessInquiriesResponse> => {
  const queryParams: Record<string, any> = {};
  if (params?.status && params.status !== 'ALL') {
    queryParams.status = params.status;
  }
  if (params?.page) {
    queryParams.page = params.page;
  }
  if (params?.limit) {
    queryParams.limit = params.limit;
  }

  const res = await apiClient.get<ListBusinessInquiriesResponse>('/inquiries', {
    params: queryParams,
  });
  return res.data;
};

export const getBusinessInquiryDetail = async (
  inquiryId: string
): Promise<GetBusinessInquiryDetailResponse> => {
  const res = await apiClient.get<GetBusinessInquiryDetailResponse>(`/inquiries/${inquiryId}`);
  return res.data;
};

