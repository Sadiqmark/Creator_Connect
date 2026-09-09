import { apiClient } from './client';

export interface BusinessPublicProfile {
  id: string;
  userId: string;
  businessName: string;
  category: string;
  description: string;
  city: string;
  stateOrProvince: string;
  country: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessPrivateProfile extends BusinessPublicProfile {
  collaborationEmail: string | null;
}

export interface BusinessProfileFormData {
  businessName: string;
  category: string;
  description: string;
  city: string;
  stateOrProvince: string;
  country: string;
  collaborationEmail: string;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  instagramUrl?: string | null;
}

export interface BusinessDashboardSummary {
  savedCreatorsCount: number;
  inquiriesTotal: number;
  inquiriesPending: number;
  inquiriesAccepted: number;
  inquiriesRejected: number;
  recentInquiries: Array<{
    id: string;
    status: string;
    collaborationType: string;
    creatorName: string | null;
    creatorPhotoUrl: string | null;
    createdAt: string;
  }>;
  recentSaved: Array<{
    id: string;
    name: string;
    profilePhotoUrl: string | null;
    niche: string;
    location: string;
    savedAt: string;
  }>;
}

export const getMyBusinessProfile = async (): Promise<BusinessPrivateProfile> => {
  const res = await apiClient.get<{ profile: BusinessPrivateProfile }>('/businesses/me');
  return res.data.profile;
};

export const updateMyBusinessProfile = async (
  data: BusinessProfileFormData
): Promise<BusinessPrivateProfile> => {
  const res = await apiClient.patch<{ profile: BusinessPrivateProfile }>('/businesses/me', data);
  return res.data.profile;
};

export const getPublicBusinessProfile = async (
  businessId: string
): Promise<BusinessPublicProfile> => {
  const res = await apiClient.get<{ profile: BusinessPublicProfile }>(`/businesses/${businessId}`);
  return res.data.profile;
};

export const getBusinessDashboard = async (): Promise<BusinessDashboardSummary> => {
  const res = await apiClient.get<{ summary: BusinessDashboardSummary }>('/businesses/me/dashboard');
  return res.data.summary;
};
