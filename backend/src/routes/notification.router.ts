import { Router } from 'express';
import {
  getNotificationsHandler,
  markNotificationReadHandler,
  markAllNotificationsReadHandler,
} from '../controllers/notification.controller';
import { authMiddleware } from '../middleware/authMiddleware';

export const notificationRouter = Router();

// All notification routes strictly require authentication
notificationRouter.use(authMiddleware);

/**
 * GET /api/v1/notifications
 * Retrieves recent notifications and unread count.
 */
notificationRouter.get('/', getNotificationsHandler);

/**
 * PATCH /api/v1/notifications/:id/read
 * Marks a specific notification as read.
 */
notificationRouter.patch('/:id/read', markNotificationReadHandler);

/**
 * POST /api/v1/notifications/mark-all-read
 * Marks all unread notifications as read.
 */
notificationRouter.post('/mark-all-read', markAllNotificationsReadHandler);
