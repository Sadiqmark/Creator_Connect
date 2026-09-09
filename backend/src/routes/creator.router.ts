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

export const creatorRouter = Router();

// ── Public routes (no auth required) ──────────────────────────────────────
// Decision: guests can browse creators (Phase 4A locked decision #2)
creatorRouter.get('/', listCreators);
// NOTE: /me/dashboard and /me must come BEFORE /:creatorId to avoid route conflicts
creatorRouter.get('/me/dashboard', authMiddleware, requireRole(UserRole.CREATOR), getCreatorDashboard);
creatorRouter.get('/me', authMiddleware, requireRole(UserRole.CREATOR), getMyProfile);
creatorRouter.patch('/me', authMiddleware, requireRole(UserRole.CREATOR), upsertMyProfile);
creatorRouter.get('/:creatorId', getPublicCreatorProfile);
