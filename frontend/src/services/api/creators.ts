import { apiClient } from './client';

export interface CreatorPublicProfile {
  id: string;
  name: string;
  profilePhotoUrl: string | null;
  niche: string;
  location: string;
  bio: string;
  specialties: string[];
  instagramUrl: string | null;
  youtubeUrl: string | null;
}

export interface CreatorPrivateProfile extends CreatorPublicProfile {
  userId: string;
  collaborationEmail: string | null;
  isDiscoverable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ListCreatorsParams {
  q?: string;
  search?: string;
  niche?: string;
  city?: string;
  country?: string;
  page?: number;
  limit?: number;
}

export interface ListCreatorsResponse {
  creators: CreatorPublicProfile[];
  pagination: PaginationMeta;
}

export interface CreatorProfileFormData {
  name: string;
  niche: string;
  location: string;
  bio: string;
  specialties: string[];
  instagramUrl?: string | null;
  youtubeUrl?: string | null;
  collaborationEmail?: string | null;
  profilePhotoUrl?: string | null;
}

export interface CreatorDashboardSummary {
  isDiscoverable: boolean;
  missingFields: string[];
  inquiriesTotal: number;
  inquiriesPending: number;
  inquiriesAccepted: number;
  inquiriesRejected: number;
  recentInquiries: Array<{
    id: string;
    status: string;
    collaborationType: string;
    businessName: string | null;
    businessLogoUrl: string | null;
    createdAt: string;
  }>;
}

export const getMyCreatorProfile = async (): Promise<CreatorPrivateProfile> => {
  const res = await apiClient.get<{ profile: CreatorPrivateProfile }>('/creators/me');
  return res.data.profile;
};

export const updateMyCreatorProfile = async (
  data: CreatorProfileFormData
): Promise<CreatorPrivateProfile> => {
  const res = await apiClient.patch<{ profile: CreatorPrivateProfile }>('/creators/me', data);
  return res.data.profile;
};

export const getPublicCreatorProfile = async (creatorId: string): Promise<CreatorPublicProfile> => {
  const res = await apiClient.get<{ profile: CreatorPublicProfile }>(`/creators/${creatorId}`);
  return res.data.profile;
};

export const listCreators = async (params?: ListCreatorsParams): Promise<ListCreatorsResponse> => {
  const res = await apiClient.get<ListCreatorsResponse>('/creators', { params });
  return res.data;
};

export const getCreatorDashboard = async (): Promise<CreatorDashboardSummary> => {
  const res = await apiClient.get<{ summary: CreatorDashboardSummary }>('/creators/me/dashboard');
  return res.data.summary;
};
