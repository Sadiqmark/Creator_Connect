import { Request, Response } from 'express';
import { z } from 'zod';
import { UserRole, InquiryStatus } from '@prisma/client';
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

export const deleteAccount = async (req: Request, res: Response): Promise<void> => {
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

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Soft delete user
      await tx.user.update({
        where: { id: userId },
        data: {
          status: 'DELETED',
          deletedAt: new Date(),
        },
      });

      // 2. Clear private collaboration email on profiles
      await tx.creatorProfile.updateMany({
        where: { userId },
        data: { collaborationEmail: null },
      });

      await tx.businessProfile.updateMany({
        where: { userId },
        data: { collaborationEmail: null },
      });

      // 3. Cascade active inquiries (PENDING, ACCEPTED) to CLOSED
      await tx.inquiry.updateMany({
        where: {
          OR: [{ businessId: userId }, { creatorId: userId }],
          status: { in: [InquiryStatus.PENDING, InquiryStatus.ACCEPTED] },
        },
        data: {
          status: InquiryStatus.CLOSED,
          closedAt: new Date(),
        },
      });

      // 4. Record audit event
      await tx.auditEvent.create({
        data: {
          eventType: 'ACCOUNT_DELETED',
          actorUserId: userId,
          resourceType: 'USER',
          resourceId: userId,
          metadata: { action: 'SOFT_DELETE' },
        },
      });
    });

    // 5. Disable user in Firebase
    try {
      await firebaseAdminAuth.updateUser(firebaseUid, { disabled: true });
      await firebaseAdminAuth.revokeRefreshTokens(firebaseUid);
    } catch (fbErr: any) {
      logger.warn({ error: fbErr.message }, 'Firebase user disable error on account deletion');
    }

    res.status(200).json({
      message: 'Account successfully deleted.',
    });
  } catch (error: any) {
    logger.error({ error }, 'Failed to delete account');
    res.status(500).json({
      error: {
        code: 'DELETE_ACCOUNT_FAILED',
        message: 'Failed to process account deletion.',
        requestId: req.id ? String(req.id) : undefined,
      },
    });
  }
};
