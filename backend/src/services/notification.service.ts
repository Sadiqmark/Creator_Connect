import prisma from '../database/prisma';
import { AppError } from '../middleware/errorHandler';
import { NotificationDTO, NotificationsListDTO, MarkAllReadResultDTO } from '@creator-connect/shared';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * List recent notifications for the authenticated user along with current unread count.
 * Strictly scoped to userId using the composite index [userId, readAt, createdAt(sort: Desc)].
 */
export async function listNotifications(
  userId: string,
  limit = 20
): Promise<NotificationsListDTO> {
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));

  const [unreadCount, records] = await Promise.all([
    prisma.notification.count({
      where: {
        userId,
        readAt: null,
      },
    }),
    prisma.notification.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: safeLimit,
      select: {
        id: true,
        type: true,
        referenceId: true,
        readAt: true,
        createdAt: true,
      },
    }),
  ]);

  const notifications: NotificationDTO[] = records.map((record) => ({
    id: record.id,
    type: record.type,
    referenceId: record.referenceId,
    readAt: record.readAt ? record.readAt.toISOString() : null,
    createdAt: record.createdAt.toISOString(),
  }));

  return {
    notifications,
    unreadCount,
  };
}

/**
 * Mark a single notification as read for the authenticated user.
 * Idempotent: if already read, returns 200 without executing a database write.
 * Privacy-preserving: returns 404 NOTIFICATION_NOT_FOUND if notification does not exist or belongs to another user.
 */
export async function markNotificationAsRead(
  userId: string,
  notificationId: string
): Promise<NotificationDTO> {
  if (!notificationId || !UUID_REGEX.test(notificationId)) {
    throw new AppError('Valid notification ID is required.', 400, 'VALIDATION_ERROR');
  }

  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  // Strict ownership and privacy guard: never reveal existence to other users
  if (!notification || notification.userId !== userId) {
    throw new AppError('Notification not found.', 404, 'NOTIFICATION_NOT_FOUND');
  }

  // Idempotent return if already marked as read
  if (notification.readAt !== null) {
    return {
      id: notification.id,
      type: notification.type,
      referenceId: notification.referenceId,
      readAt: notification.readAt.toISOString(),
      createdAt: notification.createdAt.toISOString(),
    };
  }

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
    select: {
      id: true,
      type: true,
      referenceId: true,
      readAt: true,
      createdAt: true,
    },
  });

  return {
    id: updated.id,
    type: updated.type,
    referenceId: updated.referenceId,
    readAt: updated.readAt ? updated.readAt.toISOString() : null,
    createdAt: updated.createdAt.toISOString(),
  };
}

/**
 * Mark all unread notifications as read for the authenticated user.
 * Idempotent: returns { updatedCount: 0 } if 0 unread notifications exist.
 */
export async function markAllNotificationsAsRead(
  userId: string
): Promise<MarkAllReadResultDTO> {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  return {
    updatedCount: result.count,
  };
}
