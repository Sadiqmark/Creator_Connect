import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/requireRole';
import { uploadSignatureLimiter } from '../middleware/rateLimiter';
import { getUploadSignatureHandler } from '../controllers/upload.controller';

export const uploadRouter = Router();

// POST /api/v1/uploads/signature
uploadRouter.post(
  '/signature',
  authMiddleware,
  requireRole(UserRole.CREATOR, UserRole.BUSINESS),
  uploadSignatureLimiter,
  getUploadSignatureHandler
);
