import { Prisma, UserRole } from '@prisma/client';
import prisma from '../database/prisma';
import { AppError } from '../middleware/errorHandler';
import {
  CreatorPublicDTO,
  PUBLIC_CREATOR_SELECT,
  toPublicCreatorDTO,
} from './creator.service';

export type SavedCreatorItemDTO = {
  id: string;
  savedAt: Date;
  creator: CreatorPublicDTO;
};

export type PaginatedSavedCreatorsResponse = {
  savedCreators: SavedCreatorItemDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
};

/**
 * Save a creator for the authenticated business.
 * creatorProfileId is canonical CreatorProfile.id.
 */
export async function saveCreator(
  businessUserId: string,
  creatorProfileId: string
): Promise<SavedCreatorItemDTO> {
  const profile = await prisma.creatorProfile.findUnique({
    where: { id: creatorProfileId },
    select: {
      ...PUBLIC_CREATOR_SELECT,
      userId: true,
      user: {
        select: { id: true, role: true, status: true },
      },
    },
  });

  if (!profile || profile.user?.role !== UserRole.CREATOR || profile.user?.status !== 'ACTIVE') {
    throw new AppError('Creator profile not found or unavailable.', 404, 'CREATOR_NOT_FOUND');
  }

  // Binary discoverability: required fields must be non-empty
  if (
    !profile.name?.trim() ||
    !profile.niche?.trim() ||
    !profile.location?.trim() ||
    !profile.bio?.trim() ||
    !Array.isArray(profile.specialties) ||
    profile.specialties.length === 0 ||
    (!profile.instagramUrl && !profile.youtubeUrl)
  ) {
    throw new AppError('Creator profile not found or unavailable.', 404, 'CREATOR_NOT_FOUND');
  }

  try {
    const saved = await prisma.savedCreator.create({
      data: {
        businessId: businessUserId,
        creatorId: profile.userId,
      },
    });

    return {
      id: saved.id,
      savedAt: saved.createdAt,
      creator: toPublicCreatorDTO(profile),
    };
  } catch (err: any) {
    if (err.code === 'P2002' || err.message?.includes('Unique constraint failed')) {
      throw new AppError('Creator is already saved.', 409, 'DUPLICATE_SAVED_CREATOR');
    }
    throw err;
  }
}

/**
 * Unsave a creator for the authenticated business.
 * creatorProfileId is canonical CreatorProfile.id.
 */
export async function unsaveCreator(
  businessUserId: string,
  creatorProfileId: string
): Promise<{ success: boolean }> {
  const profile = await prisma.creatorProfile.findUnique({
    where: { id: creatorProfileId },
    select: { userId: true },
  });

  if (!profile) {
    throw new AppError('Saved creator not found.', 404, 'SAVED_CREATOR_NOT_FOUND');
  }

  const deleteResult = await prisma.savedCreator.deleteMany({
    where: {
      businessId: businessUserId,
      creatorId: profile.userId,
    },
  });

  if (deleteResult.count === 0) {
    throw new AppError('Saved creator not found.', 404, 'SAVED_CREATOR_NOT_FOUND');
  }

  return { success: true };
}

/**
 * List saved creators for the authenticated business with pagination.
 * Excludes deleted/unavailable creators.
 */
export async function listSavedCreators(
  businessUserId: string,
  options?: { page?: number; limit?: number }
): Promise<PaginatedSavedCreatorsResponse> {
  const page = Math.max(1, Number(options?.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(options?.limit) || 24));
  const skip = (page - 1) * limit;

  const where: Prisma.SavedCreatorWhereInput = {
    businessId: businessUserId,
    creator: {
      status: 'ACTIVE',
    },
  };

  let total = 0;
  let records: any[] = [];

  try {
    const [countRes, findRes] = await Promise.all([
      prisma.savedCreator.count({ where }),
      prisma.savedCreator.findMany({
        where,
        include: {
          creator: {
            include: {
              creatorProfile: {
                select: PUBLIC_CREATOR_SELECT,
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);
    total = countRes;
    records = findRes;
  } catch (err: any) {
    if (err?.name === 'PrismaClientInitializationError') {
      records = await prisma.savedCreator.findMany({
        where,
        include: {
          creator: {
            include: {
              creatorProfile: {
                select: PUBLIC_CREATOR_SELECT,
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      });
      total = records.length;
    } else {
      throw err;
    }
  }

  const savedCreators: SavedCreatorItemDTO[] = records
    .filter((r) => r.creator.creatorProfile !== null)
    .map((r) => ({
      id: r.id,
      savedAt: r.createdAt,
      creator: toPublicCreatorDTO(r.creator.creatorProfile!),
    }));

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    savedCreators,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

/**
 * Get all saved CreatorProfile IDs for the authenticated business.
 * Enables quick lookup of heart button states in the UI.
 */
export async function getSavedCreatorProfileIds(businessUserId: string): Promise<string[]> {
  const records = await prisma.savedCreator.findMany({
    where: {
      businessId: businessUserId,
      creator: {
        status: 'ACTIVE',
      },
    },
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

  return records
    .map((r) => r.creator.creatorProfile?.id)
    .filter((id): id is string => Boolean(id));
}
