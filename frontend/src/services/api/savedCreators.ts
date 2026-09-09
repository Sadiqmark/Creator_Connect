import { apiClient } from './client';
import { CreatorPublicProfile, PaginationMeta } from './creators';

export interface SavedCreatorItem {
  id: string;
  savedAt: string;
  creator: CreatorPublicProfile;
}

export interface ListSavedCreatorsResponse {
  savedCreators: SavedCreatorItem[];
  pagination: PaginationMeta;
}

export const listSavedCreators = async (params?: {
  page?: number;
  limit?: number;
}): Promise<ListSavedCreatorsResponse> => {
  const res = await apiClient.get<ListSavedCreatorsResponse>('/saved-creators', { params });
  return res.data;
};

export const saveCreator = async (
  creatorId: string
): Promise<{ savedCreator: SavedCreatorItem }> => {
  const res = await apiClient.post<{ savedCreator: SavedCreatorItem }>(
    `/saved-creators/${creatorId}`
  );
  return res.data;
};

export const unsaveCreator = async (
  creatorId: string
): Promise<{ success: boolean; message: string }> => {
  const res = await apiClient.delete<{ success: boolean; message: string }>(
    `/saved-creators/${creatorId}`
  );
  return res.data;
};

export const getSavedCreatorIds = async (): Promise<string[]> => {
  const res = await apiClient.get<{ ids: string[] }>('/saved-creators/ids');
  return res.data.ids;
};
