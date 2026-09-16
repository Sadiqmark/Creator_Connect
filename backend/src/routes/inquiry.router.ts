import { Router } from 'express';
import {
  createInquiryHandler,
  acceptInquiryHandler,
  rejectInquiryHandler,
  listBusinessInquiriesHandler,
  getBusinessInquiryHandler,
} from '../controllers/inquiry.controller';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/requireRole';
import { UserRole } from '@prisma/client';

const router = Router();

/**
 * GET /api/v1/inquiries
 * Lists all inquiries sent by the authenticated Business with pagination and status filtering.
 * Strictly restricted to BUSINESS role.
 */
router.get(
  '/',
  authMiddleware,
  requireRole(UserRole.BUSINESS),
  listBusinessInquiriesHandler
);

/**
 * GET /api/v1/inquiries/:inquiryId
 * Retrieves full details of a specific inquiry owned by the authenticated Business.
 * Strictly restricted to BUSINESS role.
 */
router.get(
  '/:inquiryId',
  authMiddleware,
  requireRole(UserRole.BUSINESS),
  getBusinessInquiryHandler
);

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
