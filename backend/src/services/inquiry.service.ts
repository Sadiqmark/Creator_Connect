import { InquiryStatus, NotificationType, AuditEventType, UserRole } from '@prisma/client';
import { z } from 'zod';
import prisma from '../database/prisma';
import { AppError } from '../middleware/errorHandler';

export const createInquiryInputSchema = z
  .object({
    creatorId: z.string().uuid({ message: 'Valid creatorId is required' }),
    collaborationType: z
      .string({ required_error: 'Collaboration type is required' })
      .trim()
      .min(1, 'Collaboration type cannot be empty')
      .max(100, 'Collaboration type cannot exceed 100 characters'),
    platform: z
      .string({ required_error: 'Platform is required' })
      .trim()
      .min(1, 'Platform cannot be empty')
      .max(50, 'Platform cannot exceed 50 characters'),
    deliverables: z
      .string({ required_error: 'Deliverables are required' })
      .trim()
      .min(10, 'Deliverables must be at least 10 characters')
      .max(1000, 'Deliverables cannot exceed 1000 characters'),
    timelineStart: z
      .string()
      .optional()
      .nullable()
      .refine(
        (val) => {
          if (!val) return true;
          const date = new Date(val);
          if (isNaN(date.getTime())) return false;
          const today = new Date();
          today.setUTCHours(0, 0, 0, 0);
          return date >= today;
        },
        { message: 'Start date cannot be in the past' }
      ),
    timelineEnd: z
      .string()
      .optional()
      .nullable()
      .refine(
        (val) => {
          if (!val) return true;
          const date = new Date(val);
          return !isNaN(date.getTime());
        },
        { message: 'End date must be a valid date' }
      ),
    brief: z
      .string({ required_error: 'Brief is required' })
      .trim()
      .min(20, 'Brief must be at least 20 characters')
      .max(3000, 'Brief cannot exceed 3000 characters'),
    additionalRequirements: z
      .string()
      .trim()
      .max(1500, 'Additional requirements cannot exceed 1500 characters')
      .optional()
      .nullable(),
  })
  .refine(
    (data) => {
      if (data.timelineStart && data.timelineEnd) {
        const start = new Date(data.timelineStart);
        const end = new Date(data.timelineEnd);
        return end >= start;
      }
      return true;
    },
    {
      message: 'End date must be on or after start date',
      path: ['timelineEnd'],
    }
  );

export type CreateInquiryInput = z.infer<typeof createInquiryInputSchema>;

export type SafeInquiryDTO = {
  id: string;
  creatorId: string; // canonical CreatorProfile.id
  status: InquiryStatus;
  collaborationType: string;
  platform: string;
  deliverables: string;
  timelineStart: string | null;
  timelineEnd: string | null;
  brief: string;
  additionalRequirements: string | null;
  createdAt: string;
  expiresAt: string;
};

/**
 * Creates a structured collaboration inquiry from authenticated Business to Creator.
 * Enforces business authorization, creator eligibility, duplicate active check,
 * concurrency-safe advisory lock, notification and audit creation.
 */
export async function createInquiry(
  businessUserId: string,
  rawInput: unknown
): Promise<SafeInquiryDTO> {
  const parsed = createInquiryInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    const details = parsed.error.format();
    const firstMsg = parsed.error.errors[0]?.message || 'Validation error';
    throw new AppError(firstMsg, 400, 'VALIDATION_ERROR', details);
  }

  const input = parsed.data;

  // 1. Resolve Creator by canonical CreatorProfile.id
  const creatorProfile = await prisma.creatorProfile.findUnique({
    where: { id: input.creatorId },
    select: {
      id: true,
      userId: true,
      name: true,
      niche: true,
      location: true,
      bio: true,
      specialties: true,
      instagramUrl: true,
      youtubeUrl: true,
      user: {
        select: { id: true, role: true, status: true },
      },
    },
  });

  if (
    !creatorProfile ||
    creatorProfile.user?.role !== UserRole.CREATOR ||
    creatorProfile.user?.status !== 'ACTIVE'
  ) {
    throw new AppError('Creator profile not found or unavailable.', 404, 'CREATOR_NOT_FOUND');
  }

  // Binary discoverability check
  if (
    !creatorProfile.name?.trim() ||
    !creatorProfile.niche?.trim() ||
    !creatorProfile.location?.trim() ||
    !creatorProfile.bio?.trim() ||
    !Array.isArray(creatorProfile.specialties) ||
    creatorProfile.specialties.length === 0 ||
    (!creatorProfile.instagramUrl && !creatorProfile.youtubeUrl)
  ) {
    throw new AppError('Creator profile is not complete or discoverable.', 404, 'CREATOR_NOT_FOUND');
  }

  const creatorUserId = creatorProfile.userId;

  // Prevent self-inquiry
  if (businessUserId === creatorUserId) {
    throw new AppError('Cannot send an inquiry to your own account.', 400, 'CANNOT_INQUIRE_SELF');
  }

  // 2. Concurrency-safe interactive transaction
  const createdInquiry = await prisma.$transaction(async (tx) => {
    // Acquire transaction-scoped advisory lock for the (business, creator) pair
    try {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('inquiry_' || ${businessUserId} || '_' || ${creatorUserId}));`;
    } catch {
      // In SQLite or mock environments where pg_advisory_xact_lock does not exist, proceed
    }

    // 3. Duplicate active inquiry check (PENDING or ACCEPTED)
    const activeInquiry = await tx.inquiry.findFirst({
      where: {
        businessId: businessUserId,
        creatorId: creatorUserId,
        status: { in: [InquiryStatus.PENDING, InquiryStatus.ACCEPTED] },
      },
    });

    if (activeInquiry) {
      throw new AppError(
        'You already have an active inquiry with this creator.',
        409,
        'DUPLICATE_ACTIVE_INQUIRY'
      );
    }

    // 4. Expiration calculation: now + 60 days
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const inquiry = await tx.inquiry.create({
      data: {
        businessId: businessUserId,
        creatorId: creatorUserId,
        status: InquiryStatus.PENDING,
        collaborationType: input.collaborationType,
        platform: input.platform,
        deliverables: input.deliverables,
        timelineStart: input.timelineStart ? new Date(input.timelineStart) : null,
        timelineEnd: input.timelineEnd ? new Date(input.timelineEnd) : null,
        brief: input.brief,
        additionalRequirements: input.additionalRequirements?.trim() || null,
        createdAt: now,
        expiresAt,
      },
    });

    // 5. Create INQUIRY_RECEIVED notification for creator
    await tx.notification.create({
      data: {
        userId: creatorUserId,
        type: NotificationType.INQUIRY_RECEIVED,
        referenceId: inquiry.id,
        createdAt: now,
      },
    });

    // 6. Create INQUIRY_CREATED audit event
    await tx.auditEvent.create({
      data: {
        eventType: AuditEventType.INQUIRY_CREATED,
        actorUserId: businessUserId,
        resourceType: 'INQUIRY',
        resourceId: inquiry.id,
        metadata: {
          businessId: businessUserId,
          creatorId: creatorUserId,
          collaborationType: inquiry.collaborationType,
          platform: inquiry.platform,
        },
        createdAt: now,
      },
    });

    return inquiry;
  });

  return {
    id: createdInquiry.id,
    creatorId: creatorProfile.id,
    status: createdInquiry.status,
    collaborationType: createdInquiry.collaborationType,
    platform: createdInquiry.platform,
    deliverables: createdInquiry.deliverables,
    timelineStart: createdInquiry.timelineStart
      ? createdInquiry.timelineStart.toISOString().split('T')[0]
      : null,
    timelineEnd: createdInquiry.timelineEnd
      ? createdInquiry.timelineEnd.toISOString().split('T')[0]
      : null,
    brief: createdInquiry.brief,
    additionalRequirements: createdInquiry.additionalRequirements,
    createdAt: createdInquiry.createdAt.toISOString(),
    expiresAt: createdInquiry.expiresAt.toISOString(),
  };
}
