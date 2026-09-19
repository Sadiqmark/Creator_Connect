import { Request, Response, NextFunction } from 'express';
import {
  listNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../services/notification.service';
import { AppError } from '../middleware/errorHandler';

/**
 * GET /api/v1/notifications
 * Retrieves paginated recent notifications and unread count for the authenticated user.
 */
export async function getNotificationsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
    }

    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const result = await listNotifications(userId, limit);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/v1/notifications/:id/read
 * Marks a single notification as read for the authenticated user.
 */
export async function markNotificationReadHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;
    const notification = await markNotificationAsRead(userId, id);

    res.status(200).json({ notification });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/notifications/mark-all-read
 * Marks all unread notifications as read for the authenticated user.
 */
export async function markAllNotificationsReadHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
    }

    const result = await markAllNotificationsAsRead(userId);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
