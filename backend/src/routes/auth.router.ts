import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { getMe, provisionUser, deleteAccount } from '../controllers/auth.controller';

export const authRouter = Router();

// Retrieve authenticated user and onboarding state
authRouter.get('/me', authMiddleware, getMe);

// First-time role provisioning (requires verified email)
authRouter.post('/provision', authMiddleware, provisionUser);

// Account soft deletion
authRouter.post('/delete-account', authMiddleware, deleteAccount);
