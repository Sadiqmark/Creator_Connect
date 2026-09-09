import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import request from 'supertest';
import { PGlite } from '@electric-sql/pglite';
import { app } from '../src/app';
import { firebaseAdminAuth } from '../src/config/firebase';
import prisma from '../src/database/prisma';
import { createInquiry } from '../src/services/inquiry.service';
import { UserRole, AccountStatus, InquiryStatus, NotificationType, AuditEventType } from '@prisma/client';

describe('Phase 7B Inquiry Creation Test Suite', () => {
  let verifyIdTokenSpy: jest.SpyInstance;

  const mockBusinessUser = {
    id: 'b1000000-0000-4000-8000-000000000001',
    firebaseUid: 'firebase_biz_1',
    email: 'business@example.com',
    role: UserRole.BUSINESS,
    status: AccountStatus.ACTIVE,
  };

  const mockCreatorUser = {
    id: 'c1000000-0000-4000-8000-000000000001',
    firebaseUid: 'firebase_creator_1',
    email: 'creator@example.com',
    role: UserRole.CREATOR,
    status: AccountStatus.ACTIVE,
  };

  const mockCreatorProfileId = 'c0000000-0000-4000-8000-000000000001';

  const sampleCreatorProfile = {
    id: mockCreatorProfileId,
    userId: mockCreatorUser.id,
    name: 'Elena Rostova',
    niche: 'Fashion',
    location: 'Milan, Italy',
    bio: 'High-fashion editorial stylist and visual creator with international brand reach.',
    specialties: ['Fashion Styling', 'Photography'],
    instagramUrl: 'https://instagram.com/elenarostova',
    youtubeUrl: null,
    profilePhotoUrl: 'https://storage.googleapis.com/test/photo1.jpg',
    collaborationEmail: 'elena.private@agency.com',
    user: {
      id: mockCreatorUser.id,
      role: UserRole.CREATOR,
      status: 'ACTIVE',
    },
  };

  const validPayload = {
    creatorId: mockCreatorProfileId,
    collaborationType: 'Sponsored Instagram Reel & Story Series',
    platform: 'Instagram',
    deliverables: '1 Dedicated 60s Reel showcasing Cold Brew concentrate + 3 Stories with product link.',
    timelineStart: '2026-10-01',
    timelineEnd: '2026-10-15',
    brief: 'We are launching our Monsoon Cold Brew blend and seeking an authentic styling Reel pairing morning coffee with daily lifestyle routines.',
    additionalRequirements: 'Deliver raw video footage for brand whitelisting usage.',
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

  describe('1. Authentication & Role Authorization', () => {
    it('should return 401 when accessing POST /api/v1/inquiries unauthenticated', async () => {
      const res = await request(app).post('/api/v1/inquiries').send(validPayload);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should return 403 FORBIDDEN_ROLE when a CREATOR attempts to create an inquiry', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockCreatorUser.firebaseUid,
        email: mockCreatorUser.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockCreatorUser as any);

      const res = await request(app)
        .post('/api/v1/inquiries')
        .set('Authorization', 'Bearer creator-token')
        .send(validPayload);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
    });
  });

  describe('2. Request Body Validation', () => {
    beforeEach(() => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockBusinessUser.firebaseUid,
        email: mockBusinessUser.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockBusinessUser as any);
    });

    it('should return 400 when collaborationType is missing', async () => {
      const res = await request(app)
        .post('/api/v1/inquiries')
        .set('Authorization', 'Bearer valid-token')
        .send({ ...validPayload, collaborationType: '' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when deliverables is under 10 characters', async () => {
      const res = await request(app)
        .post('/api/v1/inquiries')
        .set('Authorization', 'Bearer valid-token')
        .send({ ...validPayload, deliverables: 'Short' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when brief is under 20 characters', async () => {
      const res = await request(app)
        .post('/api/v1/inquiries')
        .set('Authorization', 'Bearer valid-token')
        .send({ ...validPayload, brief: 'Too brief' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when timelineStart is in the past', async () => {
      const res = await request(app)
        .post('/api/v1/inquiries')
        .set('Authorization', 'Bearer valid-token')
        .send({ ...validPayload, timelineStart: '2020-01-01' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when timelineEnd is before timelineStart', async () => {
      const res = await request(app)
        .post('/api/v1/inquiries')
        .set('Authorization', 'Bearer valid-token')
        .send({
          ...validPayload,
          timelineStart: '2026-10-15',
          timelineEnd: '2026-10-01',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when business attempts to send inquiry to their own account', async () => {
      jest.spyOn(prisma.creatorProfile, 'findUnique').mockResolvedValue({
        ...sampleCreatorProfile,
        userId: mockBusinessUser.id, // same ID
        user: { id: mockBusinessUser.id, role: UserRole.CREATOR, status: 'ACTIVE' },
      } as any);

      const res = await request(app)
        .post('/api/v1/inquiries')
        .set('Authorization', 'Bearer valid-token')
        .send(validPayload);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CANNOT_INQUIRE_SELF');
    });
  });

  describe('3. Creator Eligibility & Existence', () => {
    beforeEach(() => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockBusinessUser.firebaseUid,
        email: mockBusinessUser.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockBusinessUser as any);
    });

    it('should return 404 when creator profile does not exist', async () => {
      jest.spyOn(prisma.creatorProfile, 'findUnique').mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/inquiries')
        .set('Authorization', 'Bearer valid-token')
        .send(validPayload);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('CREATOR_NOT_FOUND');
    });

    it('should return 404 when creator user status is not ACTIVE', async () => {
      jest.spyOn(prisma.creatorProfile, 'findUnique').mockResolvedValue({
        ...sampleCreatorProfile,
        user: { id: mockCreatorUser.id, role: UserRole.CREATOR, status: 'DELETED' },
      } as any);

      const res = await request(app)
        .post('/api/v1/inquiries')
        .set('Authorization', 'Bearer valid-token')
        .send(validPayload);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('CREATOR_NOT_FOUND');
    });

    it('should return 404 when creator profile is missing required fields (binary discoverability)', async () => {
      jest.spyOn(prisma.creatorProfile, 'findUnique').mockResolvedValue({
        ...sampleCreatorProfile,
        bio: '', // incomplete
      } as any);

      const res = await request(app)
        .post('/api/v1/inquiries')
        .set('Authorization', 'Bearer valid-token')
        .send(validPayload);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('CREATOR_NOT_FOUND');
    });
  });

  describe('4. Duplicate Active Inquiry Rule (PENDING & ACCEPTED)', () => {
    beforeEach(() => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockBusinessUser.firebaseUid,
        email: mockBusinessUser.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockBusinessUser as any);
      jest.spyOn(prisma.creatorProfile, 'findUnique').mockResolvedValue(sampleCreatorProfile as any);
    });

    it('should return 409 DUPLICATE_ACTIVE_INQUIRY when an inquiry with status PENDING already exists', async () => {
      const findFirstSpy = jest.fn().mockResolvedValue({
        id: 'inq-existing-pending',
        status: InquiryStatus.PENDING,
      });

      jest.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          $executeRaw: jest.fn().mockResolvedValue(1),
          inquiry: {
            findFirst: findFirstSpy,
          },
        });
      });

      const res = await request(app)
        .post('/api/v1/inquiries')
        .set('Authorization', 'Bearer valid-token')
        .send(validPayload);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_ACTIVE_INQUIRY');
      expect(res.body.error.message).toContain('active inquiry with this creator');
    });

    it('should return 409 DUPLICATE_ACTIVE_INQUIRY when an inquiry with status ACCEPTED already exists', async () => {
      const findFirstSpy = jest.fn().mockResolvedValue({
        id: 'inq-existing-accepted',
        status: InquiryStatus.ACCEPTED,
      });

      jest.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          $executeRaw: jest.fn().mockResolvedValue(1),
          inquiry: {
            findFirst: findFirstSpy,
          },
        });
      });

      const res = await request(app)
        .post('/api/v1/inquiries')
        .set('Authorization', 'Bearer valid-token')
        .send(validPayload);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_ACTIVE_INQUIRY');
    });

    it('should allow creating a new inquiry if prior inquiries were REJECTED, EXPIRED, or CLOSED', async () => {
      const createInquirySpy = jest.fn().mockResolvedValue({
        id: 'inq-new-1',
        businessId: mockBusinessUser.id,
        creatorId: mockCreatorUser.id,
        status: InquiryStatus.PENDING,
        collaborationType: validPayload.collaborationType,
        platform: validPayload.platform,
        deliverables: validPayload.deliverables,
        timelineStart: new Date(validPayload.timelineStart),
        timelineEnd: new Date(validPayload.timelineEnd),
        brief: validPayload.brief,
        additionalRequirements: validPayload.additionalRequirements,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      });

      const createNotificationSpy = jest.fn().mockResolvedValue({});
      const createAuditSpy = jest.fn().mockResolvedValue({});

      jest.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          $executeRaw: jest.fn().mockResolvedValue(1),
          inquiry: {
            findFirst: jest.fn().mockResolvedValue(null), // No active inquiry
            create: createInquirySpy,
          },
          notification: { create: createNotificationSpy },
          auditEvent: { create: createAuditSpy },
        });
      });

      const res = await request(app)
        .post('/api/v1/inquiries')
        .set('Authorization', 'Bearer valid-token')
        .send(validPayload);

      expect(res.status).toBe(201);
      expect(res.body.inquiry).toBeDefined();
      expect(res.body.inquiry.status).toBe('PENDING');
      expect(createNotificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: mockCreatorUser.id,
            type: NotificationType.INQUIRY_RECEIVED,
          }),
        })
      );
      expect(createAuditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: AuditEventType.INQUIRY_CREATED,
            actorUserId: mockBusinessUser.id,
          }),
        })
      );
    });
  });

  describe('5. Persistence, Side Effects & Privacy Invariants', () => {
    beforeEach(() => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockBusinessUser.firebaseUid,
        email: mockBusinessUser.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockBusinessUser as any);
      jest.spyOn(prisma.creatorProfile, 'findUnique').mockResolvedValue(sampleCreatorProfile as any);
    });

    it('should set expiresAt = createdAt + 60 days and return canonical CreatorProfile.id', async () => {
      const now = new Date();
      const sixtyDaysLater = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

      const createInquirySpy = jest.fn().mockResolvedValue({
        id: 'inq-new-2',
        businessId: mockBusinessUser.id,
        creatorId: mockCreatorUser.id,
        status: InquiryStatus.PENDING,
        collaborationType: validPayload.collaborationType,
        platform: validPayload.platform,
        deliverables: validPayload.deliverables,
        timelineStart: null,
        timelineEnd: null,
        brief: validPayload.brief,
        additionalRequirements: null,
        createdAt: now,
        expiresAt: sixtyDaysLater,
      });

      jest.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          $executeRaw: jest.fn().mockResolvedValue(1),
          inquiry: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: createInquirySpy,
          },
          notification: { create: jest.fn().mockResolvedValue({}) },
          auditEvent: { create: jest.fn().mockResolvedValue({}) },
        });
      });

      const res = await request(app)
        .post('/api/v1/inquiries')
        .set('Authorization', 'Bearer valid-token')
        .send({
          creatorId: mockCreatorProfileId,
          collaborationType: validPayload.collaborationType,
          platform: validPayload.platform,
          deliverables: validPayload.deliverables,
          brief: validPayload.brief,
        });

      expect(res.status).toBe(201);
      const inquiry = res.body.inquiry;
      expect(inquiry.id).toBe('inq-new-2');
      expect(inquiry.creatorId).toBe(mockCreatorProfileId); // canonical CreatorProfile.id
      expect(inquiry.status).toBe('PENDING');

      // STRICT PRIVACY AUDIT: Ensure internal IDs and collaborationEmail are absent
      expect(inquiry.collaborationEmail).toBeUndefined();
      expect(inquiry.businessId).toBeUndefined();
      expect(inquiry.userId).toBeUndefined();
      expect(inquiry.firebaseUid).toBeUndefined();

      // Expiration check
      const expiry = new Date(inquiry.expiresAt);
      const created = new Date(inquiry.createdAt);
      const diffDays = Math.round((expiry.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(60);
    });
  });

  describe('6. Transaction Rollback Invariants (PostgreSQL Engine)', () => {
    let pgliteDb: PGlite;

    beforeAll(async () => {
      pgliteDb = new PGlite();
      const migrationPath = path.join(
        __dirname,
        '../prisma/migrations/20260901000000_init_domain_schema/migration.sql'
      );
      const migrationSql = fs.readFileSync(migrationPath, 'utf8');
      await pgliteDb.exec(migrationSql);

      // Pre-seed users in the real PostgreSQL test schema
      await pgliteDb.query(
        `INSERT INTO users (id, firebase_uid, email, role, status, updated_at)
         VALUES ($1, $2, $3, 'CREATOR', 'ACTIVE', NOW()),
                ($4, $5, $6, 'BUSINESS', 'ACTIVE', NOW());`,
        [
          mockCreatorUser.id,
          mockCreatorUser.firebaseUid,
          mockCreatorUser.email,
          mockBusinessUser.id,
          mockBusinessUser.firebaseUid,
          mockBusinessUser.email,
        ]
      );
    });

    afterAll(async () => {
      await pgliteDb.close();
    });

    beforeEach(async () => {
      await pgliteDb.query('DELETE FROM notifications;');
      await pgliteDb.query('DELETE FROM audit_events;');
      await pgliteDb.query('DELETE FROM inquiries;');

      verifyIdTokenSpy.mockResolvedValue({
        uid: mockBusinessUser.firebaseUid,
        email: mockBusinessUser.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockBusinessUser as any);
      jest.spyOn(prisma.creatorProfile, 'findUnique').mockResolvedValue(sampleCreatorProfile as any);
    });

    /**
     * Bridges Prisma operations to real PostgreSQL transactions in PGlite.
     * Executes genuine PostgreSQL BEGIN ... ROLLBACK inside the PGlite engine.
     */
    function createPglitePrismaBridge(db: PGlite, options?: { failAfterInquiry?: boolean }) {
      return async (callback: (tx: any) => Promise<any>) => {
        return db.transaction(async (pgTx) => {
          const txBridge: any = {
            $executeRaw: async (strings: TemplateStringsArray, ...values: any[]) => {
              let queryText = '';
              const params: any[] = [];
              for (let i = 0; i < strings.length; i++) {
                queryText += strings[i];
                if (i < values.length) {
                  params.push(values[i]);
                  queryText += `$${params.length}`;
                }
              }
              return pgTx.query(queryText, params);
            },
            inquiry: {
              findFirst: async ({ where }: any) => {
                const res = await pgTx.query<any>(
                  `SELECT id, status FROM inquiries WHERE business_id = $1 AND creator_id = $2 AND status IN ('PENDING', 'ACCEPTED') LIMIT 1;`,
                  [where.businessId, where.creatorId]
                );
                return res.rows[0] || null;
              },
              create: async ({ data }: any) => {
                const inqId = crypto.randomUUID();
                const res = await pgTx.query<any>(
                  `INSERT INTO inquiries (
                    id, business_id, creator_id, status, collaboration_type, platform,
                    deliverables, brief, additional_requirements, timeline_start,
                    timeline_end, created_at, expires_at, updated_at
                  ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW()
                  ) RETURNING *;`,
                  [
                    inqId,
                    data.businessId,
                    data.creatorId,
                    data.status,
                    data.collaborationType,
                    data.platform,
                    data.deliverables,
                    data.brief,
                    data.additionalRequirements || null,
                    data.timelineStart || null,
                    data.timelineEnd || null,
                    data.createdAt,
                    data.expiresAt,
                  ]
                );
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
                };
              },
            },
            notification: {
              create: async ({ data }: any) => {
                if (options?.failAfterInquiry) {
                  throw new Error('Forced database failure after inquiry creation to test transaction rollback');
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

    it('should atomically rollback all records if transaction fails after partial creation (Transaction Rollback)', async () => {
      // Configure Prisma transaction to fail inside the transaction after inquiry creation
      jest.spyOn(prisma, '$transaction').mockImplementation(
        createPglitePrismaBridge(pgliteDb, { failAfterInquiry: true }) as any
      );

      // Attempt creation; the failure in notification.create must abort and rollback the PostgreSQL transaction
      await expect(
        createInquiry(mockBusinessUser.id, validPayload)
      ).rejects.toThrow('Forced database failure after inquiry creation to test transaction rollback');

      // Verify all-or-nothing rollback in the actual PostgreSQL tables: no partial records remain
      const inquiryRows = await pgliteDb.query('SELECT * FROM inquiries;');
      const notifRows = await pgliteDb.query('SELECT * FROM notifications;');
      const auditRows = await pgliteDb.query('SELECT * FROM audit_events;');

      expect(inquiryRows.rows.length).toBe(0);
      expect(notifRows.rows.length).toBe(0);
      expect(auditRows.rows.length).toBe(0);
    });
  });
});

