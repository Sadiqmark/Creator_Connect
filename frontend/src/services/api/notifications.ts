import { apiClient } from './client';
import {
  NotificationDTO,
  NotificationsListDTO,
  MarkAllReadResultDTO,
} from '@creator-connect/shared';

export const notificationKeys = {
  all: ['notifications'] as const,
};

export const notificationsApi = {
  getNotifications: async (limit = 20): Promise<NotificationsListDTO> => {
    const response = await apiClient.get<NotificationsListDTO>('/notifications', {
      params: { limit },
    });
    return response.data;
  },

  markNotificationAsRead: async (id: string): Promise<{ notification: NotificationDTO }> => {
    const response = await apiClient.patch<{ notification: NotificationDTO }>(
      `/notifications/${id}/read`
    );
    return response.data;
  },

  markAllNotificationsAsRead: async (): Promise<MarkAllReadResultDTO> => {
    const response = await apiClient.post<MarkAllReadResultDTO>(
      '/notifications/mark-all-read'
    );
    return response.data;
  },
};
