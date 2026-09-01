import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
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

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN_ROLE',
          message: `Access denied. This action requires ${allowedRoles.join(' or ')} role.`,
          requestId: req.id ? String(req.id) : undefined,
        },
      });
      return;
    }

    next();
  };
};
