import { apiClient } from './client';

export interface UploadSignatureResponse {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
  publicId: string;
  public_id?: string;
}

/**
 * Requests signed Cloudinary upload parameters from the backend.
 * Uses authenticated apiClient with Bearer token injection.
 */
export const getUploadSignature = async (): Promise<UploadSignatureResponse> => {
  const response = await apiClient.post<UploadSignatureResponse>('/uploads/signature');
  return response.data;
};
