import { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../middleware/logger';
import * as creatorService from '../services/creator.service';

// ─── Validation schemas ──────────────────────────────────────────────────────

const updateCreatorProfileSchema = z.object({
  name: z.string().trim().min(1, 'Creator name is required').max(150),
  niche: z.string().trim().min(1, 'Primary niche is required').max(100),
  location: z.string().trim().min(1, 'Location is required').max(150),
  bio: z.string().trim().min(1, 'Bio is required').max(2000),
  specialties: z
    .array(z.string().trim().min(1))
    .min(1, 'At least one specialty is required')
    .max(10),
  instagramUrl: z
    .string()
    .trim()
    .url('Enter a valid Instagram URL')
    .refine((v) => v.includes('instagram.com'), 'Enter a valid Instagram URL (instagram.com/...)')
    .nullable()
    .optional(),
  youtubeUrl: z
    .string()
    .trim()
    .url('Enter a valid YouTube URL')
    .refine((v) => v.includes('youtube.com'), 'Enter a valid YouTube URL (youtube.com/...)')
    .nullable()
    .optional(),
  collaborationEmail: z
    .string()
    .trim()
    .email('A valid email address is required')
    .max(255)
    .nullable()
    .optional(),
  profilePhotoUrl: z.string().trim().url().max(500).nullable().optional(),
}).refine(
  (data) => !!(data.instagramUrl || data.youtubeUrl),
  {
    message: 'At least one social profile (Instagram or YouTube) is required.',
    path: ['socialProfile'],
  }
);

// ─── Controller functions ────────────────────────────────────────────────────

/**
 * GET /api/v1/creators/me
 * Returns authenticated creator's own private profile (includes collaborationEmail).
 */
export const getMyProfile = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.', requestId: req.id } });
    return;
  }

  try {
    const profile = await creatorService.getMyCreatorProfile(req.user.id);
    res.status(200).json({ profile });
  } catch (err: any) {
    if (err.statusCode === 404) {
      res.status(404).json({ error: { code: err.code, message: err.message, requestId: req.id } });
      return;
    }
    logger.error({ err }, 'Failed to get creator profile');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load profile.', requestId: req.id } });
  }
};

/**
 * PATCH /api/v1/creators/me
 * Create or update authenticated creator's profile.
 * Ownership derived from token — no client-supplied userId accepted.
 */
export const upsertMyProfile = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.', requestId: req.id } });
    return;
  }

  const parseResult = updateCreatorProfileSchema.safeParse(req.body);
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
    const profile = await creatorService.upsertCreatorProfile(req.user.id, parseResult.data);
    res.status(200).json({ profile });
  } catch (err: any) {
    if (err.statusCode === 422) {
      res.status(422).json({ error: { code: err.code, message: err.message, requestId: req.id } });
      return;
    }
    logger.error({ err }, 'Failed to upsert creator profile');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to save profile.', requestId: req.id } });
  }
};

/**
 * GET /api/v1/creators/:creatorId
 * Public creator profile — no auth required, never includes collaborationEmail.
 */
export const getPublicCreatorProfile = async (req: Request, res: Response): Promise<void> => {
  const { creatorId } = req.params;

  try {
    const profile = await creatorService.getPublicCreatorProfileById(creatorId);
    if (!profile) {
      res.status(404).json({ error: { code: 'CREATOR_NOT_FOUND', message: 'Creator profile not found.', requestId: req.id } });
      return;
    }
    // Non-discoverable profiles are not publicly surfaced via direct URL
    if (!profile.isDiscoverable) {
      res.status(404).json({ error: { code: 'CREATOR_NOT_FOUND', message: 'Creator profile not found.', requestId: req.id } });
      return;
    }
    res.status(200).json({ profile });
  } catch (err: any) {
    logger.error({ err }, 'Failed to get public creator profile');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load profile.', requestId: req.id } });
  }
};

/**
 * GET /api/v1/creators
 * List discoverable creators — no auth required for browsing.
 */
export const listCreators = async (req: Request, res: Response): Promise<void> => {
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const niche = typeof req.query.niche === 'string' ? req.query.niche : undefined;

  try {
    const creators = await creatorService.listDiscoverableCreators({ search, niche });
    res.status(200).json({ creators });
  } catch (err: any) {
    logger.error({ err }, 'Failed to list creators');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load creators.', requestId: req.id } });
  }
};

/**
 * GET /api/v1/creators/me/dashboard
 * Creator dashboard summary — authenticated CREATOR only.
 */
export const getCreatorDashboard = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.', requestId: req.id } });
    return;
  }

  try {
    const summary = await creatorService.getCreatorDashboardSummary(req.user.id);
    res.status(200).json({ summary });
  } catch (err: any) {
    logger.error({ err }, 'Failed to get creator dashboard');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load dashboard.', requestId: req.id } });
  }
};
