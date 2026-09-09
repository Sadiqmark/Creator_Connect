import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/requireRole';
import { UserRole } from '@prisma/client';
import {
  getMyProfile,
  upsertMyProfile,
  getPublicBusinessProfile,
  getBusinessDashboard,
} from '../controllers/business.controller';

export const businessRouter = Router();

// Private business routes — must precede /:businessId to prevent route parameter collision
businessRouter.get('/me', authMiddleware, requireRole(UserRole.BUSINESS), getMyProfile);
businessRouter.patch('/me', authMiddleware, requireRole(UserRole.BUSINESS), upsertMyProfile);
businessRouter.get('/me/dashboard', authMiddleware, requireRole(UserRole.BUSINESS), getBusinessDashboard);

// Public/Creator view of business profile
businessRouter.get('/:businessId', getPublicBusinessProfile);
