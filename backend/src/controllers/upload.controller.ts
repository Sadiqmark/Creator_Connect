import { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../middleware/logger';
import * as uploadService from '../services/upload.service';

// Strict schema ensuring no client-controlled parameters are accepted
const uploadSignatureSchema = z.object({}).strict();

/**
 * POST /api/v1/uploads/signature
 * Generates signed parameters for authenticated Cloudinary profile image uploads.
 * All upload parameters (folder, public_id, timestamp) are strictly server-controlled.
 */
export const getUploadSignatureHandler = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required.',
        requestId: req.id ? String(req.id) : undefined,
      },
    });
    return;
  }

  // Reject any client-supplied parameters in request body
  const parseResult = uploadSignatureSchema.safeParse(req.body || {});
  if (!parseResult.success) {
    res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Upload signature endpoint does not accept client-controlled parameters.',
        requestId: req.id ? String(req.id) : undefined,
        details: parseResult.error.flatten(),
      },
    });
    return;
  }

  try {
    const signatureData = uploadService.generateUploadSignature(req.user.id);
    res.status(200).json(signatureData);
  } catch (err: any) {
    logger.error({ err, userId: req.user.id }, 'Failed to generate upload signature');
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to generate upload signature.',
        requestId: req.id ? String(req.id) : undefined,
      },
    });
  }
};
