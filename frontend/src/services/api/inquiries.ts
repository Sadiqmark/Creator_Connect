import { apiClient } from './client';

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
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CLOSED';
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
