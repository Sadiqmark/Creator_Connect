import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/requireRole';
import { UserRole } from '@prisma/client';
import {
  getMyProfile,
  upsertMyProfile,
  getPublicCreatorProfile,
  listCreators,
  getCreatorDashboard,
} from '../controllers/creator.controller';
import {
  listCreatorInquiriesHandler,
  getCreatorInquiryHandler,
} from '../controllers/inquiry.controller';
import { discoveryLimiter, profileUpdateLimiter } from '../middleware/rateLimiter';

export const creatorRouter = Router();

// ── Public routes (no auth required) ──────────────────────────────────────
// Decision: guests can browse creators (Phase 4A locked decision #2)
creatorRouter.get('/', discoveryLimiter, listCreators);
// NOTE: /me/dashboard, /me, and /me/inquiries must come BEFORE /:creatorId to avoid route conflicts
creatorRouter.get('/me/dashboard', authMiddleware, requireRole(UserRole.CREATOR), getCreatorDashboard);
creatorRouter.get('/me', authMiddleware, requireRole(UserRole.CREATOR), getMyProfile);
creatorRouter.patch('/me', authMiddleware, requireRole(UserRole.CREATOR), profileUpdateLimiter, upsertMyProfile);
creatorRouter.get('/me/inquiries', authMiddleware, requireRole(UserRole.CREATOR), listCreatorInquiriesHandler);
creatorRouter.get('/me/inquiries/:inquiryId', authMiddleware, requireRole(UserRole.CREATOR), getCreatorInquiryHandler);
creatorRouter.get('/:creatorId', getPublicCreatorProfile);

