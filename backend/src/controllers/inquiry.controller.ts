import { Request, Response, NextFunction } from 'express';
import { createInquiry, acceptInquiry, rejectInquiry } from '../services/inquiry.service';
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

export async function acceptInquiryHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const creatorUserId = req.user?.id;
    if (!creatorUserId) {
      throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
    }

    const { inquiryId } = req.params;
    if (!inquiryId) {
      throw new AppError('Inquiry ID is required.', 400, 'VALIDATION_ERROR');
    }

    const inquiry = await acceptInquiry(creatorUserId, inquiryId);
    res.status(200).json({ inquiry });
  } catch (error) {
    next(error);
  }
}

export async function rejectInquiryHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const creatorUserId = req.user?.id;
    if (!creatorUserId) {
      throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
    }

    const { inquiryId } = req.params;
    if (!inquiryId) {
      throw new AppError('Inquiry ID is required.', 400, 'VALIDATION_ERROR');
    }

    const inquiry = await rejectInquiry(creatorUserId, inquiryId);
    res.status(200).json({ inquiry });
  } catch (error) {
    next(error);
  }
}
