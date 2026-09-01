import { Request, Response, NextFunction } from 'express';
import { firebaseAdminAuth } from '../config/firebase';
import prisma from '../database/prisma';
import { logger } from './logger';
import '../types/auth';

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      error: {
        code: 'MISSING_TOKEN',
        message: 'Authentication token is required.',
        requestId: req.id ? String(req.id) : undefined,
      },
    });
    return;
  }

  const parts = authHeader.trim().split(/\s+/);

  if (parts[0] !== 'Bearer') {
    res.status(401).json({
      error: {
        code: 'MALFORMED_TOKEN',
        message: 'Authorization header must use Bearer scheme.',
        requestId: req.id ? String(req.id) : undefined,
      },
    });
    return;
  }

  const token = parts[1]?.trim();

  if (!token) {
    res.status(401).json({
      error: {
        code: 'MISSING_TOKEN',
        message: 'Bearer token cannot be empty.',
        requestId: req.id ? String(req.id) : undefined,
      },
    });
    return;
  }

  try {
    const decodedToken = await firebaseAdminAuth.verifyIdToken(token);

    // Strict Email Verification Gate
    if (!decodedToken.email_verified) {
      res.status(403).json({
        error: {
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Email verification is required before accessing the application.',
          requestId: req.id ? String(req.id) : undefined,
        },
      });
      return;
    }

    req.decodedToken = {
      firebaseUid: decodedToken.uid,
      email: decodedToken.email || '',
      emailVerified: true,
    };

    // Look up application user in PostgreSQL
    const user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
    });

    if (!user) {
      // Allow initial provisioning endpoint to proceed with verified token
      const isProvisionRoute =
        req.path === '/provision' ||
        (req.baseUrl && req.baseUrl.endsWith('/auth') && req.path === '/provision') ||
        (req.originalUrl && req.originalUrl.includes('/auth/provision'));

      if (isProvisionRoute) {
        next();
        return;
      }

      res.status(401).json({
        error: {
          code: 'USER_NOT_PROVISIONED',
          message: 'User account is not yet provisioned. Please complete role selection.',
          requestId: req.id ? String(req.id) : undefined,
        },
      });
      return;
    }

    if (user.status === 'DELETED') {
      res.status(403).json({
        error: {
          code: 'ACCOUNT_DELETED',
          message: 'This account has been deleted and cannot perform application operations.',
          requestId: req.id ? String(req.id) : undefined,
        },
      });
      return;
    }

    req.user = {
      id: user.id,
      firebaseUid: user.firebaseUid,
      email: user.email,
      emailVerified: true,
      role: user.role,
      status: user.status,
    };

    next();
  } catch (error: any) {
    logger.warn({ error: error.message, code: error.code }, 'Firebase token verification failed');

    if (error.code === 'auth/id-token-expired') {
      res.status(401).json({
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Your session has expired. Please log in again.',
          requestId: req.id ? String(req.id) : undefined,
        },
      });
      return;
    }

    res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Authentication token is invalid.',
        requestId: req.id ? String(req.id) : undefined,
      },
    });
  }
};
