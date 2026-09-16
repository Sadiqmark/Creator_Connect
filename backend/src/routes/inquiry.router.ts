import { Router } from 'express';
import {
  createInquiryHandler,
  acceptInquiryHandler,
  rejectInquiryHandler,
} from '../controllers/inquiry.controller';
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

/**
 * POST /api/v1/inquiries/:inquiryId/accept
 * Target Creator accepts a PENDING collaboration inquiry.
 * Strictly restricted to CREATOR role.
 */
router.post(
  '/:inquiryId/accept',
  authMiddleware,
  requireRole(UserRole.CREATOR),
  acceptInquiryHandler
);

/**
 * POST /api/v1/inquiries/:inquiryId/reject
 * Target Creator rejects a PENDING collaboration inquiry.
 * Strictly restricted to CREATOR role.
 */
router.post(
  '/:inquiryId/reject',
  authMiddleware,
  requireRole(UserRole.CREATOR),
  rejectInquiryHandler
);

export default router;
