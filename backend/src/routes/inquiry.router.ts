import { Router } from 'express';
import { createInquiryHandler } from '../controllers/inquiry.controller';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/requireRole';
import { UserRole } from '@prisma/client';

const router = Router();

/**
 * POST /api/v1/inquiries
 * Creates a structured inquiry from authenticated Business to Creator.
 * Strictly restricted to BUSINESS role.
 */
router.post(
  '/',
  authMiddleware,
  requireRole(UserRole.BUSINESS),
  createInquiryHandler
);

export default router;
