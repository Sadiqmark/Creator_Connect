import { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../middleware/logger';
import * as businessService from '../services/business.service';

// ─── Validation schemas ──────────────────────────────────────────────────────

const updateBusinessProfileSchema = z.object({
  businessName: z.string().trim().min(1, 'Business name is required').max(150),
  category: z.string().trim().min(1, 'Business category is required').max(100),
  description: z.string().trim().min(1, 'Description is required').max(2000),
  city: z.string().trim().min(1, 'City is required').max(100),
  stateOrProvince: z.string().trim().min(1, 'State or Province is required').max(100),
  country: z.string().trim().min(1, 'Country is required').max(100),
  collaborationEmail: z.string().trim().email('A valid email address is required').max(255),
  logoUrl: z.string().trim().url('Enter a valid logo URL').max(500).nullable().optional(),
  websiteUrl: z.string().trim().url('Enter a valid website URL').max(500).nullable().optional(),
  instagramUrl: z
    .string()
    .trim()
    .url('Enter a valid Instagram URL')
    .refine((v) => v.includes('instagram.com'), 'Enter a valid Instagram URL (instagram.com/...)')
    .nullable()
    .optional(),
});

// ─── Controller functions ────────────────────────────────────────────────────

/**
 * GET /api/v1/businesses/me
 * Returns authenticated business owner's private profile (includes collaborationEmail).
 */
export const getMyProfile = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.', requestId: req.id } });
    return;
  }

  try {
    const profile = await businessService.getMyBusinessProfile(req.user.id);
    res.status(200).json({ profile });
  } catch (err: any) {
    if (err.statusCode === 404) {
      res.status(404).json({ error: { code: err.code, message: err.message, requestId: req.id } });
      return;
    }
    logger.error({ err }, 'Failed to get business profile');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load profile.', requestId: req.id } });
  }
};

/**
 * PATCH /api/v1/businesses/me
 * Create or update authenticated business owner's profile.
 * Ownership derived from token — no client-supplied userId accepted.
 */
export const upsertMyProfile = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.', requestId: req.id } });
    return;
  }

  const parseResult = updateBusinessProfileSchema.safeParse(req.body);
  if (!parseResult.success) {
    const fieldErrors = parseResult.error.flatten().fieldErrors;
    const formErrors = parseResult.error.flatten().formErrors;
    res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed.',
        requestId: req.id,
        details: { fieldErrors, formErrors },
      },
    });
    return;
  }

  try {
    const profile = await businessService.upsertBusinessProfile(req.user.id, parseResult.data);
    res.status(200).json({ profile });
  } catch (err: any) {
    if (err.statusCode === 422) {
      res.status(422).json({ error: { code: err.code, message: err.message, requestId: req.id } });
      return;
    }
    logger.error({ err }, 'Failed to upsert business profile');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to save profile.', requestId: req.id } });
  }
};

/**
 * GET /api/v1/businesses/:businessId
 * Public business profile by ID (businessProfile.id) — never includes collaborationEmail.
 */
export const getPublicBusinessProfile = async (req: Request, res: Response): Promise<void> => {
  const { businessId } = req.params;

  try {
    const profile = await businessService.getPublicBusinessProfileById(businessId);
    if (!profile) {
      res.status(404).json({ error: { code: 'BUSINESS_NOT_FOUND', message: 'Business profile not found.', requestId: req.id } });
      return;
    }
    res.status(200).json({ profile });
  } catch (err: any) {
    logger.error({ err }, 'Failed to get public business profile');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load profile.', requestId: req.id } });
  }
};

/**
 * GET /api/v1/businesses/me/dashboard
 * Business dashboard summary — authenticated BUSINESS only.
 */
export const getBusinessDashboard = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.', requestId: req.id } });
    return;
  }

  try {
    const summary = await businessService.getBusinessDashboardSummary(req.user.id);
    res.status(200).json({ summary });
  } catch (err: any) {
    logger.error({ err }, 'Failed to get business dashboard');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load dashboard.', requestId: req.id } });
  }
};
