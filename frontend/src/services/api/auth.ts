import { apiClient } from './client';
import { UserRole, AccountStatus } from '@creator-connect/shared';

export interface AppUser {
  id: string;
  firebaseUid: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
  createdAt: string;
}

export interface AuthMeResponse {
  user: AppUser;
  profile: any | null;
  onboardingCompleted: boolean;
}

export interface ProvisionResponse {
  user: AppUser;
  profile: any | null;
  onboardingCompleted: boolean;
}

export const authApi = {
  getMe: async (): Promise<AuthMeResponse> => {
    const response = await apiClient.get<AuthMeResponse>('/auth/me');
    return response.data;
  },

  provision: async (role: UserRole): Promise<ProvisionResponse> => {
    const response = await apiClient.post<ProvisionResponse>('/auth/provision', { role });
    return response.data;
  },

  deleteAccount: async (): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/auth/delete-account');
    return response.data;
  },
};
