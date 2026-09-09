import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/requireRole';
import { UserRole } from '@prisma/client';
import {
  listSavedCreators,
  saveCreator,
  unsaveCreator,
  getSavedCreatorIds,
} from '../controllers/savedCreator.controller';

export const savedCreatorRouter = Router();

// All saved creator endpoints require authenticated BUSINESS role
savedCreatorRouter.use(authMiddleware, requireRole(UserRole.BUSINESS));

savedCreatorRouter.get('/', listSavedCreators);
savedCreatorRouter.get('/ids', getSavedCreatorIds);
savedCreatorRouter.post('/:creatorId', saveCreator);
savedCreatorRouter.delete('/:creatorId', unsaveCreator);
