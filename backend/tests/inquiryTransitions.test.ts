import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import request from 'supertest';
import { PGlite } from '@electric-sql/pglite';
import { app } from '../src/app';
import { firebaseAdminAuth } from '../src/config/firebase';
import prisma from '../src/database/prisma';
import { acceptInquiry, rejectInquiry, expireInquiries } from '../src/services/inquiry.service';
import { UserRole, AccountStatus, InquiryStatus, NotificationType, AuditEventType } from '@prisma/client';

describe('Phase 8B Inquiry State Machine Test Suite', () => {
  let verifyIdTokenSpy: jest.SpyInstance;

  const mockBusinessUser = {
    id: 'b1000000-0000-4000-8000-000000000001',
    firebaseUid: 'firebase_biz_1',
    email: 'business@example.com',
    role: UserRole.BUSINESS,
    status: AccountStatus.ACTIVE,
  };

  const mockCreatorUserA = {
    id: 'c1000000-0000-4000-8000-000000000001',
    firebaseUid: 'firebase_creator_a',
    email: 'creator.a@example.com',
    role: UserRole.CREATOR,
    status: AccountStatus.ACTIVE,
  };

  const mockCreatorUserB = {
    id: 'c2000000-0000-4000-8000-000000000002',
    firebaseUid: 'firebase_creator_b',
    email: 'creator.b@example.com',
    role: UserRole.CREATOR,
    status: AccountStatus.ACTIVE,
  };

  const mockCreatorProfileA = {
    id: 'a1000000-0000-4000-8000-000000000001',
    userId: mockCreatorUserA.id,
    name: 'Elena Rostova',
  };

  const mockInquiryId = 'e1000000-0000-4000-8000-000000000001';

  const samplePendingInquiry = {
    id: mockInquiryId,
    businessId: mockBusinessUser.id,
    creatorId: mockCreatorUserA.id,
    status: InquiryStatus.PENDING,
    collaborationType: 'Sponsored Instagram Reel',
    platform: 'Instagram',
    deliverables: '1 Dedicated 60s Reel',
    timelineStart: new Date('2026-10-01'),
    timelineEnd: new Date('2026-10-15'),
    brief: 'Fall collection launch promotional collaboration.',
    additionalRequirements: 'Raw video footage delivery required.',
    createdAt: new Date('2026-09-10T10:00:00Z'),
    expiresAt: new Date('2026-11-09T10:00:00Z'),
    respondedAt: null,
    closedAt: null,
    creator: {
      creatorProfile: {
        id: mockCreatorProfileA.id,
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    verifyIdTokenSpy = jest.spyOn(firebaseAdminAuth, 'verifyIdToken');
  });

  afterEach(() => {
    if (verifyIdTokenSpy) {
      verifyIdTokenSpy.mockRestore();
    }
    jest.restoreAllMocks();
  });

  // ─── 1. ACCEPT TRANSITION ───────────────────────────────────────────────────
  describe('1. Accept Operation (PENDING -> ACCEPTED)', () => {
    beforeEach(() => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockCreatorUserA.firebaseUid,
        email: mockCreatorUserA.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockCreatorUserA as any);
    });

    it('should transition PENDING inquiry to ACCEPTED, set respondedAt, and emit notification and audit event', async () => {
      const updateManySpy = jest.fn().mockResolvedValue({ count: 1 });
      const createNotificationSpy = jest.fn().mockResolvedValue({});
      const createAuditSpy = jest.fn().mockResolvedValue({});

      jest.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          inquiry: {
            findUnique: jest.fn().mockResolvedValue(samplePendingInquiry),
            updateMany: updateManySpy,
          },
          notification: { create: createNotificationSpy },
          auditEvent: { create: createAuditSpy },
        });
      });

      const res = await request(app)
        .post(`/api/v1/inquiries/${mockInquiryId}/accept`)
        .set('Authorization', 'Bearer creator-token');

      expect(res.status).toBe(200);
      expect(res.body.inquiry).toBeDefined();
      expect(res.body.inquiry.id).toBe(mockInquiryId);
      expect(res.body.inquiry.status).toBe('ACCEPTED');
      expect(res.body.inquiry.respondedAt).toBeDefined();
      expect(res.body.inquiry.respondedAt).not.toBeNull();
      expect(res.body.inquiry.closedAt).toBeUndefined(); // SafeInquiryDTO does not expose internal fields

      // Verify atomic compare-and-swap update query
      expect(updateManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: mockInquiryId,
            creatorId: mockCreatorUserA.id,
            status: InquiryStatus.PENDING,
          }),
          data: expect.objectContaining({
            status: InquiryStatus.ACCEPTED,
            respondedAt: expect.any(Date),
          }),
        })
      );

      // Verify business recipient notification
      expect(createNotificationSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockBusinessUser.id,
          type: NotificationType.INQUIRY_ACCEPTED,
          referenceId: mockInquiryId,
          createdAt: expect.any(Date),
        }),
      });

      // Verify audit event logging
      expect(createAuditSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: AuditEventType.INQUIRY_ACCEPTED,
          actorUserId: mockCreatorUserA.id,
          resourceType: 'INQUIRY',
          resourceId: mockInquiryId,
          metadata: {
            previousStatus: 'PENDING',
            newStatus: 'ACCEPTED',
          },
          createdAt: expect.any(Date),
        }),
      });
    });
  });

  // ─── 2. REJECT TRANSITION ───────────────────────────────────────────────────
  describe('2. Reject Operation (PENDING -> REJECTED)', () => {
    beforeEach(() => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockCreatorUserA.firebaseUid,
        email: mockCreatorUserA.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockCreatorUserA as any);
    });

    it('should transition PENDING inquiry to REJECTED, set respondedAt, and emit notification and audit event', async () => {
      const updateManySpy = jest.fn().mockResolvedValue({ count: 1 });
      const createNotificationSpy = jest.fn().mockResolvedValue({});
      const createAuditSpy = jest.fn().mockResolvedValue({});

      jest.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          inquiry: {
            findUnique: jest.fn().mockResolvedValue(samplePendingInquiry),
            updateMany: updateManySpy,
          },
          notification: { create: createNotificationSpy },
          auditEvent: { create: createAuditSpy },
        });
      });

      const res = await request(app)
        .post(`/api/v1/inquiries/${mockInquiryId}/reject`)
        .set('Authorization', 'Bearer creator-token');

      expect(res.status).toBe(200);
      expect(res.body.inquiry).toBeDefined();
      expect(res.body.inquiry.id).toBe(mockInquiryId);
      expect(res.body.inquiry.status).toBe('REJECTED');
      expect(res.body.inquiry.respondedAt).toBeDefined();
      expect(res.body.inquiry.respondedAt).not.toBeNull();

      // Verify atomic compare-and-swap update query
      expect(updateManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: mockInquiryId,
            creatorId: mockCreatorUserA.id,
            status: InquiryStatus.PENDING,
          }),
          data: expect.objectContaining({
            status: InquiryStatus.REJECTED,
            respondedAt: expect.any(Date),
          }),
        })
      );

      // Verify business recipient notification
      expect(createNotificationSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockBusinessUser.id,
          type: NotificationType.INQUIRY_REJECTED,
          referenceId: mockInquiryId,
          createdAt: expect.any(Date),
        }),
      });

      // Verify audit event logging
      expect(createAuditSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: AuditEventType.INQUIRY_REJECTED,
          actorUserId: mockCreatorUserA.id,
          resourceType: 'INQUIRY',
          resourceId: mockInquiryId,
          metadata: {
            previousStatus: 'PENDING',
            newStatus: 'REJECTED',
          },
          createdAt: expect.any(Date),
        }),
      });
    });
  });

  // ─── 3. AUTHORIZATION & PRIVACY ────────────────────────────────────────────
  describe('3. Authorization & Privacy Guards', () => {
    it('should return 401 when accessing accept unauthenticated', async () => {
      const res = await request(app).post(`/api/v1/inquiries/${mockInquiryId}/accept`);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should return 401 when accessing reject unauthenticated', async () => {
      const res = await request(app).post(`/api/v1/inquiries/${mockInquiryId}/reject`);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should return 403 FORBIDDEN_ROLE when a BUSINESS user attempts to accept an inquiry', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockBusinessUser.firebaseUid,
        email: mockBusinessUser.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockBusinessUser as any);

      const res = await request(app)
        .post(`/api/v1/inquiries/${mockInquiryId}/accept`)
        .set('Authorization', 'Bearer business-token');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
    });

    it('should return 403 FORBIDDEN_ROLE when a BUSINESS user attempts to reject an inquiry', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockBusinessUser.firebaseUid,
        email: mockBusinessUser.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockBusinessUser as any);

      const res = await request(app)
        .post(`/api/v1/inquiries/${mockInquiryId}/reject`)
        .set('Authorization', 'Bearer business-token');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
    });

    it('should return 404 INQUIRY_NOT_FOUND when Creator B attempts to accept Creator A inquiry (Privacy Isolation)', async () => {
      // Authenticated as Creator B
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockCreatorUserB.firebaseUid,
        email: mockCreatorUserB.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockCreatorUserB as any);

      // Inquiry belongs to Creator A (mockCreatorUserA.id)
      jest.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          inquiry: {
            findUnique: jest.fn().mockResolvedValue(samplePendingInquiry), // creatorId is Creator A
          },
        });
      });

      const res = await request(app)
        .post(`/api/v1/inquiries/${mockInquiryId}/accept`)
        .set('Authorization', 'Bearer creator-b-token');

      // STRICT PRIVACY: Must return 404 rather than 403 to prevent inquiry ID enumeration
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('INQUIRY_NOT_FOUND');
    });

    it('should return 404 INQUIRY_NOT_FOUND when Creator B attempts to reject Creator A inquiry (Privacy Isolation)', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockCreatorUserB.firebaseUid,
        email: mockCreatorUserB.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockCreatorUserB as any);

      jest.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          inquiry: {
            findUnique: jest.fn().mockResolvedValue(samplePendingInquiry),
          },
        });
      });

      const res = await request(app)
        .post(`/api/v1/inquiries/${mockInquiryId}/reject`)
        .set('Authorization', 'Bearer creator-b-token');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('INQUIRY_NOT_FOUND');
    });

    it('should return 404 INQUIRY_NOT_FOUND for nonexistent or malformed inquiry ID', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockCreatorUserA.firebaseUid,
        email: mockCreatorUserA.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockCreatorUserA as any);

      const res = await request(app)
        .post('/api/v1/inquiries/not-a-valid-uuid/accept')
        .set('Authorization', 'Bearer creator-a-token');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('INQUIRY_NOT_FOUND');
    });
  });

  // ─── 4. INVALID STATE TRANSITIONS ──────────────────────────────────────────
  describe('4. Invalid State Transitions (409 Conflict)', () => {
    let updateManySpy: jest.Mock;
    let createNotificationSpy: jest.Mock;
    let createAuditSpy: jest.Mock;

    beforeEach(() => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockCreatorUserA.firebaseUid,
        email: mockCreatorUserA.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockCreatorUserA as any);

      updateManySpy = jest.fn();
      createNotificationSpy = jest.fn();
      createAuditSpy = jest.fn();
    });

    const setupTransactionMock = (inquiryState: any) => {
      jest.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          inquiry: {
            findUnique: jest.fn().mockResolvedValue(inquiryState),
            updateMany: updateManySpy,
          },
          notification: { create: createNotificationSpy },
          auditEvent: { create: createAuditSpy },
        });
      });
    };

    // ── ACCEPTED ──
    it('should return 409 INVALID_INQUIRY_STATE when attempting to accept an already ACCEPTED inquiry and leave state, notification, and audit unchanged', async () => {
      setupTransactionMock({ ...samplePendingInquiry, status: InquiryStatus.ACCEPTED });

      const res = await request(app)
        .post(`/api/v1/inquiries/${mockInquiryId}/accept`)
        .set('Authorization', 'Bearer creator-token');

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INVALID_INQUIRY_STATE');
      expect(res.body.error.message).toContain('Inquiry is no longer pending');
      expect(updateManySpy).not.toHaveBeenCalled();
      expect(createNotificationSpy).not.toHaveBeenCalled();
      expect(createAuditSpy).not.toHaveBeenCalled();
    });

    it('should return 409 INVALID_INQUIRY_STATE when attempting to reject an already ACCEPTED inquiry (ACCEPTED -> REJECTED invalid) and leave state, notification, and audit unchanged', async () => {
      setupTransactionMock({ ...samplePendingInquiry, status: InquiryStatus.ACCEPTED });

      const res = await request(app)
        .post(`/api/v1/inquiries/${mockInquiryId}/reject`)
        .set('Authorization', 'Bearer creator-token');

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INVALID_INQUIRY_STATE');
      expect(res.body.error.message).toContain('Inquiry is no longer pending');
      expect(updateManySpy).not.toHaveBeenCalled();
      expect(createNotificationSpy).not.toHaveBeenCalled();
      expect(createAuditSpy).not.toHaveBeenCalled();
    });

    // ── REJECTED ──
    it('should return 409 INVALID_INQUIRY_STATE when attempting to accept an already REJECTED inquiry (REJECTED -> ACCEPTED invalid) and leave state, notification, and audit unchanged', async () => {
      setupTransactionMock({ ...samplePendingInquiry, status: InquiryStatus.REJECTED });

      const res = await request(app)
        .post(`/api/v1/inquiries/${mockInquiryId}/accept`)
        .set('Authorization', 'Bearer creator-token');

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INVALID_INQUIRY_STATE');
      expect(res.body.error.message).toContain('Inquiry is no longer pending');
      expect(updateManySpy).not.toHaveBeenCalled();
      expect(createNotificationSpy).not.toHaveBeenCalled();
      expect(createAuditSpy).not.toHaveBeenCalled();
    });

    it('should return 409 INVALID_INQUIRY_STATE when attempting to reject an already REJECTED inquiry and leave state, notification, and audit unchanged', async () => {
      setupTransactionMock({ ...samplePendingInquiry, status: InquiryStatus.REJECTED });

      const res = await request(app)
        .post(`/api/v1/inquiries/${mockInquiryId}/reject`)
        .set('Authorization', 'Bearer creator-token');

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INVALID_INQUIRY_STATE');
      expect(res.body.error.message).toContain('Inquiry is no longer pending');
      expect(updateManySpy).not.toHaveBeenCalled();
      expect(createNotificationSpy).not.toHaveBeenCalled();
      expect(createAuditSpy).not.toHaveBeenCalled();
    });

    // ── EXPIRED ──
    it('should return 409 INVALID_INQUIRY_STATE when attempting to accept an EXPIRED inquiry and leave state, notification, and audit unchanged', async () => {
      setupTransactionMock({ ...samplePendingInquiry, status: InquiryStatus.EXPIRED });

      const res = await request(app)
        .post(`/api/v1/inquiries/${mockInquiryId}/accept`)
        .set('Authorization', 'Bearer creator-token');

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INVALID_INQUIRY_STATE');
      expect(res.body.error.message).toContain('Inquiry is no longer pending');
      expect(updateManySpy).not.toHaveBeenCalled();
      expect(createNotificationSpy).not.toHaveBeenCalled();
      expect(createAuditSpy).not.toHaveBeenCalled();
    });

    it('should return 409 INVALID_INQUIRY_STATE when attempting to reject an EXPIRED inquiry and leave state, notification, and audit unchanged', async () => {
      setupTransactionMock({ ...samplePendingInquiry, status: InquiryStatus.EXPIRED });

      const res = await request(app)
        .post(`/api/v1/inquiries/${mockInquiryId}/reject`)
        .set('Authorization', 'Bearer creator-token');

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INVALID_INQUIRY_STATE');
      expect(res.body.error.message).toContain('Inquiry is no longer pending');
      expect(updateManySpy).not.toHaveBeenCalled();
      expect(createNotificationSpy).not.toHaveBeenCalled();
      expect(createAuditSpy).not.toHaveBeenCalled();
    });

    // ── CLOSED ──
    it('should return 409 INVALID_INQUIRY_STATE when attempting to accept a CLOSED inquiry and leave state, notification, and audit unchanged', async () => {
      setupTransactionMock({ ...samplePendingInquiry, status: InquiryStatus.CLOSED });

      const res = await request(app)
        .post(`/api/v1/inquiries/${mockInquiryId}/accept`)
        .set('Authorization', 'Bearer creator-token');

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INVALID_INQUIRY_STATE');
      expect(res.body.error.message).toContain('Inquiry is no longer pending');
      expect(updateManySpy).not.toHaveBeenCalled();
      expect(createNotificationSpy).not.toHaveBeenCalled();
      expect(createAuditSpy).not.toHaveBeenCalled();
    });

    it('should return 409 INVALID_INQUIRY_STATE when attempting to reject a CLOSED inquiry and leave state, notification, and audit unchanged', async () => {
      setupTransactionMock({ ...samplePendingInquiry, status: InquiryStatus.CLOSED });

      const res = await request(app)
        .post(`/api/v1/inquiries/${mockInquiryId}/reject`)
        .set('Authorization', 'Bearer creator-token');

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INVALID_INQUIRY_STATE');
      expect(res.body.error.message).toContain('Inquiry is no longer pending');
      expect(updateManySpy).not.toHaveBeenCalled();
      expect(createNotificationSpy).not.toHaveBeenCalled();
      expect(createAuditSpy).not.toHaveBeenCalled();
    });
  });

  // ─── 5. TRANSACTION ROLLBACK INVARIANTS ──────────────────────────────────────
  describe('5. Transaction Rollback Invariants (PostgreSQL Engine)', () => {
    let pgliteDb: PGlite;

    beforeAll(async () => {
      pgliteDb = new PGlite();
      const migrationPath = path.join(
        __dirname,
        '../prisma/migrations/20260901000000_init_domain_schema/migration.sql'
      );
      const migrationSql = fs.readFileSync(migrationPath, 'utf8');
      await pgliteDb.exec(migrationSql);

      // Pre-seed users and creator profile in the real PostgreSQL test schema
      await pgliteDb.query(
        `INSERT INTO users (id, firebase_uid, email, role, status, updated_at)
         VALUES ($1, $2, $3, 'CREATOR', 'ACTIVE', NOW()),
                ($4, $5, $6, 'BUSINESS', 'ACTIVE', NOW());`,
        [
          mockCreatorUserA.id,
          mockCreatorUserA.firebaseUid,
          mockCreatorUserA.email,
          mockBusinessUser.id,
          mockBusinessUser.firebaseUid,
          mockBusinessUser.email,
        ]
      );

      await pgliteDb.query(
        `INSERT INTO creator_profiles (
          id, user_id, name, niche, location, bio, specialties, instagram_url, profile_photo_url, collaboration_email, updated_at
        ) VALUES (
          $1, $2, 'Elena Rostova', 'Fashion', 'Milan', 'Stylist', ARRAY['Fashion'], 'https://instagram.com/elena', 'https://example.com/photo.jpg', 'elena@example.com', NOW()
        );`,
        [mockCreatorProfileA.id, mockCreatorUserA.id]
      );
    });

    afterAll(async () => {
      await pgliteDb.close();
    });

    beforeEach(async () => {
      await pgliteDb.query('DELETE FROM notifications;');
      await pgliteDb.query('DELETE FROM audit_events;');
      await pgliteDb.query('DELETE FROM inquiries;');

      // Seed a fresh PENDING inquiry
      await pgliteDb.query(
        `INSERT INTO inquiries (
          id, business_id, creator_id, status, collaboration_type, platform, deliverables, brief, created_at, expires_at, updated_at
        ) VALUES (
          $1, $2, $3, 'PENDING', 'Reel', 'Instagram', 'Deliverables text', 'Brief text', NOW(), NOW() + interval '60 days', NOW()
        );`,
        [mockInquiryId, mockBusinessUser.id, mockCreatorUserA.id]
      );
    });

    function createPgliteBridge(db: PGlite, failAt: 'notification' | 'audit') {
      return async (callback: (tx: any) => Promise<any>) => {
        return db.transaction(async (pgTx) => {
          const txBridge: any = {
            inquiry: {
              findUnique: async ({ where }: any) => {
                const res = await pgTx.query<any>(
                  `SELECT * FROM inquiries WHERE id = $1;`,
                  [where.id]
                );
                if (!res.rows[0]) return null;
                const row = res.rows[0];
                return {
                  id: row.id,
                  businessId: row.business_id,
                  creatorId: row.creator_id,
                  status: row.status,
                  collaborationType: row.collaboration_type,
                  platform: row.platform,
                  deliverables: row.deliverables,
                  brief: row.brief,
                  additionalRequirements: row.additional_requirements,
                  timelineStart: row.timeline_start ? new Date(row.timeline_start) : null,
                  timelineEnd: row.timeline_end ? new Date(row.timeline_end) : null,
                  createdAt: new Date(row.created_at),
                  expiresAt: new Date(row.expires_at),
                  respondedAt: row.responded_at ? new Date(row.responded_at) : null,
                  closedAt: row.closed_at ? new Date(row.closed_at) : null,
                  creator: {
                    creatorProfile: {
                      id: mockCreatorProfileA.id,
                    },
                  },
                };
              },
              updateMany: async ({ where, data }: any) => {
                const res = await pgTx.query<any>(
                  `UPDATE inquiries
                   SET status = $1, responded_at = $2, updated_at = NOW()
                   WHERE id = $3 AND creator_id = $4 AND status = $5
                   RETURNING *;`,
                  [data.status, data.respondedAt, where.id, where.creatorId, where.status]
                );
                return { count: res.rows.length };
              },
            },
            notification: {
              create: async ({ data }: any) => {
                if (failAt === 'notification') {
                  throw new Error('Forced notification creation failure for rollback test');
                }
                const notifId = crypto.randomUUID();
                const res = await pgTx.query<any>(
                  `INSERT INTO notifications (id, user_id, type, reference_id, created_at)
                   VALUES ($1, $2, $3, $4, $5) RETURNING *;`,
                  [notifId, data.userId, data.type, data.referenceId, data.createdAt]
                );
                return res.rows[0];
              },
            },
            auditEvent: {
              create: async ({ data }: any) => {
                if (failAt === 'audit') {
                  throw new Error('Forced audit creation failure for rollback test');
                }
                const auditId = crypto.randomUUID();
                const res = await pgTx.query<any>(
                  `INSERT INTO audit_events (id, event_type, actor_user_id, resource_type, resource_id, metadata, created_at)
                   VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;`,
                  [
                    auditId,
                    data.eventType,
                    data.actorUserId,
                    data.resourceType,
                    data.resourceId,
                    JSON.stringify(data.metadata),
                    data.createdAt,
                  ]
                );
                return res.rows[0];
              },
            },
          };

          return callback(txBridge);
        });
      };
    }

    it('should rollback transaction and preserve PENDING status when notification creation fails during accept', async () => {
      jest.spyOn(prisma, '$transaction').mockImplementation(
        createPgliteBridge(pgliteDb, 'notification') as any
      );

      await expect(acceptInquiry(mockCreatorUserA.id, mockInquiryId)).rejects.toThrow(
        'Forced notification creation failure for rollback test'
      );

      // Verify database state in PostgreSQL: inquiry status must still be PENDING, respondedAt null
      const inquiryRes = await pgliteDb.query<any>(`SELECT * FROM inquiries WHERE id = $1;`, [
        mockInquiryId,
      ]);
      expect(inquiryRes.rows[0].status).toBe('PENDING');
      expect(inquiryRes.rows[0].responded_at).toBeNull();

      // Zero notifications or audit events should exist
      const notifRes = await pgliteDb.query(`SELECT * FROM notifications;`);
      const auditRes = await pgliteDb.query(`SELECT * FROM audit_events;`);
      expect(notifRes.rows.length).toBe(0);
      expect(auditRes.rows.length).toBe(0);
    });

    it('should rollback transaction and preserve PENDING status when audit event creation fails during accept', async () => {
      jest.spyOn(prisma, '$transaction').mockImplementation(
        createPgliteBridge(pgliteDb, 'audit') as any
      );

      await expect(acceptInquiry(mockCreatorUserA.id, mockInquiryId)).rejects.toThrow(
        'Forced audit creation failure for rollback test'
      );

      const inquiryRes = await pgliteDb.query<any>(`SELECT * FROM inquiries WHERE id = $1;`, [
        mockInquiryId,
      ]);
      expect(inquiryRes.rows[0].status).toBe('PENDING');
      expect(inquiryRes.rows[0].responded_at).toBeNull();

      const notifRes = await pgliteDb.query(`SELECT * FROM notifications;`);
      const auditRes = await pgliteDb.query(`SELECT * FROM audit_events;`);
      expect(notifRes.rows.length).toBe(0);
      expect(auditRes.rows.length).toBe(0);
    });

    it('should rollback transaction and preserve PENDING status when notification creation fails during reject', async () => {
      jest.spyOn(prisma, '$transaction').mockImplementation(
        createPgliteBridge(pgliteDb, 'notification') as any
      );

      await expect(rejectInquiry(mockCreatorUserA.id, mockInquiryId)).rejects.toThrow(
        'Forced notification creation failure for rollback test'
      );

      const inquiryRes = await pgliteDb.query<any>(`SELECT * FROM inquiries WHERE id = $1;`, [
        mockInquiryId,
      ]);
      expect(inquiryRes.rows[0].status).toBe('PENDING');
      expect(inquiryRes.rows[0].responded_at).toBeNull();

      const notifRes = await pgliteDb.query(`SELECT * FROM notifications;`);
      const auditRes = await pgliteDb.query(`SELECT * FROM audit_events;`);
      expect(notifRes.rows.length).toBe(0);
      expect(auditRes.rows.length).toBe(0);
    });
  });

  // ─── 6. EXPIRATION FUNCTION ────────────────────────────────────────────────
  describe('6. Expiration Transition Function (expireInquiries)', () => {
    it('should transition stale PENDING inquiries to EXPIRED, set no respondedAt, and emit notifications and audits', async () => {
      const staleId1 = 's1000000-0000-4000-8000-000000000001';
      const staleId2 = 's2000000-0000-4000-8000-000000000002';

      const findManySpy = jest.fn().mockResolvedValue([
        { id: staleId1, businessId: mockBusinessUser.id, creatorId: mockCreatorUserA.id },
        { id: staleId2, businessId: mockBusinessUser.id, creatorId: mockCreatorUserA.id },
      ]);

      const updateManySpy = jest.fn().mockResolvedValue({ count: 1 });
      const createNotificationSpy = jest.fn().mockResolvedValue({});
      const createAuditSpy = jest.fn().mockResolvedValue({});

      jest.spyOn(prisma.inquiry, 'findMany').mockImplementation(findManySpy);
      jest.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          inquiry: { updateMany: updateManySpy },
          notification: { create: createNotificationSpy },
          auditEvent: { create: createAuditSpy },
        });
      });

      const result = await expireInquiries();

      expect(result.expiredCount).toBe(2);
      expect(updateManySpy).toHaveBeenCalledTimes(2);

      // Verify status is EXPIRED, respondedAt is NOT updated
      expect(updateManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: InquiryStatus.EXPIRED },
        })
      );

      // Verify INQUIRY_EXPIRED notification emitted to business
      expect(createNotificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: mockBusinessUser.id,
            type: NotificationType.INQUIRY_EXPIRED,
          }),
        })
      );

      // Verify INQUIRY_EXPIRED audit event emitted with system actor (null)
      expect(createAuditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: AuditEventType.INQUIRY_EXPIRED,
            actorUserId: null,
            metadata: {
              previousStatus: 'PENDING',
              newStatus: 'EXPIRED',
            },
          }),
        })
      );
    });

    it('should be idempotent: subsequent run when no stale inquiries exist returns expiredCount 0', async () => {
      jest.spyOn(prisma.inquiry, 'findMany').mockResolvedValue([]);

      const result = await expireInquiries();
      expect(result.expiredCount).toBe(0);
    });

    it('should NOT expire inquiries already transitioned to ACCEPTED or REJECTED even if expiresAt is in the past (Expiration Safety)', async () => {
      // When non-pending inquiries exist with past expiresAt timestamps, Prisma findMany filters them out via status = PENDING
      const findManySpy = jest.spyOn(prisma.inquiry, 'findMany').mockResolvedValue([]);
      const updateManySpy = jest.fn();
      const createNotificationSpy = jest.fn();
      const createAuditSpy = jest.fn();

      jest.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          inquiry: { updateMany: updateManySpy },
          notification: { create: createNotificationSpy },
          auditEvent: { create: createAuditSpy },
        });
      });

      const result = await expireInquiries();

      // Invariant: exactly 0 inquiries were transitioned to EXPIRED
      expect(result.expiredCount).toBe(0);

      // Verify the query strictly enforces status = PENDING
      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: InquiryStatus.PENDING,
            expiresAt: expect.objectContaining({ lte: expect.any(Date) }),
          }),
        })
      );

      // Verify no mutations or side effects occurred
      expect(updateManySpy).not.toHaveBeenCalled();
      expect(createNotificationSpy).not.toHaveBeenCalled();
      expect(createAuditSpy).not.toHaveBeenCalled();
    });
  });

  // ─── 7. STATUS INTEGRITY ───────────────────────────────────────────────────
  describe('7. Status Integrity & Route Protection', () => {
    it('should return 404 for arbitrary status modification attempts (no generic PATCH endpoint)', async () => {
      const res = await request(app)
        .patch(`/api/v1/inquiries/${mockInquiryId}`)
        .send({ status: 'ACCEPTED' });

      expect(res.status).toBe(404);
    });
  });
});
