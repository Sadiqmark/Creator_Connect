import { PrismaClient, UserRole, AccountStatus, InquiryStatus, NotificationType, AuditEventType } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedDatabase(client: PrismaClient = prisma) {
  console.log('🌱 Starting deterministic development database seed...');

  // 1. Clean existing records in reverse dependency order
  await client.notification.deleteMany({});
  await client.auditEvent.deleteMany({});
  await client.savedCreator.deleteMany({});
  await client.inquiry.deleteMany({});
  await client.creatorProfile.deleteMany({});
  await client.businessProfile.deleteMany({});
  await client.user.deleteMany({});

  // 2. Seed Users & Profiles
  // Creator 1: Ananya Sharma
  const creator1User = await client.user.create({
    data: {
      id: 'c1000000-0000-4000-8000-000000000001',
      firebaseUid: 'firebase-creator-ananya-uid',
      email: 'ananya.sharma@example.com',
      role: UserRole.CREATOR,
      status: AccountStatus.ACTIVE,
      creatorProfile: {
        create: {
          id: 'cp100000-0000-4000-8000-000000000001',
          name: 'Ananya Sharma',
          niche: 'Fashion & Style',
          location: 'Mumbai, India',
          bio: 'Editorial fashion creator focusing on contemporary Indian street-style and sustainable textiles.',
          specialties: ['Reels', 'Lookbooks', 'Festive Styling', 'Sustainable Fashion'],
          instagramUrl: 'https://instagram.com/ananya.style.mock',
          youtubeUrl: 'https://youtube.com/@ananyasharmamock',
          collaborationEmail: 'ananya.collabs@example.com',
        },
      },
    },
  });

  // Creator 2: Kabir Mehta
  const creator2User = await client.user.create({
    data: {
      id: 'c2000000-0000-4000-8000-000000000002',
      firebaseUid: 'firebase-creator-kabir-uid',
      email: 'kabir.mehta@example.com',
      role: UserRole.CREATOR,
      status: AccountStatus.ACTIVE,
      creatorProfile: {
        create: {
          id: 'cp200000-0000-4000-8000-000000000002',
          name: 'Kabir Mehta',
          niche: 'Tech & Consumer Audio',
          location: 'Bengaluru, India',
          bio: 'Audio engineer and consumer tech enthusiast creating deep-dive teardowns and honest product reviews.',
          specialties: ['Unboxing', 'Short Reviews', 'Tech Explanations', 'Studio Setups'],
          instagramUrl: 'https://instagram.com/kabir.tech.mock',
          youtubeUrl: 'https://youtube.com/@kabirmehtatechmock',
          collaborationEmail: 'kabir.tech@example.com',
        },
      },
    },
  });

  // Business 1: Aura Craft Roasters
  const business1User = await client.user.create({
    data: {
      id: 'b1000000-0000-4000-8000-000000000001',
      firebaseUid: 'firebase-biz-auracraft-uid',
      email: 'partnerships@auracraft.example.com',
      role: UserRole.BUSINESS,
      status: AccountStatus.ACTIVE,
      businessProfile: {
        create: {
          id: 'bp100000-0000-4000-8000-000000000001',
          businessName: 'Aura Craft Roasters',
          category: 'Food & Beverage',
          description: 'Specialty coffee roastery sourcing single-origin beans across southern India.',
          city: 'Delhi',
          stateOrProvince: 'Delhi NCR',
          country: 'India',
          collaborationEmail: 'collaborations@auracraft.example.com',
          websiteUrl: 'https://auracraft.example.com',
          instagramUrl: 'https://instagram.com/auracraftcoffee.mock',
        },
      },
    },
  });

  // Business 2: Loom & Thread Apparel (Synthetic local business without website/logo)
  const business2User = await client.user.create({
    data: {
      id: 'b2000000-0000-4000-8000-000000000002',
      firebaseUid: 'firebase-biz-loomthread-uid',
      email: 'contact@loomandthread.example.com',
      role: UserRole.BUSINESS,
      status: AccountStatus.ACTIVE,
      businessProfile: {
        create: {
          id: 'bp200000-0000-4000-8000-000000000002',
          businessName: 'Loom & Thread Apparel',
          category: 'Fashion & Apparel',
          description: 'Artisan handcrafted linen and block-printed contemporary apparel.',
          city: 'Jaipur',
          stateOrProvince: 'Rajasthan',
          country: 'India',
          collaborationEmail: 'collaborations@loomandthread.example.com',
          // Optional logo and website left null to test local-business fallbacks
        },
      },
    },
  });

  // Deactivated Test User (for Closed Inquiry validation)
  const deactivatedUser = await client.user.create({
    data: {
      id: 'd1000000-0000-4000-8000-000000000001',
      firebaseUid: 'firebase-deactivated-user-uid',
      email: 'deactivated.user@example.com',
      role: UserRole.CREATOR,
      status: AccountStatus.DELETED,
      deletedAt: new Date(),
      creatorProfile: {
        create: {
          id: 'dp100000-0000-4000-8000-000000000001',
          name: 'Deactivated Creator',
          niche: 'Lifestyle',
          location: 'Pune, India',
          bio: 'Sample deactivated creator account.',
          specialties: ['Vlogs'],
          collaborationEmail: null, // Cleared on soft deletion
        },
      },
    },
  });

  // 3. Seed Saved Creator
  await client.savedCreator.create({
    data: {
      id: 'sc100000-0000-4000-8000-000000000001',
      businessId: business1User.id,
      creatorId: creator1User.id,
    },
  });

  // 4. Seed Inquiries in all 5 lifecycle states
  const now = new Date();
  const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const seventyDaysAgo = new Date(now.getTime() - 70 * 24 * 60 * 60 * 1000);
  const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

  // Inquiry 1: PENDING (Business 1 -> Creator 1)
  const pendingInquiry = await client.inquiry.create({
    data: {
      id: 'inq10000-0000-4000-8000-000000000001',
      businessId: business1User.id,
      creatorId: creator1User.id,
      status: InquiryStatus.PENDING,
      collaborationType: 'Sponsored Instagram Reel & Story Series',
      platform: 'Instagram',
      deliverables: '1 Dedicated 60s Reel showcasing Cold Brew concentrate + 3 Stories with product link.',
      timelineStart: new Date('2026-10-01'),
      timelineEnd: new Date('2026-10-15'),
      brief: 'We are launching our Monsoon Cold Brew blend and seeking an authentic styling Reel pairing morning coffee with daily lifestyle routines.',
      additionalRequirements: 'Deliver raw video footage for brand whitelisting usage.',
      expiresAt: sixtyDaysFromNow,
    },
  });

  // Inquiry 2: ACCEPTED (Business 1 -> Creator 2)
  await client.inquiry.create({
    data: {
      id: 'inq20000-0000-4000-8000-000000000002',
      businessId: business1User.id,
      creatorId: creator2User.id,
      status: InquiryStatus.ACCEPTED,
      collaborationType: 'Product Review & Dedicated Tech Feature',
      platform: 'YouTube & Instagram',
      deliverables: '1 YouTube integration segment (90s) + 1 Instagram Reel on portable coffee grinder.',
      timelineStart: new Date('2026-09-15'),
      timelineEnd: new Date('2026-09-30'),
      brief: 'Hands-on review of our precision electric coffee grinder focusing on build quality and grind consistency.',
      respondedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      expiresAt: sixtyDaysFromNow,
    },
  });

  // Inquiry 3: REJECTED (Business 2 -> Creator 1)
  await client.inquiry.create({
    data: {
      id: 'inq30000-0000-4000-8000-000000000003',
      businessId: business2User.id,
      creatorId: creator1User.id,
      status: InquiryStatus.REJECTED,
      collaborationType: 'Festive Lookbook Campaign',
      platform: 'Instagram',
      deliverables: '2 Carousel posts and 5 stories.',
      brief: 'Showcase handcrafted block-print kurtas during festive season.',
      respondedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      expiresAt: sixtyDaysFromNow,
    },
  });

  // Inquiry 4: EXPIRED (Business 2 -> Creator 2)
  await client.inquiry.create({
    data: {
      id: 'inq40000-0000-4000-8000-000000000004',
      businessId: business2User.id,
      creatorId: creator2User.id,
      status: InquiryStatus.EXPIRED,
      collaborationType: 'Tech Merch Unboxing',
      platform: 'YouTube',
      deliverables: '1 Unboxing Reel.',
      brief: 'Review organic cotton developer hoodies.',
      createdAt: seventyDaysAgo,
      expiresAt: tenDaysAgo,
    },
  });

  // Inquiry 5: CLOSED (Business 1 -> Deactivated User)
  await client.inquiry.create({
    data: {
      id: 'inq50000-0000-4000-8000-000000000005',
      businessId: business1User.id,
      creatorId: deactivatedUser.id,
      status: InquiryStatus.CLOSED,
      collaborationType: 'Brand Ambassador',
      platform: 'Instagram',
      deliverables: 'Monthly content package.',
      brief: 'Long-term lifestyle ambassador program.',
      closedAt: new Date(),
      expiresAt: sixtyDaysFromNow,
    },
  });

  // 5. Seed Notifications
  await client.notification.create({
    data: {
      id: 'notif100-0000-4000-8000-000000000001',
      userId: creator1User.id,
      type: NotificationType.INQUIRY_RECEIVED,
      referenceId: pendingInquiry.id,
    },
  });

  await client.notification.create({
    data: {
      id: 'notif200-0000-4000-8000-000000000002',
      userId: business1User.id,
      type: NotificationType.INQUIRY_ACCEPTED,
      referenceId: 'inq20000-0000-4000-8000-000000000002',
      readAt: new Date(),
    },
  });

  // 6. Seed Audit Event
  await client.auditEvent.create({
    data: {
      id: 'audit100-0000-4000-8000-000000000001',
      eventType: AuditEventType.INQUIRY_CREATED,
      actorUserId: business1User.id,
      resourceType: 'INQUIRY',
      resourceId: pendingInquiry.id,
      metadata: {
        collaborationType: 'Sponsored Instagram Reel & Story Series',
        platform: 'Instagram',
      },
    },
  });

  console.log('✅ Deterministic seed completed successfully.');
}

if (require.main === module) {
  seedDatabase()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error('❌ Seed failed:', e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
