import { Prisma } from '@prisma/client';
import prisma from '../database/prisma';
import { AppError } from '../middleware/errorHandler';

// ─── Predefined taxonomy ─────────────────────────────────────────────────────

export const BUSINESS_CATEGORIES = [
  'Fashion & Apparel', 'Food & Beverage', 'Beauty & Cosmetics',
  'Fitness & Wellness', 'Technology', 'Retail', 'E-commerce',
  'Travel & Hospitality', 'Finance & Banking', 'Education',
  'Media & Entertainment', 'Health & Healthcare', 'Real Estate',
  'Home & Lifestyle', 'Automotive', 'Sports',
  'Sustainability & Environment', 'Other',
] as const;

// ─── Safe public select (never includes collaborationEmail) ──────────────────

const PUBLIC_BUSINESS_SELECT = {
  id: true,
  userId: true,
  businessName: true,
  category: true,
  description: true,
  city: true,
  stateOrProvince: true,
  country: true,
  logoUrl: true,
  websiteUrl: true,
  instagramUrl: true,
  // collaborationEmail intentionally omitted
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.BusinessProfileSelect;

// ─── DTOs ────────────────────────────────────────────────────────────────────

export type BusinessPublicDTO = {
  id: string;
  userId: string;
  businessName: string;
  category: string;
  description: string;
  city: string;
  stateOrProvince: string;
  country: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type BusinessPrivateDTO = BusinessPublicDTO & {
  collaborationEmail: string | null;
};

export type BusinessDashboardSummaryDTO = {
  savedCreatorsCount: number;
  inquiriesTotal: number;
  inquiriesPending: number;
  inquiriesAccepted: number;
  inquiriesRejected: number;
  recentInquiries: Array<{
    id: string;
    status: string;
    collaborationType: string;
    creatorName: string | null;
    creatorPhotoUrl: string | null;
    createdAt: Date;
  }>;
  recentSaved: Array<{
    id: string;
    name: string;
    profilePhotoUrl: string | null;
    niche: string;
    location: string;
    savedAt: Date;
  }>;
};

// ─── Service functions ───────────────────────────────────────────────────────

/**
 * Get business owner's full private profile (includes collaborationEmail).
 */
export async function getMyBusinessProfile(userId: string): Promise<BusinessPrivateDTO> {
  const profile = await prisma.businessProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    throw new AppError('Business profile not found.', 404, 'PROFILE_NOT_FOUND');
  }

  return {
    id: profile.id,
    userId: profile.userId,
    businessName: profile.businessName,
    category: profile.category,
    description: profile.description,
    city: profile.city,
    stateOrProvince: profile.stateOrProvince,
    country: profile.country,
    collaborationEmail: profile.collaborationEmail,
    logoUrl: profile.logoUrl,
    websiteUrl: profile.websiteUrl,
    instagramUrl: profile.instagramUrl,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

/**
 * Upsert business profile. Ownership comes from authenticated userId — not request body.
 */
export async function upsertBusinessProfile(
  userId: string,
  data: {
    businessName: string;
    category: string;
    description: string;
    city: string;
    stateOrProvince: string;
    country: string;
    collaborationEmail: string;
    logoUrl?: string | null;
    websiteUrl?: string | null;
    instagramUrl?: string | null;
  }
): Promise<BusinessPrivateDTO> {
  const profile = await prisma.businessProfile.upsert({
    where: { userId },
    create: {
      userId,
      businessName: data.businessName,
      category: data.category,
      description: data.description,
      city: data.city,
      stateOrProvince: data.stateOrProvince,
      country: data.country,
      collaborationEmail: data.collaborationEmail,
      logoUrl: data.logoUrl ?? null,
      websiteUrl: data.websiteUrl ?? null,
      instagramUrl: data.instagramUrl ?? null,
    },
    update: {
      businessName: data.businessName,
      category: data.category,
      description: data.description,
      city: data.city,
      stateOrProvince: data.stateOrProvince,
      country: data.country,
      collaborationEmail: data.collaborationEmail,
      ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl } : {}),
      websiteUrl: data.websiteUrl ?? null,
      instagramUrl: data.instagramUrl ?? null,
    },
  });

  return {
    id: profile.id,
    userId: profile.userId,
    businessName: profile.businessName,
    category: profile.category,
    description: profile.description,
    city: profile.city,
    stateOrProvince: profile.stateOrProvince,
    country: profile.country,
    collaborationEmail: profile.collaborationEmail,
    logoUrl: profile.logoUrl,
    websiteUrl: profile.websiteUrl,
    instagramUrl: profile.instagramUrl,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

/**
 * Get public business profile by businessProfile.id — never includes collaborationEmail.
 * Used by Creators viewing a Business behind an inquiry.
 */
export async function getPublicBusinessProfileById(businessProfileId: string): Promise<BusinessPublicDTO | null> {
  const profile = await prisma.businessProfile.findUnique({
    where: { id: businessProfileId },
    select: PUBLIC_BUSINESS_SELECT,
  });

  if (!profile) return null;
  return profile;
}

/**
 * Business dashboard summary — aggregates from existing domain tables.
 * No Dashboard entity. No Dashboard table.
 */
export async function getBusinessDashboardSummary(userId: string): Promise<BusinessDashboardSummaryDTO> {
  const [savedCount, inquiryCounts, recentInquiries, recentSaved] = await Promise.all([
    prisma.savedCreator.count({ where: { businessId: userId } }),

    prisma.inquiry.groupBy({
      by: ['status'],
      where: { businessId: userId },
      _count: { status: true },
    }),

    prisma.inquiry.findMany({
      where: { businessId: userId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        id: true,
        status: true,
        collaborationType: true,
        createdAt: true,
        creator: {
          select: {
            creatorProfile: {
              select: { name: true, profilePhotoUrl: true },
            },
          },
        },
      },
    }),

    prisma.savedCreator.findMany({
      where: { businessId: userId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        createdAt: true,
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

  const countMap: Record<string, number> = {};
  for (const row of inquiryCounts) {
    countMap[row.status] = row._count.status;
  }

  return {
    savedCreatorsCount: savedCount,
    inquiriesTotal: Object.values(countMap).reduce((a, b) => a + b, 0),
    inquiriesPending: countMap['PENDING'] ?? 0,
    inquiriesAccepted: countMap['ACCEPTED'] ?? 0,
    inquiriesRejected: countMap['REJECTED'] ?? 0,
    recentInquiries: recentInquiries.map((inq) => ({
      id: inq.id,
      status: inq.status,
      collaborationType: inq.collaborationType,
      creatorName: inq.creator.creatorProfile?.name ?? null,
      creatorPhotoUrl: inq.creator.creatorProfile?.profilePhotoUrl ?? null,
      createdAt: inq.createdAt,
    })),
    recentSaved: recentSaved
      .filter((s) => s.creator.creatorProfile)
      .map((s) => ({
        id: s.creator.creatorProfile!.id,
        name: s.creator.creatorProfile!.name,
        profilePhotoUrl: s.creator.creatorProfile!.profilePhotoUrl,
        niche: s.creator.creatorProfile!.niche,
        location: s.creator.creatorProfile!.location,
        savedAt: s.createdAt,
      })),
  };
}
