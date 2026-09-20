import { apiClient } from './client';
import { UserRole, AccountStatus } from '@creator-connect/shared';

export interface AppUser {
  id: string;
  firebaseUid?: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
  createdAt: string;
  deactivatedAt?: string | null;
  deletionScheduledAt?: string | null;
  daysRemaining?: number;
  isReactivatable?: boolean;
  displayName?: string | null;
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

export interface DeactivateResponse {
  message: string;
  deactivatedAt: string;
  deletionScheduledAt: string;
  daysRemaining: number;
}

export interface ReactivateResponse {
  message: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
    status: AccountStatus;
  };
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

  deactivate: async (): Promise<DeactivateResponse> => {
    const response = await apiClient.post<DeactivateResponse>('/auth/deactivate');
    return response.data;
  },

  reactivate: async (): Promise<ReactivateResponse> => {
    const response = await apiClient.post<ReactivateResponse>('/auth/reactivate');
    return response.data;
  },
};
