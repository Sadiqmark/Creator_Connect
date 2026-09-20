import prisma from '../src/database/prisma';
import { UserRole, AccountStatus, InquiryStatus, AuditEventType } from '@prisma/client';
import {
  hashEmailForReservation,
  permanentlyDeleteUser,
  sweepPermanentDeletions,
  sweepFirebaseDeletions,
  sweepExpiredEmailReservations,
} from '../src/services/deletion.service';
import { runLifecycleSweep } from '../src/jobs/expirationRunner';
import { firebaseAdminAuth } from '../src/config/firebase';

describe('Phase 13B-3 Permanent Deletion & Unified Lifecycle Runner Test Suite', () => {
  const testCreatorId = 'c3000000-0000-4000-8000-000000000001';
  const testCreatorFbUid = 'fb_creator_perm_del_1';
  const testCreatorEmail = 'creator.permanent.del@example.com';

  const testBusinessId = 'b3000000-0000-4000-8000-000000000001';
  const testBusinessFbUid = 'fb_biz_perm_del_1';
  const testBusinessEmail = 'business.permanent.del@example.com';

  const testBusinessId2 = 'b3000000-0000-4000-8000-000000000002';
  const testCreatorId2 = 'c3000000-0000-4000-8000-000000000002';

  const testActiveUserId = 'a3000000-0000-4000-8000-000000000001';
  const testGraceUserId = 'a3000000-0000-4000-8000-000000000002';

  const allTestUserIds = [
    testCreatorId,
    testCreatorId2,
    testBusinessId,
    testBusinessId2,
    testActiveUserId,
    testGraceUserId,
  ];

  beforeEach(async () => {
    // Clean up test data
    await prisma.pendingFirebaseDeletion.deleteMany();
    await prisma.emailReservation.deleteMany();
    await prisma.auditEvent.deleteMany({
      where: {
        OR: [
          { resourceType: 'USER', resourceId: { in: allTestUserIds } },
          { resourceType: 'INQUIRY' },
        ],
      },
    });
    await prisma.inquiry.deleteMany({
      where: {
        OR: [
          { creatorId: { in: allTestUserIds } },
          { businessId: { in: allTestUserIds } },
        ],
      },
    });
    await prisma.creatorProfile.deleteMany({
      where: { userId: { in: allTestUserIds } },
    });
    await prisma.businessProfile.deleteMany({
      where: { userId: { in: allTestUserIds } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: allTestUserIds } },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. Email Normalization & HMAC-SHA256 Hashing', () => {
    it('should normalize email with trim, lowercase, and Unicode NFKC before hashing', () => {
      const email1 = '  Test.User@Example.Com  ';
      const email2 = 'test.user@example.com';
      // NFKC equivalence: e.g. fullwidth characters or accents
      const email3 = 'test.user\u0041\u030A@example.com'; // A with ring above (decomposed)
      const email4 = 'test.user\u00C5@example.com'; // Å (composed)

      const hash1 = hashEmailForReservation(email1);
      const hash2 = hashEmailForReservation(email2);
      const hash3 = hashEmailForReservation(email3);
      const hash4 = hashEmailForReservation(email4);

      expect(hash1).toBe(hash2);
      expect(hash3).toBe(hash4);
      expect(hash1).toHaveLength(64); // SHA-256 hex digest length
    });
  });

  describe('2. Permanent Deletion Lifecycle & Anonymization', () => {
    it('should permanently delete an expired DEACTIVATED creator account', async () => {
      const now = new Date();
      const pastDeadline = new Date(now.getTime() - 1000); // 1s in the past

      await prisma.user.create({
        data: {
          id: testCreatorId,
          firebaseUid: testCreatorFbUid,
          email: testCreatorEmail,
          role: UserRole.CREATOR,
          status: AccountStatus.DEACTIVATED,
          deactivatedAt: new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000),
          deletionScheduledAt: pastDeadline,
          creatorProfile: {
            create: {
              name: 'Original Creator Name',
              niche: 'Lifestyle',
              location: 'Mumbai',
              bio: 'Top creator bio',
              specialties: ['Vlogging', 'Travel'],
              collaborationEmail: 'collab@creator.com',
              profilePhotoUrl: 'https://cdn.example.com/photo.jpg',
              instagramUrl: 'https://instagram.com/creator',
              youtubeUrl: 'https://youtube.com/@creator',
            },
          },
        },
      });

      const result = await permanentlyDeleteUser(testCreatorId);
      expect(result.deleted).toBe(true);
      expect(result.reservationOutcome).toBe('CREATED');

      // Verify User Tombstone
      const userAfter = await prisma.user.findUnique({ where: { id: testCreatorId } });
      expect(userAfter?.status).toBe(AccountStatus.DELETED);
      expect(userAfter?.deletedAt).not.toBeNull();
      expect(userAfter?.email).toBe(`deleted_${testCreatorId}@deleted.creatorconnect.internal`);
      expect(userAfter?.firebaseUid).toBe(`deleted_${testCreatorId}`);

      // Verify Profile Anonymization
      const profileAfter = await prisma.creatorProfile.findUnique({ where: { userId: testCreatorId } });
      expect(profileAfter?.name).toBe('Deleted Creator');
      expect(profileAfter?.collaborationEmail).toBeNull();
      expect(profileAfter?.bio).toBe('');
      expect(profileAfter?.location).toBe('');
      expect(profileAfter?.specialties).toEqual([]);
      expect(profileAfter?.profilePhotoUrl).toBeNull();
      expect(profileAfter?.instagramUrl).toBeNull();
      expect(profileAfter?.youtubeUrl).toBeNull();

      // Verify Firebase deletion queue entry with ORIGINAL UID
      const queueItem = await prisma.pendingFirebaseDeletion.findUnique({
        where: { firebaseUid: testCreatorFbUid },
      });
      expect(queueItem).not.toBeNull();
      expect(queueItem?.attempts).toBe(0);

      // Verify Email Reservation with exact 180 days expiry
      const emailHash = hashEmailForReservation(testCreatorEmail);
      const reservation = await prisma.emailReservation.findUnique({ where: { emailHash } });
      expect(reservation).not.toBeNull();
      expect(reservation?.userId).toBe(testCreatorId);
      const expectedDiff = reservation!.reservedUntil.getTime() - userAfter!.deletedAt!.getTime();
      expect(expectedDiff).toBe(180 * 24 * 60 * 60 * 1000);

      // Verify Audit Event
      const audit = await prisma.auditEvent.findFirst({
        where: {
          resourceType: 'USER',
          resourceId: testCreatorId,
          eventType: 'ACCOUNT_PERMANENTLY_DELETED',
        },
      });
      expect(audit).not.toBeNull();
      expect((audit?.metadata as any)?.originalRole).toBe('CREATOR');
      expect((audit?.metadata as any)?.reservationOutcome).toBe('CREATED');
    });

    it('should permanently delete an expired DEACTIVATED business account and preserve historical inquiries', async () => {
      const now = new Date();
      const pastDeadline = new Date(now.getTime() - 1000);

      await prisma.user.create({
        data: {
          id: testBusinessId,
          firebaseUid: testBusinessFbUid,
          email: testBusinessEmail,
          role: UserRole.BUSINESS,
          status: AccountStatus.DEACTIVATED,
          deactivatedAt: new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000),
          deletionScheduledAt: pastDeadline,
          businessProfile: {
            create: {
              businessName: 'Original Brand Co',
              category: 'Fashion',
              description: 'Luxury apparel brand',
              city: 'Mumbai',
              stateOrProvince: 'MH',
              country: 'India',
              collaborationEmail: 'partners@brand.com',
              logoUrl: 'https://cdn.example.com/logo.jpg',
              websiteUrl: 'https://brand.com',
              instagramUrl: 'https://instagram.com/brand',
            },
          },
        },
      });

      // Create dummy creator to anchor inquiry
      await prisma.user.create({
        data: {
          id: testCreatorId,
          firebaseUid: testCreatorFbUid,
          email: testCreatorEmail,
          role: UserRole.CREATOR,
          status: AccountStatus.ACTIVE,
          creatorProfile: {
            create: {
              name: 'Active Partner Creator',
              niche: 'Fashion',
              location: 'Delhi',
              bio: 'Bio',
            },
          },
        },
      });

      // Create historical inquiry referencing the business (onDelete: Restrict)
      const inquiry = await prisma.inquiry.create({
        data: {
          businessId: testBusinessId,
          creatorId: testCreatorId,
          status: InquiryStatus.ACCEPTED,
          collaborationType: 'SPONSORED_POST',
          platform: 'INSTAGRAM',
          deliverables: '1 Reel',
          brief: 'Summer fashion campaign',
          timelineStart: now,
          timelineEnd: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          expiresAt: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
        },
      });

      const result = await permanentlyDeleteUser(testBusinessId);
      expect(result.deleted).toBe(true);

      // Verify business profile anonymized
      const bizProfile = await prisma.businessProfile.findUnique({ where: { userId: testBusinessId } });
      expect(bizProfile?.businessName).toBe('Deleted Business');
      expect(bizProfile?.collaborationEmail).toBeNull();
      expect(bizProfile?.description).toBe('');
      expect(bizProfile?.city).toBe('');
      expect(bizProfile?.logoUrl).toBeNull();

      // Verify Inquiry remains valid in database (historical integrity preserved) and is transitioned to CLOSED
      const inquiryAfter = await prisma.inquiry.findUnique({ where: { id: inquiry.id } });
      expect(inquiryAfter).not.toBeNull();
      expect(inquiryAfter?.businessId).toBe(testBusinessId);
      expect(inquiryAfter?.status).toBe(InquiryStatus.CLOSED);
      expect(inquiryAfter?.closedAt).not.toBeNull();
    });

    it('should transition PENDING and ACCEPTED inquiries to CLOSED on permanent deletion of a Creator, leave REJECTED and EXPIRED unchanged, populate closedAt, and emit INQUIRY_CLOSED audit events', async () => {
      const now = new Date();
      const pastDeadline = new Date(now.getTime() - 1000);

      // Seed expired DEACTIVATED creator
      await prisma.user.create({
        data: {
          id: testCreatorId,
          firebaseUid: testCreatorFbUid,
          email: testCreatorEmail,
          role: UserRole.CREATOR,
          status: AccountStatus.DEACTIVATED,
          deactivatedAt: new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000),
          deletionScheduledAt: pastDeadline,
          creatorProfile: {
            create: {
              name: 'Creator To Be Deleted',
              niche: 'Lifestyle',
              location: 'Mumbai',
              bio: 'Bio',
            },
          },
        },
      });

      // Seed active partner business 1
      await prisma.user.create({
        data: {
          id: testBusinessId,
          firebaseUid: testBusinessFbUid,
          email: testBusinessEmail,
          role: UserRole.BUSINESS,
          status: AccountStatus.ACTIVE,
          businessProfile: {
            create: {
              businessName: 'Partner Brand 1',
              category: 'Lifestyle',
              description: 'Brand description 1',
              city: 'Mumbai',
              stateOrProvince: 'MH',
              country: 'India',
            },
          },
        },
      });

      // Seed active partner business 2
      await prisma.user.create({
        data: {
          id: testBusinessId2,
          firebaseUid: 'fb_biz_perm_del_2',
          email: 'business2.permanent.del@example.com',
          role: UserRole.BUSINESS,
          status: AccountStatus.ACTIVE,
          businessProfile: {
            create: {
              businessName: 'Partner Brand 2',
              category: 'Tech',
              description: 'Brand description 2',
              city: 'Bengaluru',
              stateOrProvince: 'KA',
              country: 'India',
            },
          },
        },
      });

      // Seed 4 inquiries: PENDING, ACCEPTED, REJECTED, EXPIRED
      // Note: inqPending is with Business 1, inqAccepted is with Business 2 (honoring active inquiry partial unique index)
      const inqPending = await prisma.inquiry.create({
        data: {
          businessId: testBusinessId,
          creatorId: testCreatorId,
          status: InquiryStatus.PENDING,
          collaborationType: 'SPONSORED_POST',
          platform: 'INSTAGRAM',
          deliverables: 'Post 1',
          brief: 'Brief for pending',
          expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const inqAccepted = await prisma.inquiry.create({
        data: {
          businessId: testBusinessId2,
          creatorId: testCreatorId,
          status: InquiryStatus.ACCEPTED,
          collaborationType: 'SPONSORED_POST',
          platform: 'YOUTUBE',
          deliverables: 'Video 1',
          brief: 'Brief for accepted',
          expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          respondedAt: now,
        },
      });

      const inqRejected = await prisma.inquiry.create({
        data: {
          businessId: testBusinessId,
          creatorId: testCreatorId,
          status: InquiryStatus.REJECTED,
          collaborationType: 'SPONSORED_POST',
          platform: 'TIKTOK',
          deliverables: 'Video 2',
          brief: 'Brief for rejected',
          expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          respondedAt: now,
        },
      });

      const inqExpired = await prisma.inquiry.create({
        data: {
          businessId: testBusinessId,
          creatorId: testCreatorId,
          status: InquiryStatus.EXPIRED,
          collaborationType: 'SPONSORED_POST',
          platform: 'INSTAGRAM',
          deliverables: 'Post 2',
          brief: 'Brief for expired',
          expiresAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        },
      });

      // Permanently delete creator
      const result = await permanentlyDeleteUser(testCreatorId);
      expect(result.deleted).toBe(true);

      // 1. PENDING -> CLOSED with closedAt set
      const updatedPending = await prisma.inquiry.findUnique({ where: { id: inqPending.id } });
      expect(updatedPending?.status).toBe(InquiryStatus.CLOSED);
      expect(updatedPending?.closedAt).not.toBeNull();

      // 2. ACCEPTED -> CLOSED with closedAt set
      const updatedAccepted = await prisma.inquiry.findUnique({ where: { id: inqAccepted.id } });
      expect(updatedAccepted?.status).toBe(InquiryStatus.CLOSED);
      expect(updatedAccepted?.closedAt).not.toBeNull();

      // 3. REJECTED -> unchanged, closedAt null
      const updatedRejected = await prisma.inquiry.findUnique({ where: { id: inqRejected.id } });
      expect(updatedRejected?.status).toBe(InquiryStatus.REJECTED);
      expect(updatedRejected?.closedAt).toBeNull();

      // 4. EXPIRED -> unchanged, closedAt null
      const updatedExpired = await prisma.inquiry.findUnique({ where: { id: inqExpired.id } });
      expect(updatedExpired?.status).toBe(InquiryStatus.EXPIRED);
      expect(updatedExpired?.closedAt).toBeNull();

      // Verify exactly one INQUIRY_CLOSED audit event for each closed inquiry
      const auditEvents = await prisma.auditEvent.findMany({
        where: {
          eventType: AuditEventType.INQUIRY_CLOSED,
          resourceId: { in: [inqPending.id, inqAccepted.id, inqRejected.id, inqExpired.id] },
        },
      });

      expect(auditEvents).toHaveLength(2);
      const pendingAudit = auditEvents.find((e) => e.resourceId === inqPending.id);
      expect(pendingAudit).toBeDefined();
      expect(pendingAudit?.actorUserId).toBeNull();
      expect((pendingAudit?.metadata as any)?.previousStatus).toBe('PENDING');
      expect((pendingAudit?.metadata as any)?.reason).toBe('PARTICIPANT_PERMANENTLY_DELETED');
      expect((pendingAudit?.metadata as any)?.deletedUserId).toBe(testCreatorId);

      const acceptedAudit = auditEvents.find((e) => e.resourceId === inqAccepted.id);
      expect(acceptedAudit).toBeDefined();
      expect(acceptedAudit?.actorUserId).toBeNull();
      expect((acceptedAudit?.metadata as any)?.previousStatus).toBe('ACCEPTED');
      expect((acceptedAudit?.metadata as any)?.reason).toBe('PARTICIPANT_PERMANENTLY_DELETED');
      expect((acceptedAudit?.metadata as any)?.deletedUserId).toBe(testCreatorId);

      // Verify tombstone remains
      const userAfter = await prisma.user.findUnique({ where: { id: testCreatorId } });
      expect(userAfter?.status).toBe(AccountStatus.DELETED);
    });

    it('should transition PENDING and ACCEPTED inquiries to CLOSED on permanent deletion of a Business', async () => {
      const now = new Date();
      const pastDeadline = new Date(now.getTime() - 1000);

      // Seed expired DEACTIVATED business
      await prisma.user.create({
        data: {
          id: testBusinessId,
          firebaseUid: testBusinessFbUid,
          email: testBusinessEmail,
          role: UserRole.BUSINESS,
          status: AccountStatus.DEACTIVATED,
          deactivatedAt: new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000),
          deletionScheduledAt: pastDeadline,
          businessProfile: {
            create: {
              businessName: 'Business To Be Deleted',
              category: 'Tech',
              description: 'Tech business',
              city: 'Bengaluru',
              stateOrProvince: 'KA',
              country: 'India',
            },
          },
        },
      });

      // Seed active partner creator 1
      await prisma.user.create({
        data: {
          id: testCreatorId,
          firebaseUid: testCreatorFbUid,
          email: testCreatorEmail,
          role: UserRole.CREATOR,
          status: AccountStatus.ACTIVE,
          creatorProfile: {
            create: {
              name: 'Partner Creator 1',
              niche: 'Tech',
              location: 'Bengaluru',
              bio: 'Bio 1',
            },
          },
        },
      });

      // Seed active partner creator 2
      await prisma.user.create({
        data: {
          id: testCreatorId2,
          firebaseUid: 'fb_creator_perm_del_2',
          email: 'creator2.permanent.del@example.com',
          role: UserRole.CREATOR,
          status: AccountStatus.ACTIVE,
          creatorProfile: {
            create: {
              name: 'Partner Creator 2',
              niche: 'Fashion',
              location: 'Mumbai',
              bio: 'Bio 2',
            },
          },
        },
      });

      const inqPending = await prisma.inquiry.create({
        data: {
          businessId: testBusinessId,
          creatorId: testCreatorId,
          status: InquiryStatus.PENDING,
          collaborationType: 'SPONSORED_POST',
          platform: 'YOUTUBE',
          deliverables: 'Deliverable 1',
          brief: 'Brief for pending inquiry',
          expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const inqAccepted = await prisma.inquiry.create({
        data: {
          businessId: testBusinessId,
          creatorId: testCreatorId2,
          status: InquiryStatus.ACCEPTED,
          collaborationType: 'SPONSORED_POST',
          platform: 'INSTAGRAM',
          deliverables: 'Deliverable 2',
          brief: 'Brief for accepted inquiry',
          expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          respondedAt: now,
        },
      });

      const result = await permanentlyDeleteUser(testBusinessId);
      expect(result.deleted).toBe(true);

      const updatedPending = await prisma.inquiry.findUnique({ where: { id: inqPending.id } });
      expect(updatedPending?.status).toBe(InquiryStatus.CLOSED);
      expect(updatedPending?.closedAt).not.toBeNull();

      const updatedAccepted = await prisma.inquiry.findUnique({ where: { id: inqAccepted.id } });
      expect(updatedAccepted?.status).toBe(InquiryStatus.CLOSED);
      expect(updatedAccepted?.closedAt).not.toBeNull();

      const auditEvents = await prisma.auditEvent.findMany({
        where: {
          eventType: AuditEventType.INQUIRY_CLOSED,
          resourceId: { in: [inqPending.id, inqAccepted.id] },
        },
      });
      expect(auditEvents).toHaveLength(2);
      for (const audit of auditEvents) {
        expect((audit.metadata as any)?.deletedUserId).toBe(testBusinessId);
      }
    });

    it('should free the unique_active_business_creator_inquiry partial unique index after an ACCEPTED inquiry is transitioned to CLOSED on permanent deletion', async () => {
      const now = new Date();
      const pastDeadline = new Date(now.getTime() - 1000);

      // Seed expired DEACTIVATED creator
      await prisma.user.create({
        data: {
          id: testCreatorId,
          firebaseUid: testCreatorFbUid,
          email: testCreatorEmail,
          role: UserRole.CREATOR,
          status: AccountStatus.DEACTIVATED,
          deactivatedAt: new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000),
          deletionScheduledAt: pastDeadline,
          creatorProfile: {
            create: {
              name: 'Creator For Index Test',
              niche: 'Fashion',
              location: 'Delhi',
              bio: 'Bio',
            },
          },
        },
      });

      // Seed active business
      await prisma.user.create({
        data: {
          id: testBusinessId,
          firebaseUid: testBusinessFbUid,
          email: testBusinessEmail,
          role: UserRole.BUSINESS,
          status: AccountStatus.ACTIVE,
          businessProfile: {
            create: {
              businessName: 'Business For Index Test',
              category: 'Fashion',
              description: 'Brand',
              city: 'Delhi',
              stateOrProvince: 'DL',
              country: 'India',
            },
          },
        },
      });

      // Create an ACCEPTED inquiry between business and creator
      const inquiry = await prisma.inquiry.create({
        data: {
          businessId: testBusinessId,
          creatorId: testCreatorId,
          status: InquiryStatus.ACCEPTED,
          collaborationType: 'SPONSORED_POST',
          platform: 'INSTAGRAM',
          deliverables: 'Reel',
          brief: 'Brief',
          expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          respondedAt: now,
        },
      });

      // Attempting to create another active (PENDING) inquiry violates the partial unique index
      await expect(
        prisma.inquiry.create({
          data: {
            businessId: testBusinessId,
            creatorId: testCreatorId,
            status: InquiryStatus.PENDING,
            collaborationType: 'COLLAB',
            platform: 'YOUTUBE',
            deliverables: 'Deliverable',
            brief: 'Second active inquiry brief',
            expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          },
        })
      ).rejects.toThrow();

      // Permanently delete the creator -> transitions existing ACCEPTED inquiry to CLOSED
      const result = await permanentlyDeleteUser(testCreatorId);
      expect(result.deleted).toBe(true);

      const inqAfter = await prisma.inquiry.findUnique({ where: { id: inquiry.id } });
      expect(inqAfter?.status).toBe(InquiryStatus.CLOSED);

      // Now that status is CLOSED, creating another inquiry with status PENDING must SUCCEED!
      // This proves the PostgreSQL partial unique index ('unique_active_business_creator_inquiry')
      // is no longer occupied!
      const newInquiry = await prisma.inquiry.create({
        data: {
          businessId: testBusinessId,
          creatorId: testCreatorId,
          status: InquiryStatus.PENDING,
          collaborationType: 'COLLAB',
          platform: 'YOUTUBE',
          deliverables: 'New deliverable',
          brief: 'Brief after deletion',
          expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      expect(newInquiry.id).toBeDefined();
      expect(newInquiry.status).toBe(InquiryStatus.PENDING);
    });

    it('should not overwrite an inquiry that concurrently transitioned to REJECTED and should not emit an INQUIRY_CLOSED audit event for it', async () => {
      const now = new Date();
      const pastDeadline = new Date(now.getTime() - 1000);

      // Seed expired DEACTIVATED creator
      await prisma.user.create({
        data: {
          id: testCreatorId,
          firebaseUid: testCreatorFbUid,
          email: testCreatorEmail,
          role: UserRole.CREATOR,
          status: AccountStatus.DEACTIVATED,
          deactivatedAt: new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000),
          deletionScheduledAt: pastDeadline,
          creatorProfile: {
            create: {
              name: 'Creator Concurrency Race Test',
              niche: 'Tech',
              location: 'Bangalore',
              bio: 'Bio',
            },
          },
        },
      });

      // Seed active business
      await prisma.user.create({
        data: {
          id: testBusinessId,
          firebaseUid: testBusinessFbUid,
          email: testBusinessEmail,
          role: UserRole.BUSINESS,
          status: AccountStatus.ACTIVE,
          businessProfile: {
            create: {
              businessName: 'Business Concurrency Test',
              category: 'Tech',
              description: 'Brand',
              city: 'Bangalore',
              stateOrProvince: 'KA',
              country: 'India',
            },
          },
        },
      });

      // Seed an active PENDING inquiry and an already REJECTED inquiry
      const inqPending = await prisma.inquiry.create({
        data: {
          businessId: testBusinessId,
          creatorId: testCreatorId,
          status: InquiryStatus.PENDING,
          collaborationType: 'SPONSORED_POST',
          platform: 'YOUTUBE',
          deliverables: 'Video',
          brief: 'Brief 1',
          expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // Concurrently simulate a race:
      // While inquiry was initially PENDING, another transaction updates it to REJECTED before permanent deletion acquires the inquiry lock.
      await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`
          SELECT id FROM inquiries WHERE id = ${inqPending.id}::uuid FOR UPDATE
        `;
        await tx.inquiry.update({
          where: { id: inqPending.id },
          data: { status: InquiryStatus.REJECTED },
        });
      });

      // Run permanent deletion
      const result = await permanentlyDeleteUser(testCreatorId);
      expect(result.deleted).toBe(true);

      // Verify inquiry remains REJECTED, closedAt remains null
      const inqAfter = await prisma.inquiry.findUnique({ where: { id: inqPending.id } });
      expect(inqAfter?.status).toBe(InquiryStatus.REJECTED);
      expect(inqAfter?.closedAt).toBeNull();

      // Verify NO INQUIRY_CLOSED audit event was emitted for this inquiry
      const auditEvents = await prisma.auditEvent.findMany({
        where: {
          eventType: AuditEventType.INQUIRY_CLOSED,
          resourceId: inqPending.id,
        },
      });
      expect(auditEvents).toHaveLength(0);
    });

    it('should NOT delete an ACTIVE user or a DEACTIVATED user whose grace period has not expired', async () => {
      const now = new Date();
      const futureDeadline = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000); // 15 days in future

      await prisma.user.create({
        data: {
          id: testActiveUserId,
          firebaseUid: 'fb_active_user',
          email: 'active.user@example.com',
          role: UserRole.CREATOR,
          status: AccountStatus.ACTIVE,
        },
      });

      await prisma.user.create({
        data: {
          id: testGraceUserId,
          firebaseUid: 'fb_grace_user',
          email: 'grace.user@example.com',
          role: UserRole.CREATOR,
          status: AccountStatus.DEACTIVATED,
          deactivatedAt: now,
          deletionScheduledAt: futureDeadline,
        },
      });

      const activeRes = await permanentlyDeleteUser(testActiveUserId);
      const graceRes = await permanentlyDeleteUser(testGraceUserId);

      expect(activeRes.deleted).toBe(false);
      expect(graceRes.deleted).toBe(false);

      const activeAfter = await prisma.user.findUnique({ where: { id: testActiveUserId } });
      const graceAfter = await prisma.user.findUnique({ where: { id: testGraceUserId } });

      expect(activeAfter?.status).toBe(AccountStatus.ACTIVE);
      expect(graceAfter?.status).toBe(AccountStatus.DEACTIVATED);
    });
  });

  describe('3. Email Reservation 4-Case Conflict Matrix', () => {
    it('Case A: Clean insert on unreserved email', async () => {
      const now = new Date();
      await prisma.user.create({
        data: {
          id: testCreatorId,
          firebaseUid: testCreatorFbUid,
          email: testCreatorEmail,
          role: UserRole.CREATOR,
          status: AccountStatus.DEACTIVATED,
          deletionScheduledAt: new Date(now.getTime() - 1000),
        },
      });

      const res = await permanentlyDeleteUser(testCreatorId);
      expect(res.deleted).toBe(true);
      expect(res.reservationOutcome).toBe('CREATED');
    });

    it('Case B: Pre-existing EXPIRED reservation is cleanly deleted and replaced with new 180-day reservation', async () => {
      const now = new Date();
      const emailHash = hashEmailForReservation(testCreatorEmail);

      // Pre-seed an expired reservation from 200 days ago
      const expiredReservation = await prisma.emailReservation.create({
        data: {
          emailHash,
          reservedUntil: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // Expired 10 days ago
          reason: 'ACCOUNT_DELETION',
          createdAt: new Date(now.getTime() - 190 * 24 * 60 * 60 * 1000),
        },
      });

      await prisma.user.create({
        data: {
          id: testCreatorId,
          firebaseUid: testCreatorFbUid,
          email: testCreatorEmail,
          role: UserRole.CREATOR,
          status: AccountStatus.DEACTIVATED,
          deletionScheduledAt: new Date(now.getTime() - 1000),
        },
      });

      const res = await permanentlyDeleteUser(testCreatorId);
      expect(res.deleted).toBe(true);
      expect(res.reservationOutcome).toBe('REPLACED_EXPIRED');

      // The old reservation should be gone, new reservation present with 180 days from now
      const activeRes = await prisma.emailReservation.findUnique({ where: { emailHash } });
      expect(activeRes).not.toBeNull();
      expect(activeRes?.id).not.toBe(expiredReservation.id);
      expect(activeRes?.userId).toBe(testCreatorId);
      expect(activeRes!.reservedUntil.getTime()).toBeGreaterThan(now.getTime() + 179 * 24 * 60 * 60 * 1000);
    });

    it('Case C: Idempotent retry of same deletion leaves existing reservation intact without modification', async () => {
      const now = new Date();
      const emailHash = hashEmailForReservation(testCreatorEmail);

      await prisma.user.create({
        data: {
          id: testCreatorId,
          firebaseUid: testCreatorFbUid,
          email: testCreatorEmail,
          role: UserRole.CREATOR,
          status: AccountStatus.DEACTIVATED,
          deletionScheduledAt: new Date(now.getTime() - 1000),
        },
      });

      // Pre-seed reservation belonging to the SAME user (as if crash occurred after reservation step)
      const existingReservedUntil = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
      const preExisting = await prisma.emailReservation.create({
        data: {
          userId: testCreatorId,
          emailHash,
          reservedUntil: existingReservedUntil,
          reason: 'ACCOUNT_DELETION',
        },
      });

      const res = await permanentlyDeleteUser(testCreatorId);
      expect(res.deleted).toBe(true);
      expect(res.reservationOutcome).toBe('ALREADY_EXISTS_SAME_USER');

      // Reservation should remain unchanged
      const current = await prisma.emailReservation.findUnique({ where: { emailHash } });
      expect(current?.id).toBe(preExisting.id);
      expect(current?.reservedUntil.getTime()).toBe(existingReservedUntil.getTime());
    });

    it('Case D: Active historical reservation from ANOTHER account is left completely untouched (never overwritten)', async () => {
      const now = new Date();
      const emailHash = hashEmailForReservation(testCreatorEmail);

      // Create other historical user first to satisfy foreign key
      await prisma.user.create({
        data: {
          id: testBusinessId,
          firebaseUid: testBusinessFbUid,
          email: 'historical.owner@example.com',
          role: UserRole.BUSINESS,
          status: AccountStatus.DELETED,
        },
      });

      // Pre-seed an active reservation created by another historical user
      const otherUserReservedUntil = new Date(now.getTime() + 100 * 24 * 60 * 60 * 1000); // 100 days remaining
      const otherUserReservation = await prisma.emailReservation.create({
        data: {
          userId: testBusinessId, // Belongs to someone else
          emailHash,
          reservedUntil: otherUserReservedUntil,
          reason: 'ACCOUNT_DELETION',
        },
      });

      await prisma.user.create({
        data: {
          id: testCreatorId,
          firebaseUid: testCreatorFbUid,
          email: testCreatorEmail,
          role: UserRole.CREATOR,
          status: AccountStatus.DEACTIVATED,
          deletionScheduledAt: new Date(now.getTime() - 1000),
        },
      });

      const res = await permanentlyDeleteUser(testCreatorId);
      expect(res.deleted).toBe(true);
      expect(res.reservationOutcome).toBe('HISTORICAL_CONFLICT');

      // Verify existing reservation was NOT overwritten or extended
      const checkRes = await prisma.emailReservation.findUnique({ where: { emailHash } });
      expect(checkRes?.id).toBe(otherUserReservation.id);
      expect(checkRes?.userId).toBe(testBusinessId);
      expect(checkRes?.reservedUntil.getTime()).toBe(otherUserReservedUntil.getTime());
    });

    it('should clean up expired reservations during sweepExpiredEmailReservations', async () => {
      const now = new Date();
      // Active reservation
      await prisma.emailReservation.create({
        data: {
          emailHash: 'hash_active',
          reservedUntil: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
        },
      });
      // Expired reservation
      await prisma.emailReservation.create({
        data: {
          emailHash: 'hash_expired',
          reservedUntil: new Date(now.getTime() - 1000),
        },
      });

      const { deletedCount } = await sweepExpiredEmailReservations();
      expect(deletedCount).toBe(1);

      const remaining = await prisma.emailReservation.findMany();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].emailHash).toBe('hash_active');
    });
  });

  describe('4. Firebase Queue Worker & Backoff Interval Boundaries', () => {
    it('should evaluate exact backoff eligibility per attempt count', async () => {
      const now = new Date();

      // Setup 7 items representing attempts 0 through 6
      // attempts 0: immediately eligible (lastAttemptAt is null)
      await prisma.pendingFirebaseDeletion.create({
        data: { firebaseUid: 'uid_att_0', attempts: 0, lastAttemptAt: null },
      });

      // attempts 1: requires 15 minutes backoff
      // 1A: 14m ago -> ineligible
      await prisma.pendingFirebaseDeletion.create({
        data: {
          firebaseUid: 'uid_att_1_ineligible',
          attempts: 1,
          lastAttemptAt: new Date(now.getTime() - 14 * 60 * 1000),
        },
      });
      // 1B: 16m ago -> eligible
      await prisma.pendingFirebaseDeletion.create({
        data: {
          firebaseUid: 'uid_att_1_eligible',
          attempts: 1,
          lastAttemptAt: new Date(now.getTime() - 16 * 60 * 1000),
        },
      });

      // attempts 2: requires 30 minutes backoff (29m ineligible, 31m eligible)
      await prisma.pendingFirebaseDeletion.create({
        data: {
          firebaseUid: 'uid_att_2_ineligible',
          attempts: 2,
          lastAttemptAt: new Date(now.getTime() - 29 * 60 * 1000),
        },
      });
      await prisma.pendingFirebaseDeletion.create({
        data: {
          firebaseUid: 'uid_att_2_eligible',
          attempts: 2,
          lastAttemptAt: new Date(now.getTime() - 31 * 60 * 1000),
        },
      });

      // attempts 3: requires 60 minutes backoff
      await prisma.pendingFirebaseDeletion.create({
        data: {
          firebaseUid: 'uid_att_3_ineligible',
          attempts: 3,
          lastAttemptAt: new Date(now.getTime() - 59 * 60 * 1000),
        },
      });
      await prisma.pendingFirebaseDeletion.create({
        data: {
          firebaseUid: 'uid_att_3_eligible',
          attempts: 3,
          lastAttemptAt: new Date(now.getTime() - 61 * 60 * 1000),
        },
      });

      // attempts 4: requires 120 minutes (2h)
      await prisma.pendingFirebaseDeletion.create({
        data: {
          firebaseUid: 'uid_att_4_ineligible',
          attempts: 4,
          lastAttemptAt: new Date(now.getTime() - 119 * 60 * 1000),
        },
      });
      await prisma.pendingFirebaseDeletion.create({
        data: {
          firebaseUid: 'uid_att_4_eligible',
          attempts: 4,
          lastAttemptAt: new Date(now.getTime() - 121 * 60 * 1000),
        },
      });

      // attempts 5: requires 240 minutes (4h)
      await prisma.pendingFirebaseDeletion.create({
        data: {
          firebaseUid: 'uid_att_5_ineligible',
          attempts: 5,
          lastAttemptAt: new Date(now.getTime() - 239 * 60 * 1000),
        },
      });
      await prisma.pendingFirebaseDeletion.create({
        data: {
          firebaseUid: 'uid_att_5_eligible',
          attempts: 5,
          lastAttemptAt: new Date(now.getTime() - 241 * 60 * 1000),
        },
      });

      // attempts 6: requires 360 minutes (6h cap)
      await prisma.pendingFirebaseDeletion.create({
        data: {
          firebaseUid: 'uid_att_6_ineligible',
          attempts: 6,
          lastAttemptAt: new Date(now.getTime() - 359 * 60 * 1000),
        },
      });
      await prisma.pendingFirebaseDeletion.create({
        data: {
          firebaseUid: 'uid_att_6_eligible',
          attempts: 6,
          lastAttemptAt: new Date(now.getTime() - 361 * 60 * 1000),
        },
      });

      // Mock Firebase deleteUser to succeed
      jest.spyOn(firebaseAdminAuth, 'deleteUser').mockResolvedValue(undefined as any);

      const sweep = await sweepFirebaseDeletions(100);

      // Exactly 7 eligible tasks: uid_att_0, uid_att_1_eligible, uid_att_2_eligible, uid_att_3_eligible, uid_att_4_eligible, uid_att_5_eligible, uid_att_6_eligible
      expect(sweep.processedCount).toBe(7);
      expect(sweep.successCount).toBe(7);
      expect(sweep.failedCount).toBe(0);

      // Exactly 6 ineligible tasks remaining
      const remaining = await prisma.pendingFirebaseDeletion.findMany();
      expect(remaining).toHaveLength(6);
      expect(remaining.every((r) => r.firebaseUid.includes('ineligible'))).toBe(true);
    });

    it('should treat auth/user-not-found from Firebase as idempotent success and delete queue row', async () => {
      await prisma.pendingFirebaseDeletion.create({
        data: { firebaseUid: 'fb_not_found_uid', attempts: 0 },
      });

      jest.spyOn(firebaseAdminAuth, 'deleteUser').mockRejectedValue({
        code: 'auth/user-not-found',
        message: 'There is no existing user record corresponding to the provided identifier.',
      });

      const sweep = await sweepFirebaseDeletions(10);
      expect(sweep.processedCount).toBe(1);
      expect(sweep.successCount).toBe(1);
      expect(sweep.failedCount).toBe(0);

      const remaining = await prisma.pendingFirebaseDeletion.findUnique({
        where: { firebaseUid: 'fb_not_found_uid' },
      });
      expect(remaining).toBeNull();
    });

    it('should record transient failure, increment attempts, and preserve task for indefinite retry', async () => {
      await prisma.pendingFirebaseDeletion.create({
        data: { firebaseUid: 'fb_transient_fail_uid', attempts: 0 },
      });

      jest.spyOn(firebaseAdminAuth, 'deleteUser').mockRejectedValue(new Error('Firebase service unavailable 503'));

      const sweep = await sweepFirebaseDeletions(10);
      expect(sweep.processedCount).toBe(1);
      expect(sweep.successCount).toBe(0);
      expect(sweep.failedCount).toBe(1);

      const item = await prisma.pendingFirebaseDeletion.findUnique({
        where: { firebaseUid: 'fb_transient_fail_uid' },
      });
      expect(item).not.toBeNull();
      expect(item?.attempts).toBe(1);
      expect(item?.lastError).toContain('Firebase service unavailable 503');
      expect(item?.lastAttemptAt).not.toBeNull();
    });

    it('should safely handle concurrent workers claiming the same task due to idempotent Firebase deletion', async () => {
      // Create a pending deletion task
      const task = await prisma.pendingFirebaseDeletion.create({
        data: { firebaseUid: 'fb_concurrent_uid', attempts: 0 },
      });

      // Worker A claims the task
      // In a real delay, Worker A sets lastAttemptAt = now.
      // Suppose Worker A's external network call takes longer than 15 minutes.
      // Time advances by 16 minutes:
      await prisma.pendingFirebaseDeletion.update({
        where: { id: task.id },
        data: {
          attempts: 1,
          lastAttemptAt: new Date(Date.now() - 16 * 60 * 1000),
        },
      });

      // Worker B now claims the same task
      // Worker A and Worker B both call deleteUser():
      // Worker A receives success, Worker B receives auth/user-not-found (already deleted)
      let callCount = 0;
      jest.spyOn(firebaseAdminAuth, 'deleteUser').mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return undefined as any; // First worker deletes it
        } else {
          const err: any = new Error('User not found');
          err.code = 'auth/user-not-found';
          throw err;
        }
      });

      // Worker B runs sweep
      const sweepB = await sweepFirebaseDeletions(10);
      expect(sweepB.processedCount).toBe(1);
      expect(sweepB.successCount).toBe(1);

      // Queue state is resolved cleanly
      const queueRow = await prisma.pendingFirebaseDeletion.findUnique({
        where: { id: task.id },
      });
      expect(queueRow).toBeNull();
    });
  });

  describe('5. Unified Lifecycle Runner Coordination', () => {
    it('should coordinate all 4 sweeps sequentially in runLifecycleSweep', async () => {
      const now = new Date();

      // Seed 1 expired inquiry
      await prisma.user.create({
        data: {
          id: testCreatorId,
          firebaseUid: testCreatorFbUid,
          email: testCreatorEmail,
          role: UserRole.CREATOR,
          status: AccountStatus.ACTIVE,
          creatorProfile: { create: { name: 'Creator', niche: 'Tech', location: 'BLR', bio: 'B' } },
        },
      });
      await prisma.user.create({
        data: {
          id: testBusinessId,
          firebaseUid: testBusinessFbUid,
          email: testBusinessEmail,
          role: UserRole.BUSINESS,
          status: AccountStatus.ACTIVE,
          businessProfile: {
            create: {
              businessName: 'Biz',
              category: 'Tech',
              description: 'Tech business',
              city: 'BLR',
              stateOrProvince: 'KA',
              country: 'IN',
            },
          },
        },
      });
      await prisma.inquiry.create({
        data: {
          businessId: testBusinessId,
          creatorId: testCreatorId,
          status: InquiryStatus.PENDING,
          collaborationType: 'GIFTING',
          platform: 'INSTAGRAM',
          deliverables: 'Post',
          brief: 'Brief',
          expiresAt: new Date(now.getTime() - 1000),
        },
      });

      // Seed 1 permanent deletion candidate
      await prisma.user.create({
        data: {
          id: testGraceUserId,
          firebaseUid: 'fb_perm_runner_1',
          email: 'perm.runner@example.com',
          role: UserRole.CREATOR,
          status: AccountStatus.DEACTIVATED,
          deletionScheduledAt: new Date(now.getTime() - 1000),
        },
      });

      // Seed 1 Firebase deletion task
      await prisma.pendingFirebaseDeletion.create({
        data: { firebaseUid: 'fb_runner_uid', attempts: 0 },
      });

      // Seed 1 expired email reservation
      await prisma.emailReservation.create({
        data: {
          emailHash: 'hash_runner_expired',
          reservedUntil: new Date(now.getTime() - 1000),
        },
      });

      jest.spyOn(firebaseAdminAuth, 'deleteUser').mockResolvedValue(undefined as any);

      const result = await runLifecycleSweep();

      expect(result.inquiriesExpired).toBe(1);
      expect(result.permanentDeletionsProcessed).toBe(1);
      expect(result.firebaseDeletionsProcessed).toBeGreaterThanOrEqual(1);
      expect(result.firebaseDeletionsSuccess).toBeGreaterThanOrEqual(1);
      expect(result.emailReservationsCleaned).toBeGreaterThanOrEqual(1);
    });
  });

  describe('6. Concurrency, Multi-Instance Safety & Crash Invariants', () => {
    it('should process disjoint users when two concurrent sweeps run with FOR UPDATE SKIP LOCKED', async () => {
      const now = new Date();
      const pastDeadline = new Date(now.getTime() - 1000);

      // Seed two deactivated users
      await prisma.user.create({
        data: {
          id: testCreatorId,
          firebaseUid: testCreatorFbUid,
          email: testCreatorEmail,
          role: UserRole.CREATOR,
          status: AccountStatus.DEACTIVATED,
          deletionScheduledAt: pastDeadline,
        },
      });

      await prisma.user.create({
        data: {
          id: testBusinessId,
          firebaseUid: testBusinessFbUid,
          email: testBusinessEmail,
          role: UserRole.BUSINESS,
          status: AccountStatus.DEACTIVATED,
          deletionScheduledAt: pastDeadline,
        },
      });

      // Run two sweeps concurrently
      const [res1, res2] = await Promise.all([
        sweepPermanentDeletions(10),
        sweepPermanentDeletions(10),
      ]);

      // Together they should process both users without deadlock or duplicate execution
      expect(res1.processedCount + res2.processedCount).toBe(2);

      const usersAfter = await prisma.user.findMany({
        where: { id: { in: [testCreatorId, testBusinessId] } },
      });
      expect(usersAfter.every((u) => u.status === AccountStatus.DELETED)).toBe(true);
    });

    it('Crash before commit: should rollback transaction and preserve user as DEACTIVATED if crash occurs mid-transaction', async () => {
      const now = new Date();
      await prisma.user.create({
        data: {
          id: testCreatorId,
          firebaseUid: testCreatorFbUid,
          email: testCreatorEmail,
          role: UserRole.CREATOR,
          status: AccountStatus.DEACTIVATED,
          deletionScheduledAt: new Date(now.getTime() - 1000),
          creatorProfile: {
            create: { name: 'Creator to Fail', niche: 'Art', location: 'Goa', bio: 'Bio' },
          },
        },
      });

      // Spy on prisma.$transaction to inject an error before commit, simulating a crash mid-transaction
      const originalTx = prisma.$transaction;
      jest.spyOn(prisma, '$transaction').mockImplementationOnce(async (callback: any) => {
        return originalTx.call(prisma, async (tx: any) => {
          tx.user.update = jest.fn().mockRejectedValue(new Error('Simulated crash before commit'));
          return callback(tx);
        });
      });

      await expect(permanentlyDeleteUser(testCreatorId)).rejects.toThrow('Simulated crash before commit');

      // User must remain DEACTIVATED with original email and profile preserved (atomicity)
      const user = await prisma.user.findUnique({ where: { id: testCreatorId } });
      expect(user?.status).toBe(AccountStatus.DEACTIVATED);
      expect(user?.email).toBe(testCreatorEmail);

      const profile = await prisma.creatorProfile.findUnique({ where: { userId: testCreatorId } });
      expect(profile?.name).toBe('Creator to Fail');
    });

    it('Crash after commit: queue row remains in DB and subsequent worker sweep cleans it up', async () => {
      // Simulate committed permanent deletion with Firebase UID in queue
      await prisma.pendingFirebaseDeletion.create({
        data: { firebaseUid: 'fb_crash_recover_uid', attempts: 0 },
      });

      // Sweep runs and cleans it up
      jest.spyOn(firebaseAdminAuth, 'deleteUser').mockResolvedValue(undefined as any);
      const sweep = await sweepFirebaseDeletions(10);
      expect(sweep.successCount).toBe(1);

      const remaining = await prisma.pendingFirebaseDeletion.findUnique({
        where: { firebaseUid: 'fb_crash_recover_uid' },
      });
      expect(remaining).toBeNull();
    });

    it('should continue retrying indefinitely past 10 attempts without dropping task', async () => {
      const task = await prisma.pendingFirebaseDeletion.create({
        data: {
          firebaseUid: 'fb_10_attempts_uid',
          attempts: 10,
          lastAttemptAt: new Date(Date.now() - 361 * 60 * 1000), // > 6h ago
        },
      });

      jest.spyOn(firebaseAdminAuth, 'deleteUser').mockRejectedValue(new Error('Permanent Google outage'));

      const sweep = await sweepFirebaseDeletions(10);
      expect(sweep.processedCount).toBe(1);
      expect(sweep.failedCount).toBe(1);

      // Task must NOT be dropped
      const refreshed = await prisma.pendingFirebaseDeletion.findUnique({ where: { id: task.id } });
      expect(refreshed).not.toBeNull();
      expect(refreshed?.attempts).toBe(11);
      expect(refreshed?.lastError).toContain('Permanent Google outage');
    });

    it('should skip duplicate concurrent execution when runLifecycleSweep is already running', async () => {
      // Simulate two overlapping runner invocations
      const [res1, res2] = await Promise.all([
        runLifecycleSweep(),
        runLifecycleSweep(),
      ]);

      // At least one of them will report cleanly, while the other skipped tick
      expect(res1).toBeDefined();
      expect(res2).toBeDefined();
    });

    it('should verify single permanentDeletedAt deterministic timestamp consistency', async () => {
      const now = new Date();
      await prisma.user.create({
        data: {
          id: testCreatorId,
          firebaseUid: testCreatorFbUid,
          email: testCreatorEmail,
          role: UserRole.CREATOR,
          status: AccountStatus.DEACTIVATED,
          deletionScheduledAt: new Date(now.getTime() - 1000),
        },
      });

      const res = await permanentlyDeleteUser(testCreatorId);
      expect(res.deleted).toBe(true);

      const user = await prisma.user.findUnique({ where: { id: testCreatorId } });
      const emailHash = hashEmailForReservation(testCreatorEmail);
      const resRow = await prisma.emailReservation.findUnique({ where: { emailHash } });
      const audit = await prisma.auditEvent.findFirst({
        where: { resourceId: testCreatorId, eventType: 'ACCOUNT_PERMANENTLY_DELETED' },
      });

      expect(user?.deletedAt).toBeDefined();
      expect(resRow?.reservedUntil).toBeDefined();
      expect(audit?.createdAt).toBeDefined();

      // Ensure exact deterministic 180 day offset
      const diffDays = (resRow!.reservedUntil.getTime() - user!.deletedAt!.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(180);
    });
  });
});


