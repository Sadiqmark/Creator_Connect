import { Prisma } from '@prisma/client';
import prisma from '../database/prisma';
import { AppError } from '../middleware/errorHandler';

// ─── Predefined taxonomy values ─────────────────────────────────────────────

export const CREATOR_NICHES = [
  'Fashion', 'Food & Beverage', 'Travel', 'Beauty & Skincare',
  'Fitness & Wellness', 'Technology', 'Lifestyle', 'Business & Finance',
  'Education', 'Gaming', 'Music', 'Art & Design', 'Health & Nutrition',
  'Parenting & Family', 'Sports', 'Photography', 'Comedy & Entertainment',
  'Home & Interior', 'Sustainability', 'Other',
] as const;

export const CREATOR_SPECIALTIES = [
  'Instagram Reels', 'YouTube Long-form', 'YouTube Shorts', 'TikTok',
  'Photography', 'Product Reviews', 'Unboxing', 'Tutorials & How-to',
  'Lifestyle Vlogs', 'Travel Vlogs', 'Food & Recipes', 'Fitness Content',
  'Beauty & Makeup', 'Fashion Styling', 'Educational Content',
  'Comedy & Skits', 'Brand Storytelling', 'Events & Experiences',
] as const;

// ─── Safe public select (never includes collaborationEmail) ──────────────────

const PUBLIC_CREATOR_SELECT = {
  id: true,
  userId: true,
  name: true,
  profilePhotoUrl: true,
  niche: true,
  location: true,
  bio: true,
  specialties: true,
  instagramUrl: true,
  youtubeUrl: true,
  // collaborationEmail intentionally omitted
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.CreatorProfileSelect;

// ─── DTOs ────────────────────────────────────────────────────────────────────

export type CreatorPublicDTO = {
  id: string;
  userId: string;
  name: string;
  profilePhotoUrl: string | null;
  niche: string;
  location: string;
  bio: string;
  specialties: string[];
  instagramUrl: string | null;
  youtubeUrl: string | null;
  isDiscoverable: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CreatorPrivateDTO = CreatorPublicDTO & {
  collaborationEmail: string | null;
};

export type CreatorDashboardSummaryDTO = {
  isDiscoverable: boolean;
  missingFields: string[];
  inquiriesTotal: number;
  inquiriesPending: number;
  inquiriesAccepted: number;
  inquiriesRejected: number;
  recentInquiries: Array<{
    id: string;
    status: string;
    collaborationType: string;
    businessName: string | null;
    businessLogoUrl: string | null;
    createdAt: Date;
  }>;
};

// ─── Discoverability logic (no DB column, computed from fields) ──────────────

export function computeDiscoverability(profile: {
  name: string;
  niche: string;
  location: string;
  bio: string;
  specialties: string[];
  instagramUrl: string | null;
  youtubeUrl: string | null;
}): { isDiscoverable: boolean; missingFields: string[] } {
  const missing: string[] = [];

  if (!profile.name?.trim()) missing.push('name');
  if (!profile.niche?.trim()) missing.push('niche');
  if (!profile.location?.trim()) missing.push('location');
  if (!profile.bio?.trim()) missing.push('bio');
  if (!profile.specialties || profile.specialties.length === 0) missing.push('specialties');
  if (!profile.instagramUrl && !profile.youtubeUrl) missing.push('socialProfile');

  return { isDiscoverable: missing.length === 0, missingFields: missing };
}

// ─── Service functions ───────────────────────────────────────────────────────

/**
 * Get the authenticated creator's own full profile (includes collaborationEmail).
 */
export async function getMyCreatorProfile(userId: string): Promise<CreatorPrivateDTO> {
  const profile = await prisma.creatorProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    throw new AppError('Creator profile not found.', 404, 'PROFILE_NOT_FOUND');
  }

  const { isDiscoverable } = computeDiscoverability(profile);

  return {
    id: profile.id,
    userId: profile.userId,
    name: profile.name,
    profilePhotoUrl: profile.profilePhotoUrl,
    niche: profile.niche,
    location: profile.location,
    bio: profile.bio,
    specialties: profile.specialties,
    instagramUrl: profile.instagramUrl,
    youtubeUrl: profile.youtubeUrl,
    collaborationEmail: profile.collaborationEmail,
    isDiscoverable,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

/**
 * Upsert (create or update) the authenticated creator's profile.
 * Enforces: at-least-one-social, required fields.
 */
export async function upsertCreatorProfile(
  userId: string,
  data: {
    name: string;
    niche: string;
    location: string;
    bio: string;
    specialties: string[];
    instagramUrl?: string | null;
    youtubeUrl?: string | null;
    collaborationEmail?: string | null;
    profilePhotoUrl?: string | null;
  }
): Promise<CreatorPrivateDTO> {
  // Service-level enforcement of at-least-one-social rule
  if (!data.instagramUrl && !data.youtubeUrl) {
    throw new AppError(
      'At least one social profile (Instagram or YouTube) is required.',
      422,
      'SOCIAL_PROFILE_REQUIRED'
    );
  }

  const profile = await prisma.creatorProfile.upsert({
    where: { userId },
    create: {
      userId,
      name: data.name,
      niche: data.niche,
      location: data.location,
      bio: data.bio,
      specialties: data.specialties,
      instagramUrl: data.instagramUrl ?? null,
      youtubeUrl: data.youtubeUrl ?? null,
      collaborationEmail: data.collaborationEmail ?? null,
      profilePhotoUrl: data.profilePhotoUrl ?? null,
    },
    update: {
      name: data.name,
      niche: data.niche,
      location: data.location,
      bio: data.bio,
      specialties: data.specialties,
      instagramUrl: data.instagramUrl ?? null,
      youtubeUrl: data.youtubeUrl ?? null,
      collaborationEmail: data.collaborationEmail ?? null,
      ...(data.profilePhotoUrl !== undefined ? { profilePhotoUrl: data.profilePhotoUrl } : {}),
    },
  });

  const { isDiscoverable } = computeDiscoverability(profile);

  return {
    id: profile.id,
    userId: profile.userId,
    name: profile.name,
    profilePhotoUrl: profile.profilePhotoUrl,
    niche: profile.niche,
    location: profile.location,
    bio: profile.bio,
    specialties: profile.specialties,
    instagramUrl: profile.instagramUrl,
    youtubeUrl: profile.youtubeUrl,
    collaborationEmail: profile.collaborationEmail,
    isDiscoverable,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

/**
 * Get a public creator profile by userId. Never includes collaborationEmail.
 * Returns null if not found or not discoverable (treat as 404 in controller).
 */
export async function getPublicCreatorProfile(creatorUserId: string): Promise<CreatorPublicDTO | null> {
  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: creatorUserId },
    select: PUBLIC_CREATOR_SELECT,
  });

  if (!profile) return null;

  const { isDiscoverable } = computeDiscoverability(profile);

  return {
    ...profile,
    isDiscoverable,
  };
}

/**
 * Get a public creator profile by creatorProfile.id. Never includes collaborationEmail.
 */
export async function getPublicCreatorProfileById(creatorProfileId: string): Promise<CreatorPublicDTO | null> {
  const profile = await prisma.creatorProfile.findUnique({
    where: { id: creatorProfileId },
    select: PUBLIC_CREATOR_SELECT,
  });

  if (!profile) return null;

  const { isDiscoverable } = computeDiscoverability(profile);
  return { ...profile, isDiscoverable };
}

/**
 * List all discoverable creators (for discovery page).
 * Never includes collaborationEmail.
 */
export async function listDiscoverableCreators(options?: {
  search?: string;
  niche?: string;
}): Promise<CreatorPublicDTO[]> {
  const where: Prisma.CreatorProfileWhereInput = {
    user: { status: 'ACTIVE' },
    // Must have at least one social profile for discoverability
    OR: [
      { instagramUrl: { not: null } },
      { youtubeUrl: { not: null } },
    ],
    // Must have all required fields (non-empty string check at DB level via not null)
    name: { not: '' },
    niche: { not: '' },
    location: { not: '' },
    bio: { not: '' },
    // specialties array must be non-empty — filter post-query
  };

  if (options?.niche) {
    where.niche = options.niche;
  }

  if (options?.search) {
    const s = options.search;
    where.OR = [
      { name: { contains: s, mode: 'insensitive' } },
      { niche: { contains: s, mode: 'insensitive' } },
      { location: { contains: s, mode: 'insensitive' } },
    ];
  }

  const profiles = await prisma.creatorProfile.findMany({
    where,
    select: PUBLIC_CREATOR_SELECT,
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });

  // Post-filter: specialties must be non-empty (Prisma can't filter array length)
  return profiles
    .filter((p) => p.specialties && p.specialties.length > 0)
    .map((p) => ({ ...p, isDiscoverable: true }));
}

/**
 * Creator dashboard summary. No new DB table — aggregates existing data.
 */
export async function getCreatorDashboardSummary(userId: string): Promise<CreatorDashboardSummaryDTO> {
  const [profile, inquiryCounts, recentInquiries] = await Promise.all([
    prisma.creatorProfile.findUnique({
      where: { userId },
      select: {
        name: true,
        niche: true,
        location: true,
        bio: true,
        specialties: true,
        instagramUrl: true,
        youtubeUrl: true,
      },
    }),
    prisma.inquiry.groupBy({
      by: ['status'],
      where: { creatorId: userId },
      _count: { status: true },
    }),
    prisma.inquiry.findMany({
      where: { creatorId: userId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        id: true,
        status: true,
        collaborationType: true,
        createdAt: true,
        business: {
          select: {
            businessProfile: {
              select: { businessName: true, logoUrl: true },
            },
          },
        },
      },
    }),
  ]);

  const { isDiscoverable, missingFields } = profile
    ? computeDiscoverability(profile)
    : { isDiscoverable: false, missingFields: ['name', 'niche', 'location', 'bio', 'specialties', 'socialProfile'] };

  const countMap: Record<string, number> = {};
  for (const row of inquiryCounts) {
    countMap[row.status] = row._count.status;
  }

  return {
    isDiscoverable,
    missingFields,
    inquiriesTotal: Object.values(countMap).reduce((a, b) => a + b, 0),
    inquiriesPending: countMap['PENDING'] ?? 0,
    inquiriesAccepted: countMap['ACCEPTED'] ?? 0,
    inquiriesRejected: countMap['REJECTED'] ?? 0,
    recentInquiries: recentInquiries.map((inq) => ({
      id: inq.id,
      status: inq.status,
      collaborationType: inq.collaborationType,
      businessName: inq.business.businessProfile?.businessName ?? null,
      businessLogoUrl: inq.business.businessProfile?.logoUrl ?? null,
      createdAt: inq.createdAt,
    })),
  };
}
