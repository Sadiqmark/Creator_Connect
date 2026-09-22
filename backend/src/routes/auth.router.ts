import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import {
  getMe,
  provisionUser,
  deleteAccount,
  deactivateAccount,
  reactivateAccount,
} from '../controllers/auth.controller';
import { lifecycleLimiter } from '../middleware/rateLimiter';

export const authRouter = Router();

// Retrieve authenticated user and onboarding state
authRouter.get('/me', authMiddleware, getMe);

// First-time role provisioning (requires verified email)
authRouter.post('/provision', authMiddleware, lifecycleLimiter, provisionUser);

// Account deactivation (30-day grace period)
authRouter.post('/deactivate', authMiddleware, lifecycleLimiter, deactivateAccount);

// Account reactivation (within 30-day grace period)
authRouter.post('/reactivate', authMiddleware, lifecycleLimiter, reactivateAccount);

// Account soft deletion (legacy/admin)
authRouter.post('/delete-account', authMiddleware, lifecycleLimiter, deleteAccount);
