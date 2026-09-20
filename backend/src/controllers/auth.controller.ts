import { Request, Response } from 'express';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import prisma from '../database/prisma';
import { firebaseAdminAuth } from '../config/firebase';
import { logger } from '../middleware/logger';

const provisionSchema = z.object({
  role: z.nativeEnum(UserRole, {
    errorMap: () => ({ message: 'Role must be either CREATOR or BUSINESS.' }),
  }),
});

export const getMe = async (req: Request, res: Response): Promise<void> => {
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

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: {
      creatorProfile: true,
      businessProfile: true,
    },
  });

  if (!user || user.status === 'DELETED') {
    res.status(403).json({
      error: {
        code: 'ACCOUNT_DELETED',
        message: 'This account has been deleted.',
        requestId: req.id ? String(req.id) : undefined,
      },
    });
    return;
  }

  if (user.status === 'DEACTIVATED') {
    const now = new Date();
    const isReactivatable = user.deletionScheduledAt ? now < user.deletionScheduledAt : false;
    const daysRemaining = user.deletionScheduledAt
      ? Math.max(0, Math.ceil((user.deletionScheduledAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    const displayName =
      user.role === UserRole.CREATOR
        ? user.creatorProfile?.name || null
        : user.businessProfile?.businessName || null;

    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        deactivatedAt: user.deactivatedAt,
        deletionScheduledAt: user.deletionScheduledAt,
        daysRemaining,
        isReactivatable,
        displayName,
      },
      profile: null,
      onboardingCompleted: false,
    });
    return;
  }

  const hasProfile =
    user.role === UserRole.CREATOR ? !!user.creatorProfile : !!user.businessProfile;

  res.status(200).json({
    user: {
      id: user.id,
      firebaseUid: user.firebaseUid,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    },
    profile: user.creatorProfile || user.businessProfile || null,
    onboardingCompleted: hasProfile,
  });
};

export const provisionUser = async (req: Request, res: Response): Promise<void> => {
  const decoded = req.decodedToken;

  if (!decoded) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Valid token required for account provisioning.',
        requestId: req.id ? String(req.id) : undefined,
      },
    });
    return;
  }

  if (!decoded.emailVerified) {
    res.status(403).json({
      error: {
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Email verification is required before provisioning an account.',
        requestId: req.id ? String(req.id) : undefined,
      },
    });
    return;
  }

  const parseResult = provisionSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: {
        code: 'INVALID_ROLE',
        message: parseResult.error.errors[0]?.message || 'Invalid role specified.',
        requestId: req.id ? String(req.id) : undefined,
      },
    });
    return;
  }

  const { role } = parseResult.data;

  // Check if user already exists (Idempotent first-login protection)
  const existingUser = await prisma.user.findUnique({
    where: { firebaseUid: decoded.firebaseUid },
    include: {
      creatorProfile: true,
      businessProfile: true,
    },
  });

  if (existingUser) {
    const hasProfile =
      existingUser.role === UserRole.CREATOR
        ? !!existingUser.creatorProfile
        : !!existingUser.businessProfile;

    res.status(200).json({
      user: {
        id: existingUser.id,
        firebaseUid: existingUser.firebaseUid,
        email: existingUser.email,
        role: existingUser.role, // Server-authoritative, never overwritten
        status: existingUser.status,
        createdAt: existingUser.createdAt,
      },
      profile: existingUser.creatorProfile || existingUser.businessProfile || null,
      onboardingCompleted: hasProfile,
    });
    return;
  }

  // Provision new PostgreSQL user inside transaction
  try {
    const newUser = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          firebaseUid: decoded.firebaseUid,
          email: decoded.email,
          role,
          status: 'ACTIVE',
        },
      });

      await tx.auditEvent.create({
        data: {
          eventType: 'INQUIRY_CREATED', // Using established AuditEventType
          actorUserId: created.id,
          resourceType: 'USER',
          resourceId: created.id,
          metadata: {
            action: 'USER_PROVISIONED',
            role: created.role,
          },
        },
      });

      return created;
    });

    logger.info({ userId: newUser.id, role: newUser.role }, 'New user provisioned');

    res.status(201).json({
      user: {
        id: newUser.id,
        firebaseUid: newUser.firebaseUid,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
        createdAt: newUser.createdAt,
      },
      profile: null,
      onboardingCompleted: false,
    });
  } catch (error: any) {
    // Handle concurrent duplicate insert race condition
    if (error.code === 'P2002') {
      const duplicateUser = await prisma.user.findUnique({
        where: { firebaseUid: decoded.firebaseUid },
      });

      if (duplicateUser) {
        res.status(200).json({
          user: {
            id: duplicateUser.id,
            firebaseUid: duplicateUser.firebaseUid,
            email: duplicateUser.email,
            role: duplicateUser.role,
            status: duplicateUser.status,
            createdAt: duplicateUser.createdAt,
          },
          profile: null,
          onboardingCompleted: false,
        });
        return;
      }
    }

    logger.error({ error }, 'Failed to provision user');
    res.status(500).json({
      error: {
        code: 'PROVISION_FAILED',
        message: 'Failed to complete user provisioning.',
        requestId: req.id ? String(req.id) : undefined,
      },
    });
  }
};

/**
 * @deprecated Legacy endpoint. Delegates to deactivateAccount.
 * Under Phase 13B 3-tier lifecycle, accounts are deactivated for a 30-day grace period
 * before permanent deletion is executed by the background lifecycle runner.
 */
export const deleteAccount = async (req: Request, res: Response): Promise<void> => {
  return deactivateAccount(req, res);
};


export const deactivateAccount = async (req: Request, res: Response): Promise<void> => {
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

  const userId = req.user.id;
  const firebaseUid = req.user.firebaseUid;

  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, status: true },
  });

  if (!existingUser || existingUser.status === 'DELETED') {
    res.status(403).json({
      error: {
        code: 'ACCOUNT_DELETED',
        message: 'This account has been deleted.',
        requestId: req.id ? String(req.id) : undefined,
      },
    });
    return;
  }

  if (existingUser.status === 'DEACTIVATED') {
    res.status(409).json({
      error: {
        code: 'ACCOUNT_ALREADY_DEACTIVATED',
        message: 'This account is already deactivated.',
        requestId: req.id ? String(req.id) : undefined,
      },
    });
    return;
  }

  const now = new Date();
  const deletionScheduledAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  try {
    await prisma.$transaction(async (tx) => {
      const updateResult = await tx.user.updateMany({
        where: { id: userId, status: 'ACTIVE' },
        data: {
          status: 'DEACTIVATED',
          deactivatedAt: now,
          deletionScheduledAt,
        },
      });

      if (updateResult.count === 0) {
        throw new Error('CONCURRENT_STATE_CHANGE');
      }

      await tx.auditEvent.create({
        data: {
          eventType: 'ACCOUNT_DEACTIVATED',
          actorUserId: userId,
          resourceType: 'USER',
          resourceId: userId,
          metadata: {
            deactivatedAt: now.toISOString(),
            deletionScheduledAt: deletionScheduledAt.toISOString(),
          },
        },
      });
    });

    // Pre-revocation DB status guard: verify account is still DEACTIVATED before network dispatch
    try {
      const statusCheck = await prisma.user.findUnique({
        where: { id: userId },
        select: { status: true },
      });

      if (statusCheck?.status === 'DEACTIVATED') {
        await firebaseAdminAuth.revokeRefreshTokens(firebaseUid);
      } else {
        logger.info({ userId }, 'Skipping Firebase revokeRefreshTokens: account is no longer DEACTIVATED');
      }
    } catch (fbErr: any) {
      logger.warn({ error: fbErr.message, userId }, 'Firebase revokeRefreshTokens warning on deactivation');
    }

    res.status(200).json({
      message: 'Account successfully deactivated. You have 30 days to reactivate before permanent deletion.',
      deactivatedAt: now.toISOString(),
      deletionScheduledAt: deletionScheduledAt.toISOString(),
      daysRemaining: 30,
    });
  } catch (err: any) {
    if (err.message === 'CONCURRENT_STATE_CHANGE') {
      const rechecked = await prisma.user.findUnique({
        where: { id: userId },
        select: { status: true },
      });
      if (rechecked?.status === 'DEACTIVATED') {
        res.status(409).json({
          error: {
            code: 'ACCOUNT_ALREADY_DEACTIVATED',
            message: 'This account is already deactivated.',
            requestId: req.id ? String(req.id) : undefined,
          },
        });
        return;
      }
    }

    logger.error({ error: err }, 'Failed to deactivate account');
    res.status(500).json({
      error: {
        code: 'DEACTIVATE_FAILED',
        message: 'Failed to process account deactivation.',
        requestId: req.id ? String(req.id) : undefined,
      },
    });
  }
};

export const reactivateAccount = async (req: Request, res: Response): Promise<void> => {
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

  const userId = req.user.id;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Row-level lock to prevent concurrent reactivation/deactivation races
      const [user]: any = await tx.$queryRaw`
        SELECT id, status, deletion_scheduled_at, email, role
        FROM users
        WHERE id = ${userId}::uuid
        FOR UPDATE;
      `;

      if (!user) {
        return { status: 404, code: 'USER_NOT_FOUND', message: 'User not found.' };
      }

      if (user.status === 'DELETED') {
        return { status: 403, code: 'ACCOUNT_DELETED', message: 'This account has been deleted.' };
      }

      if (user.status === 'ACTIVE') {
        return { status: 409, code: 'ACCOUNT_ALREADY_ACTIVE', message: 'Account is already active.' };
      }

      if (user.status !== 'DEACTIVATED') {
        return { status: 400, code: 'INVALID_STATUS', message: 'Account cannot be reactivated.' };
      }

      const now = new Date();
      if (user.deletion_scheduled_at && now >= new Date(user.deletion_scheduled_at)) {
        return {
          status: 410,
          code: 'GRACE_PERIOD_EXPIRED',
          message: 'The 30-day reactivation grace period has expired.',
        };
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          status: 'ACTIVE',
          deactivatedAt: null,
          deletionScheduledAt: null,
        },
      });

      await tx.auditEvent.create({
        data: {
          eventType: 'ACCOUNT_REACTIVATED',
          actorUserId: userId,
          resourceType: 'USER',
          resourceId: userId,
          metadata: {
            reactivatedAt: now.toISOString(),
          },
        },
      });

      return {
        status: 200,
        data: {
          id: user.id,
          email: user.email,
          role: user.role,
          status: 'ACTIVE',
        },
      };
    });

    if (result.status !== 200) {
      res.status(result.status).json({
        error: {
          code: result.code,
          message: result.message,
          requestId: req.id ? String(req.id) : undefined,
        },
      });
      return;
    }

    res.status(200).json({
      message: 'Account successfully reactivated.',
      user: result.data,
    });
  } catch (err: any) {
    logger.error({ error: err }, 'Failed to reactivate account');
    res.status(500).json({
      error: {
        code: 'REACTIVATE_FAILED',
        message: 'Failed to reactivate account.',
        requestId: req.id ? String(req.id) : undefined,
      },
    });
  }
};
