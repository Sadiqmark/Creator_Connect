import { Request, Response, NextFunction } from 'express';
import { createInquiry } from '../services/inquiry.service';
import { AppError } from '../middleware/errorHandler';

export async function createInquiryHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessUserId = req.user?.id;
    if (!businessUserId) {
      throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
    }

    const inquiry = await createInquiry(businessUserId, req.body);
    res.status(201).json({ inquiry });
  } catch (error) {
    next(error);
  }
}
