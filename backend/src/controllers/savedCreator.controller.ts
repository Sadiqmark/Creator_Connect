import { Request, Response } from 'express';
import { logger } from '../middleware/logger';
import * as savedCreatorService from '../services/savedCreator.service';

/**
 * GET /api/v1/saved-creators
 * List saved creators for authenticated business.
 */
export const listSavedCreators = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.', requestId: req.id } });
    return;
  }

  const page = req.query.page !== undefined ? Number(req.query.page) : undefined;
  const limit = req.query.limit !== undefined ? Number(req.query.limit) : undefined;

  try {
    const result = await savedCreatorService.listSavedCreators(req.user.id, { page, limit });
    res.status(200).json(result);
  } catch (err: any) {
    logger.error({ err }, 'Failed to list saved creators');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load saved creators.', requestId: req.id } });
  }
};

/**
 * GET /api/v1/saved-creators/ids
 * Fast lookup of saved creator IDs for the authenticated business.
 */
export const getSavedCreatorIds = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.', requestId: req.id } });
    return;
  }

  try {
    const ids = await savedCreatorService.getSavedCreatorProfileIds(req.user.id);
    res.status(200).json({ ids });
  } catch (err: any) {
    logger.error({ err }, 'Failed to get saved creator IDs');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load saved IDs.', requestId: req.id } });
  }
};

/**
 * POST /api/v1/saved-creators/:creatorId
 * Save a creator for authenticated business.
 */
export const saveCreator = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.', requestId: req.id } });
    return;
  }

  const { creatorId } = req.params;

  try {
    const savedItem = await savedCreatorService.saveCreator(req.user.id, creatorId);
    res.status(201).json({ savedCreator: savedItem });
  } catch (err: any) {
    if (err.statusCode) {
      res.status(err.statusCode).json({ error: { code: err.code, message: err.message, requestId: req.id } });
      return;
    }
    logger.error({ err }, 'Failed to save creator');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to save creator.', requestId: req.id } });
  }
};

/**
 * DELETE /api/v1/saved-creators/:creatorId
 * Unsave a creator for authenticated business.
 */
export const unsaveCreator = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.', requestId: req.id } });
    return;
  }

  const { creatorId } = req.params;

  try {
    await savedCreatorService.unsaveCreator(req.user.id, creatorId);
    res.status(200).json({ success: true, message: 'Creator removed from saved list.' });
  } catch (err: any) {
    if (err.statusCode) {
      res.status(err.statusCode).json({ error: { code: err.code, message: err.message, requestId: req.id } });
      return;
    }
    logger.error({ err }, 'Failed to unsave creator');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to unsave creator.', requestId: req.id } });
  }
};
