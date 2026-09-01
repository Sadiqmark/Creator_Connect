import { useQuery } from '@tanstack/react-query';
import { HealthCheckResponse } from '@creator-connect/shared';
import { apiClient } from './client';

export const fetchHealthCheck = async (): Promise<HealthCheckResponse> => {
  const response = await apiClient.get<HealthCheckResponse>('/health');
  return response.data;
};

export const useHealthCheck = () => {
  return useQuery({
    queryKey: ['health-check'],
    queryFn: fetchHealthCheck,
    retry: 2,
    staleTime: 10000,
  });
};
