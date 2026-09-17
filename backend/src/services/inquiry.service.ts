import { InquiryStatus, NotificationType, AuditEventType, UserRole, Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../database/prisma';
import { AppError } from '../middleware/errorHandler';
import { computeDiscoverability, PUBLIC_CREATOR_SELECT } from './creator.service';
import { PUBLIC_BUSINESS_SELECT } from './business.service';

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
  respondedAt?: string | null;
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
      profilePhotoUrl: true,
      collaborationEmail: true,
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

  // Canonical discoverability check
  const { isDiscoverable } = computeDiscoverability(creatorProfile);
  if (!isDiscoverable) {
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
    respondedAt: createdInquiry.respondedAt ? createdInquiry.respondedAt.toISOString() : null,
  };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function mapToSafeInquiryDTO(
  inquiry: {
    id: string;
    status: InquiryStatus;
    collaborationType: string;
    platform: string;
    deliverables: string;
    timelineStart: Date | null;
    timelineEnd: Date | null;
    brief: string;
    additionalRequirements: string | null;
    createdAt: Date;
    expiresAt: Date;
    respondedAt?: Date | null;
  },
  canonicalCreatorProfileId: string
): SafeInquiryDTO {
  return {
    id: inquiry.id,
    creatorId: canonicalCreatorProfileId,
    status: inquiry.status,
    collaborationType: inquiry.collaborationType,
    platform: inquiry.platform,
    deliverables: inquiry.deliverables,
    timelineStart: inquiry.timelineStart
      ? inquiry.timelineStart.toISOString().split('T')[0]
      : null,
    timelineEnd: inquiry.timelineEnd
      ? inquiry.timelineEnd.toISOString().split('T')[0]
      : null,
    brief: inquiry.brief,
    additionalRequirements: inquiry.additionalRequirements,
    createdAt: inquiry.createdAt.toISOString(),
    expiresAt: inquiry.expiresAt.toISOString(),
    respondedAt: inquiry.respondedAt ? inquiry.respondedAt.toISOString() : null,
  };
}

/**
 * Executes an atomic creator-driven state transition (PENDING -> ACCEPTED or PENDING -> REJECTED).
 * Enforces ownership check, privacy-preserving 404 for foreign inquiries, 409 for invalid state,
 * atomic compare-and-swap update, notification creation, and audit event logging inside a single transaction.
 */
async function transitionInquiryByCreator(
  creatorUserId: string,
  inquiryId: string,
  targetStatus: typeof InquiryStatus.ACCEPTED | typeof InquiryStatus.REJECTED
): Promise<SafeInquiryDTO> {
  if (!inquiryId || !UUID_REGEX.test(inquiryId)) {
    throw new AppError('Inquiry not found.', 404, 'INQUIRY_NOT_FOUND');
  }

  const now = new Date();

  return prisma.$transaction(async (tx) => {
    // 1. Ownership and existence lookup
    const inquiry = await tx.inquiry.findUnique({
      where: { id: inquiryId },
      include: {
        creator: {
          select: {
            creatorProfile: {
              select: { id: true },
            },
          },
        },
      },
    });

    // Privacy-preserving: if not found or belongs to another creator, return 404
    if (!inquiry || inquiry.creatorId !== creatorUserId) {
      throw new AppError('Inquiry not found.', 404, 'INQUIRY_NOT_FOUND');
    }

    // 2. Validate current state is PENDING
    if (inquiry.status !== InquiryStatus.PENDING) {
      throw new AppError('Inquiry is no longer pending.', 409, 'INVALID_INQUIRY_STATE');
    }

    // 3. Atomic conditional update (compare-and-swap)
    const updateResult = await tx.inquiry.updateMany({
      where: {
        id: inquiryId,
        creatorId: creatorUserId,
        status: InquiryStatus.PENDING,
      },
      data: {
        status: targetStatus,
        respondedAt: now,
      },
    });

    if (updateResult.count === 0) {
      throw new AppError('Inquiry is no longer pending.', 409, 'INVALID_INQUIRY_STATE');
    }

    // 4. Create Notification for the business
    const notificationType =
      targetStatus === InquiryStatus.ACCEPTED
        ? NotificationType.INQUIRY_ACCEPTED
        : NotificationType.INQUIRY_REJECTED;

    await tx.notification.create({
      data: {
        userId: inquiry.businessId,
        type: notificationType,
        referenceId: inquiry.id,
        createdAt: now,
      },
    });

    // 5. Create AuditEvent
    const auditEventType =
      targetStatus === InquiryStatus.ACCEPTED
        ? AuditEventType.INQUIRY_ACCEPTED
        : AuditEventType.INQUIRY_REJECTED;

    await tx.auditEvent.create({
      data: {
        eventType: auditEventType,
        actorUserId: creatorUserId,
        resourceType: 'INQUIRY',
        resourceId: inquiry.id,
        metadata: {
          previousStatus: InquiryStatus.PENDING,
          newStatus: targetStatus,
        },
        createdAt: now,
      },
    });

    const canonicalCreatorProfileId =
      inquiry.creator.creatorProfile?.id ?? inquiry.creatorId;

    return mapToSafeInquiryDTO(
      {
        ...inquiry,
        status: targetStatus,
        respondedAt: now,
      },
      canonicalCreatorProfileId
    );
  });
}

/**
 * Creator accepts a PENDING collaboration inquiry.
 * Atomically transitions PENDING -> ACCEPTED, sets respondedAt, creates notification and audit event.
 */
export async function acceptInquiry(
  creatorUserId: string,
  inquiryId: string
): Promise<SafeInquiryDTO> {
  return transitionInquiryByCreator(creatorUserId, inquiryId, InquiryStatus.ACCEPTED);
}

/**
 * Creator rejects a PENDING collaboration inquiry.
 * Atomically transitions PENDING -> REJECTED, sets respondedAt, creates notification and audit event.
 */
export async function rejectInquiry(
  creatorUserId: string,
  inquiryId: string
): Promise<SafeInquiryDTO> {
  return transitionInquiryByCreator(creatorUserId, inquiryId, InquiryStatus.REJECTED);
}

/**
 * Core expiration transition function.
 * Idempotently scans for PENDING inquiries where expiresAt <= now,
 * transitions each atomically to EXPIRED without updating respondedAt,
 * and emits an INQUIRY_EXPIRED notification and audit event inside a single transaction per item.
 */
export async function expireInquiries(batchSize = 100): Promise<{ expiredCount: number }> {
  const now = new Date();

  const staleInquiries = await prisma.inquiry.findMany({
    where: {
      status: InquiryStatus.PENDING,
      expiresAt: { lte: now },
    },
    take: batchSize,
    select: {
      id: true,
      businessId: true,
      creatorId: true,
    },
  });

  if (staleInquiries.length === 0) {
    return { expiredCount: 0 };
  }

  let expiredCount = 0;

  for (const item of staleInquiries) {
    const transitioned = await prisma.$transaction(async (tx) => {
      // Atomic conditional update
      const updateResult = await tx.inquiry.updateMany({
        where: {
          id: item.id,
          status: InquiryStatus.PENDING,
          expiresAt: { lte: now },
        },
        data: {
          status: InquiryStatus.EXPIRED,
        },
      });

      if (updateResult.count === 0) {
        return false;
      }

      // Create INQUIRY_EXPIRED notification for business
      await tx.notification.create({
        data: {
          userId: item.businessId,
          type: NotificationType.INQUIRY_EXPIRED,
          referenceId: item.id,
          createdAt: now,
        },
      });

      // Create INQUIRY_EXPIRED audit event
      await tx.auditEvent.create({
        data: {
          eventType: AuditEventType.INQUIRY_EXPIRED,
          actorUserId: null,
          resourceType: 'INQUIRY',
          resourceId: item.id,
          metadata: {
            previousStatus: InquiryStatus.PENDING,
            newStatus: InquiryStatus.EXPIRED,
          },
          createdAt: now,
        },
      });

      return true;
    });

    if (transitioned) {
      expiredCount++;
    }
  }

  return { expiredCount };
}

// ─── Business Inquiry Management DTOs & Services (Phase 9) ───────────────────

export type BusinessInquiryListItemDTO = {
  id: string;
  status: InquiryStatus;
  collaborationType: string;
  platform: string;
  deliverables: string;
  timelineStart: string | null;
  timelineEnd: string | null;
  createdAt: string;
  expiresAt: string;
  respondedAt: string | null;
  creator: {
    id: string; // canonical CreatorProfile.id
    name: string;
    profilePhotoUrl: string | null;
    niche: string;
    location: string;
  };
};

export type InquiryCreatorContactDTO = {
  name: string;
  collaborationEmail: string | null;
  instagramUrl: string | null;
  youtubeUrl: string | null;
};

export type BusinessInquiryDetailDTO = {
  id: string;
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
  respondedAt: string | null;
  closedAt: string | null;
  creator: {
    id: string; // canonical CreatorProfile.id
    name: string;
    profilePhotoUrl: string | null;
    niche: string;
    location: string;
    bio: string;
    specialties: string[];
    instagramUrl: string | null;
    youtubeUrl: string | null;
  };
  contact: InquiryCreatorContactDTO | null;
};

export type ListBusinessInquiriesResult = {
  inquiries: BusinessInquiryListItemDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

/**
 * List inquiries sent by the authenticated business with optional status filter and pagination.
 * Strictly scopes by businessId to prevent cross-business access.
 */
export async function listBusinessInquiries(
  businessUserId: string,
  options: {
    status?: InquiryStatus;
    page?: number;
    limit?: number;
  }
): Promise<ListBusinessInquiriesResult> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(50, Math.max(1, options.limit || 10));
  const skip = (page - 1) * limit;

  const where: Prisma.InquiryWhereInput = {
    businessId: businessUserId,
  };

  if (options.status) {
    if (!Object.values(InquiryStatus).includes(options.status)) {
      throw new AppError('Invalid status filter.', 400, 'INVALID_STATUS_FILTER');
    }
    where.status = options.status;
  }

  const [total, inquiries] = await Promise.all([
    prisma.inquiry.count({ where }),
    prisma.inquiry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        creator: {
          select: {
            creatorProfile: {
              select: {
                id: true,
                name: true,
                profilePhotoUrl: true,
                niche: true,
                location: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    inquiries: inquiries.map((inq) => {
      const cp = inq.creator.creatorProfile;
      return {
        id: inq.id,
        status: inq.status,
        collaborationType: inq.collaborationType,
        platform: inq.platform,
        deliverables: inq.deliverables,
        timelineStart: inq.timelineStart
          ? inq.timelineStart.toISOString().split('T')[0]
          : null,
        timelineEnd: inq.timelineEnd
          ? inq.timelineEnd.toISOString().split('T')[0]
          : null,
        createdAt: inq.createdAt.toISOString(),
        expiresAt: inq.expiresAt.toISOString(),
        respondedAt: inq.respondedAt ? inq.respondedAt.toISOString() : null,
        creator: {
          id: cp?.id ?? inq.creatorId,
          name: cp?.name ?? 'Creator',
          profilePhotoUrl: cp?.profilePhotoUrl ?? null,
          niche: cp?.niche ?? '',
          location: cp?.location ?? '',
        },
      };
    }),
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

/**
 * Retrieves full details of an inquiry for the authenticated business.
 * Privacy-preserving: returns 404 INQUIRY_NOT_FOUND if inquiry does not exist
 * or if it belongs to a different business.
 * Controlled Contact Exchange: includes creator contact DTO strictly when
 * inquiry status is ACCEPTED, creator user is ACTIVE, and not deleted.
 */
export async function getBusinessInquiryById(
  businessUserId: string,
  inquiryId: string
): Promise<BusinessInquiryDetailDTO> {
  if (!inquiryId || !UUID_REGEX.test(inquiryId)) {
    throw new AppError('Inquiry not found.', 404, 'INQUIRY_NOT_FOUND');
  }

  const inquiry = await prisma.inquiry.findUnique({
    where: { id: inquiryId },
    include: {
      creator: {
        select: {
          id: true,
          status: true,
          deletedAt: true,
          creatorProfile: {
            select: {
              ...PUBLIC_CREATOR_SELECT,
              collaborationEmail: true,
            },
          },
        },
      },
    },
  });

  if (!inquiry || inquiry.businessId !== businessUserId) {
    throw new AppError('Inquiry not found.', 404, 'INQUIRY_NOT_FOUND');
  }

  const creatorUser = inquiry.creator;
  const cp = creatorUser?.creatorProfile;

  if (!creatorUser || !cp) {
    throw new AppError('Inquiry not found.', 404, 'INQUIRY_NOT_FOUND');
  }

  const isEligibleForContact =
    inquiry.status === InquiryStatus.ACCEPTED &&
    creatorUser.status === 'ACTIVE' &&
    creatorUser.deletedAt === null;

  const contact: InquiryCreatorContactDTO | null = isEligibleForContact
    ? {
        name: cp.name,
        collaborationEmail: cp.collaborationEmail ?? null,
        instagramUrl: cp.instagramUrl ?? null,
        youtubeUrl: cp.youtubeUrl ?? null,
      }
    : null;

  return {
    id: inquiry.id,
    status: inquiry.status,
    collaborationType: inquiry.collaborationType,
    platform: inquiry.platform,
    deliverables: inquiry.deliverables,
    timelineStart: inquiry.timelineStart
      ? inquiry.timelineStart.toISOString().split('T')[0]
      : null,
    timelineEnd: inquiry.timelineEnd
      ? inquiry.timelineEnd.toISOString().split('T')[0]
      : null,
    brief: inquiry.brief,
    additionalRequirements: inquiry.additionalRequirements,
    createdAt: inquiry.createdAt.toISOString(),
    expiresAt: inquiry.expiresAt.toISOString(),
    respondedAt: inquiry.respondedAt ? inquiry.respondedAt.toISOString() : null,
    closedAt: inquiry.closedAt ? inquiry.closedAt.toISOString() : null,
    creator: {
      id: cp.id,
      name: cp.name,
      profilePhotoUrl: cp.profilePhotoUrl ?? null,
      niche: cp.niche,
      location: cp.location,
      bio: cp.bio,
      specialties: cp.specialties,
      instagramUrl: cp.instagramUrl ?? null,
      youtubeUrl: cp.youtubeUrl ?? null,
    },
    contact,
  };
}


// ─── Creator Inquiry Management DTOs & Services (Phase 10) ───────────────────

export type CreatorInquiryBusinessSummaryDTO = {
  id: string; // BusinessProfile.id
  businessName: string;
  logoUrl: string | null;
  category: string;
  city: string;
  country: string;
};

export type CreatorInquiryBusinessDetailDTO = CreatorInquiryBusinessSummaryDTO & {
  description: string;
  stateOrProvince: string;
  websiteUrl: string | null;
  instagramUrl: string | null;
};

export type CreatorInquiryListItemDTO = {
  id: string;
  status: InquiryStatus;
  collaborationType: string;
  platform: string;
  deliverables: string;
  timelineStart: string | null;
  timelineEnd: string | null;
  createdAt: string;
  expiresAt: string;
  respondedAt: string | null;
  business: CreatorInquiryBusinessSummaryDTO;
};

export type InquiryBusinessContactDTO = {
  businessName: string;
  collaborationEmail: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
};

export type CreatorInquiryDetailDTO = {
  id: string;
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
  respondedAt: string | null;
  closedAt: string | null;
  business: CreatorInquiryBusinessDetailDTO;
  contact: InquiryBusinessContactDTO | null;
};

export type ListCreatorInquiriesResult = {
  inquiries: CreatorInquiryListItemDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

/**
 * List inquiries received by the authenticated creator with optional status filter and pagination.
 * Strictly scopes by creatorId to prevent cross-creator access.
 */
export async function listCreatorInquiries(
  creatorUserId: string,
  options: {
    status?: InquiryStatus;
    page?: number;
    limit?: number;
  }
): Promise<ListCreatorInquiriesResult> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(50, Math.max(1, options.limit || 10));
  const skip = (page - 1) * limit;

  const where: Prisma.InquiryWhereInput = {
    creatorId: creatorUserId,
  };

  if (options.status) {
    if (!Object.values(InquiryStatus).includes(options.status)) {
      throw new AppError('Invalid status filter.', 400, 'INVALID_STATUS_FILTER');
    }
    where.status = options.status;
  }

  const [total, inquiries] = await Promise.all([
    prisma.inquiry.count({ where }),
    prisma.inquiry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        business: {
          select: {
            businessProfile: {
              select: {
                id: true,
                businessName: true,
                logoUrl: true,
                category: true,
                city: true,
                country: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    inquiries: inquiries.map((inq) => {
      const bp = inq.business.businessProfile;
      return {
        id: inq.id,
        status: inq.status,
        collaborationType: inq.collaborationType,
        platform: inq.platform,
        deliverables: inq.deliverables,
        timelineStart: inq.timelineStart
          ? inq.timelineStart.toISOString().split('T')[0]
          : null,
        timelineEnd: inq.timelineEnd
          ? inq.timelineEnd.toISOString().split('T')[0]
          : null,
        createdAt: inq.createdAt.toISOString(),
        expiresAt: inq.expiresAt.toISOString(),
        respondedAt: inq.respondedAt ? inq.respondedAt.toISOString() : null,
        business: {
          id: bp?.id ?? inq.businessId,
          businessName: bp?.businessName ?? '',
          logoUrl: bp?.logoUrl ?? null,
          category: bp?.category ?? '',
          city: bp?.city ?? '',
          country: bp?.country ?? '',
        },
      };
    }),
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

/**
 * Retrieves full details of an inquiry for the authenticated creator.
 * Privacy-preserving: returns 404 INQUIRY_NOT_FOUND if inquiry does not exist,
 * has malformed UUID, or if it belongs to a different creator.
 * Controlled Contact Exchange: includes business contact DTO strictly when
 * inquiry status is ACCEPTED, business user is ACTIVE, and not deleted.
 */
export async function getCreatorInquiryById(
  creatorUserId: string,
  inquiryId: string
): Promise<CreatorInquiryDetailDTO> {
  if (!inquiryId || !UUID_REGEX.test(inquiryId)) {
    throw new AppError('Inquiry not found.', 404, 'INQUIRY_NOT_FOUND');
  }

  const inquiry = await prisma.inquiry.findUnique({
    where: { id: inquiryId },
    include: {
      business: {
        select: {
          id: true,
          status: true,
          deletedAt: true,
          businessProfile: {
            select: {
              ...PUBLIC_BUSINESS_SELECT,
              collaborationEmail: true,
            },
          },
        },
      },
    },
  });

  if (!inquiry || inquiry.creatorId !== creatorUserId) {
    throw new AppError('Inquiry not found.', 404, 'INQUIRY_NOT_FOUND');
  }

  const businessUser = inquiry.business;
  const bp = businessUser?.businessProfile;

  if (!businessUser || !bp) {
    throw new AppError('Inquiry not found.', 404, 'INQUIRY_NOT_FOUND');
  }

  const isEligibleForContact =
    inquiry.status === InquiryStatus.ACCEPTED &&
    businessUser.status === 'ACTIVE' &&
    businessUser.deletedAt === null;

  const contact: InquiryBusinessContactDTO | null = isEligibleForContact
    ? {
        businessName: bp.businessName,
        collaborationEmail: bp.collaborationEmail ?? null,
        websiteUrl: bp.websiteUrl ?? null,
        instagramUrl: bp.instagramUrl ?? null,
      }
    : null;

  return {
    id: inquiry.id,
    status: inquiry.status,
    collaborationType: inquiry.collaborationType,
    platform: inquiry.platform,
    deliverables: inquiry.deliverables,
    timelineStart: inquiry.timelineStart
      ? inquiry.timelineStart.toISOString().split('T')[0]
      : null,
    timelineEnd: inquiry.timelineEnd
      ? inquiry.timelineEnd.toISOString().split('T')[0]
      : null,
    brief: inquiry.brief,
    additionalRequirements: inquiry.additionalRequirements,
    createdAt: inquiry.createdAt.toISOString(),
    expiresAt: inquiry.expiresAt.toISOString(),
    respondedAt: inquiry.respondedAt ? inquiry.respondedAt.toISOString() : null,
    closedAt: inquiry.closedAt ? inquiry.closedAt.toISOString() : null,
    business: {
      id: bp.id,
      businessName: bp.businessName,
      logoUrl: bp.logoUrl ?? null,
      category: bp.category,
      description: bp.description,
      city: bp.city,
      stateOrProvince: bp.stateOrProvince,
      country: bp.country,
      websiteUrl: bp.websiteUrl ?? null,
      instagramUrl: bp.instagramUrl ?? null,
    },
    contact,
  };
}
