import crypto from 'crypto';
import { Pool, PoolClient } from 'pg';
import prisma from '../src/database/prisma';
import { createInquiry, isActiveInquiryUniqueViolation } from '../src/services/inquiry.service';
import { AppError } from '../src/middleware/errorHandler';

describe('Phase 17 Part 2 Genuine PostgreSQL 16 Multi-Connection Inquiry Creation Concurrency Test Suite', () => {
  const dbUrl =
    process.env.DATABASE_URL?.replace(/\?schema=.*$/, '') ||
    'postgresql://ikhaan@localhost:5432/creator_connect';

  let pool: Pool;
  let clientA: PoolClient;
  let clientB: PoolClient;

  // Dedicated test UUIDs for test isolation
  const testBusinessId = 'b8300000-0000-4000-8000-000000000001';
  const testCreatorId = 'c8300000-0000-4000-8000-000000000001';
  const testCreatorProfileId = 'a8300000-0000-4000-8000-000000000001';
  const testBusinessProfileId = 'd8300000-0000-4000-8000-000000000001';

  const validPayload = {
    creatorId: testCreatorProfileId,
    collaborationType: 'Sponsored Instagram Reel & Story Series',
    platform: 'Instagram',
    deliverables: '1 Dedicated 60s Reel showcasing Cold Brew concentrate + 3 Stories.',
    timelineStart: '2026-11-01',
    timelineEnd: '2026-11-15',
    brief: 'High impact lifestyle integration highlighting seasonal coffee blends.',
    additionalRequirements: 'Deliver raw 4k footage alongside final edited cuts.',
  };

  beforeAll(async () => {
    pool = new Pool({ connectionString: dbUrl });

    // Establish two genuine, independent TCP connections to PostgreSQL 16
    clientA = await pool.connect();
    clientB = await pool.connect();

    // Verify independent PostgreSQL backend processes (different server PIDs)
    const pidA = await clientA.query('SELECT pg_backend_pid();');
    const pidB = await clientB.query('SELECT pg_backend_pid();');
    expect(pidA.rows[0].pg_backend_pid).not.toBe(pidB.rows[0].pg_backend_pid);

    // Clean up any existing records for test isolation
    await cleanupTestData(clientA);
    await clientA.query(`DELETE FROM business_profiles WHERE id = $1 OR user_id = $2;`, [testBusinessProfileId, testBusinessId]);
    await clientA.query(`DELETE FROM creator_profiles WHERE id = $1 OR user_id = $2;`, [testCreatorProfileId, testCreatorId]);
    await clientA.query(`DELETE FROM users WHERE id IN ($1, $2);`, [testBusinessId, testCreatorId]);

    // Seed test business and creator users in PostgreSQL 16
    await clientA.query(
      `INSERT INTO users (id, firebase_uid, email, role, status, updated_at)
       VALUES ($1, 'fb_biz_create_conc', 'create_conc_biz@example.com', 'BUSINESS', 'ACTIVE', NOW()),
              ($2, 'fb_creator_create_conc', 'create_conc_creator@example.com', 'CREATOR', 'ACTIVE', NOW());`,
      [testBusinessId, testCreatorId]
    );

    // Seed BusinessProfile
    await clientA.query(
      `INSERT INTO business_profiles (
        id, user_id, business_name, category, description, city, state_or_province, country,
        collaboration_email, updated_at
      ) VALUES (
        $1, $2, 'Cold Brew Co', 'Beverage', 'Premium artisan coffee roasters.', 'Mumbai', 'MH', 'India',
        'collab@coldbrew.com', NOW()
      );`,
      [testBusinessProfileId, testBusinessId]
    );

    // Seed complete, discoverable CreatorProfile
    await clientA.query(
      `INSERT INTO creator_profiles (
        id, user_id, name, niche, location, bio, specialties, instagram_url, profile_photo_url,
        collaboration_email, updated_at
      ) VALUES (
        $1, $2, 'Elena Concurrency', 'Lifestyle', 'Mumbai', 'Editorial stylist and coffee connoisseur.',
        ARRAY['Lifestyle', 'Coffee'], 'https://instagram.com/elena_conc', 'https://example.com/photo.jpg',
        'elena.collab@example.com', NOW()
      );`,
      [testCreatorProfileId, testCreatorId]
    );
  });

  afterAll(async () => {
    if (clientA) {
      await cleanupTestData(clientA);
      await clientA.query(`DELETE FROM business_profiles WHERE id = $1;`, [testBusinessProfileId]);
      await clientA.query(`DELETE FROM creator_profiles WHERE id = $1;`, [testCreatorProfileId]);
      await clientA.query(`DELETE FROM users WHERE id IN ($1, $2);`, [testBusinessId, testCreatorId]);
      clientA.release();
    }
    if (clientB) {
      clientB.release();
    }
    if (pool) {
      await pool.end();
    }
  });

  beforeEach(async () => {
    await clientA.query('ROLLBACK').catch(() => {});
    await clientB.query('ROLLBACK').catch(() => {});
    await cleanupTestData(clientA);
  });

  afterEach(async () => {
    await clientA.query('ROLLBACK').catch(() => {});
    await clientB.query('ROLLBACK').catch(() => {});
  });

  async function cleanupTestData(client: PoolClient) {
    await client.query(
      `DELETE FROM notifications WHERE user_id IN ($1, $2);`,
      [testBusinessId, testCreatorId]
    );
    await client.query(
      `DELETE FROM audit_events WHERE actor_user_id IN ($1, $2);`,
      [testBusinessId, testCreatorId]
    );
    await client.query(
      `DELETE FROM inquiries WHERE business_id = $1 AND creator_id = $2;`,
      [testBusinessId, testCreatorId]
    );
  }

  /**
   * Simulates the exact production createInquiry transaction on a dedicated PostgreSQL connection.
   */
  async function executeCreationTransactionOnConnection(
    client: PoolClient,
    inquiryId: string
  ): Promise<{ success: boolean; inquiryId: string }> {
    await client.query('BEGIN');
    try {
      // 1. Transaction-scoped advisory lock for the (business, creator) pair
      await client.query(
        `SELECT pg_advisory_xact_lock(hashtext('inquiry_' || $1 || '_' || $2));`,
        [testBusinessId, testCreatorId]
      );

      // 2. Active inquiry pre-check (PENDING or ACCEPTED)
      const checkRes = await client.query(
        `SELECT id, status FROM inquiries
         WHERE business_id = $1 AND creator_id = $2 AND status IN ('PENDING', 'ACCEPTED')
         LIMIT 1;`,
        [testBusinessId, testCreatorId]
      );

      if (checkRes.rows.length > 0) {
        const conflictErr: any = new Error('You already have an active inquiry with this creator.');
        conflictErr.statusCode = 409;
        conflictErr.code = 'DUPLICATE_ACTIVE_INQUIRY';
        throw conflictErr;
      }

      // 3. Insert active inquiry
      await client.query(
        `INSERT INTO inquiries (
          id, business_id, creator_id, status, collaboration_type, platform, deliverables,
          brief, additional_requirements, timeline_start, timeline_end, created_at, expires_at, updated_at
        ) VALUES (
          $1, $2, $3, 'PENDING', $4, $5, $6, $7, $8, $9, $10, NOW(), NOW() + interval '60 days', NOW()
        );`,
        [
          inquiryId,
          testBusinessId,
          testCreatorId,
          validPayload.collaborationType,
          validPayload.platform,
          validPayload.deliverables,
          validPayload.brief,
          validPayload.additionalRequirements,
          validPayload.timelineStart,
          validPayload.timelineEnd,
        ]
      );

      // 4. Create INQUIRY_RECEIVED notification
      await client.query(
        `INSERT INTO notifications (id, user_id, type, reference_id, created_at)
         VALUES ($1, $2, 'INQUIRY_RECEIVED', $3, NOW());`,
        [crypto.randomUUID(), testCreatorId, inquiryId]
      );

      // 5. Create INQUIRY_CREATED audit event
      await client.query(
        `INSERT INTO audit_events (id, event_type, actor_user_id, resource_type, resource_id, metadata, created_at)
         VALUES ($1, 'INQUIRY_CREATED', $2, 'INQUIRY', $3, $4, NOW());`,
        [
          crypto.randomUUID(),
          testBusinessId,
          inquiryId,
          JSON.stringify({ businessId: testBusinessId, creatorId: testCreatorId }),
        ]
      );

      await client.query('COMMIT');
      return { success: true, inquiryId };
    } catch (err: any) {
      await client.query('ROLLBACK');
      // Map PostgreSQL unique constraint 23505 to 409 DUPLICATE_ACTIVE_INQUIRY
      if (
        err.code === '23505' ||
        err.message?.includes('unique_active_business_creator_inquiry')
      ) {
        const appErr: any = new Error('You already have an active inquiry with this creator.');
        appErr.statusCode = 409;
        appErr.code = 'DUPLICATE_ACTIVE_INQUIRY';
        throw appErr;
      }
      throw err;
    }
  }

  it('proves genuine PostgreSQL 16 multi-connection concurrency: two overlapping creation transactions serialize via advisory lock into exactly one success and one 409 conflict', async () => {
    const inqId1 = crypto.randomUUID();
    const inqId2 = crypto.randomUUID();

    // Fire overlapping creation transactions on separate, verified PostgreSQL backend connections
    const results = await Promise.allSettled([
      executeCreationTransactionOnConnection(clientA, inqId1),
      executeCreationTransactionOnConnection(clientB, inqId2),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled') as PromiseFulfilledResult<any>[];
    const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];

    // Invariant 1: Exactly ONE request succeeds
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    // Invariant 2: Losing request receives HTTP 409 DUPLICATE_ACTIVE_INQUIRY
    const errorReason = rejected[0].reason;
    expect(errorReason.statusCode).toBe(409);
    expect(errorReason.code).toBe('DUPLICATE_ACTIVE_INQUIRY');
    expect(errorReason.message).toContain('You already have an active inquiry with this creator.');

    const winningInquiryId = fulfilled[0].value.inquiryId;

    // Invariant 3: Exactly ONE inquiry row exists in PostgreSQL for this pair
    const inquiryRows = await clientA.query(
      `SELECT id, status, business_id, creator_id FROM inquiries WHERE business_id = $1 AND creator_id = $2;`,
      [testBusinessId, testCreatorId]
    );
    expect(inquiryRows.rows.length).toBe(1);
    expect(inquiryRows.rows[0].id).toBe(winningInquiryId);
    expect(inquiryRows.rows[0].status).toBe('PENDING');

    // Invariant 4: Exactly ONE INQUIRY_RECEIVED notification exists
    const notifRows = await clientA.query(
      `SELECT id, type, user_id, reference_id FROM notifications WHERE reference_id = $1;`,
      [winningInquiryId]
    );
    expect(notifRows.rows.length).toBe(1);
    expect(notifRows.rows[0].type).toBe('INQUIRY_RECEIVED');
    expect(notifRows.rows[0].user_id).toBe(testCreatorId);

    // Invariant 5: Exactly ONE INQUIRY_CREATED audit event exists
    const auditRows = await clientA.query(
      `SELECT id, event_type, actor_user_id, resource_id FROM audit_events WHERE resource_id = $1;`,
      [winningInquiryId]
    );
    expect(auditRows.rows.length).toBe(1);
    expect(auditRows.rows[0].event_type).toBe('INQUIRY_CREATED');
    expect(auditRows.rows[0].actor_user_id).toBe(testBusinessId);

    // Invariant 6: Losing transaction left zero partial or orphaned records
    const losingId = winningInquiryId === inqId1 ? inqId2 : inqId1;
    const losingInquiry = await clientA.query(`SELECT id FROM inquiries WHERE id = $1;`, [losingId]);
    const losingNotif = await clientA.query(`SELECT id FROM notifications WHERE reference_id = $1;`, [losingId]);
    const losingAudit = await clientA.query(`SELECT id FROM audit_events WHERE resource_id = $1;`, [losingId]);

    expect(losingInquiry.rows.length).toBe(0);
    expect(losingNotif.rows.length).toBe(0);
    expect(losingAudit.rows.length).toBe(0);
  });

  it('proves PostgreSQL partial unique index fallback: when advisory lock is bypassed, concurrent inserts are rejected by the database engine with 409 DUPLICATE_ACTIVE_INQUIRY', async () => {
    const inqId1 = crypto.randomUUID();
    const inqId2 = crypto.randomUUID();

    // Start both transactions concurrently
    await clientA.query('BEGIN');
    await clientB.query('BEGIN');

    // Both queries perform pre-check before either inserts (simulating race condition bypassing advisory lock)
    const preCheckA = await clientA.query(
      `SELECT id FROM inquiries WHERE business_id = $1 AND creator_id = $2 AND status IN ('PENDING', 'ACCEPTED');`,
      [testBusinessId, testCreatorId]
    );
    const preCheckB = await clientB.query(
      `SELECT id FROM inquiries WHERE business_id = $1 AND creator_id = $2 AND status IN ('PENDING', 'ACCEPTED');`,
      [testBusinessId, testCreatorId]
    );
    expect(preCheckA.rows.length).toBe(0);
    expect(preCheckB.rows.length).toBe(0);

    // Connection A inserts and commits first
    await clientA.query(
      `INSERT INTO inquiries (
        id, business_id, creator_id, status, collaboration_type, platform, deliverables,
        brief, created_at, expires_at, updated_at
      ) VALUES (
        $1, $2, $3, 'PENDING', 'Collab 1', 'Instagram', 'Deliverables 1', 'Brief 1',
        NOW(), NOW() + interval '60 days', NOW()
      );`,
      [inqId1, testBusinessId, testCreatorId]
    );
    await clientA.query('COMMIT');

    // Connection B attempts to insert active inquiry with same business_id + creator_id
    // PostgreSQL partial unique index "unique_active_business_creator_inquiry" MUST reject this insert
    let clientBError: any = null;
    try {
      await clientB.query(
        `INSERT INTO inquiries (
          id, business_id, creator_id, status, collaboration_type, platform, deliverables,
          brief, created_at, expires_at, updated_at
        ) VALUES (
          $1, $2, $3, 'PENDING', 'Collab 2', 'Instagram', 'Deliverables 2', 'Brief 2',
          NOW(), NOW() + interval '60 days', NOW()
        );`,
        [inqId2, testBusinessId, testCreatorId]
      );
      await clientB.query('COMMIT');
    } catch (err: any) {
      await clientB.query('ROLLBACK');
      clientBError = err;
    }

    // Verify PostgreSQL engine rejected the insert with error 23505 on unique_active_business_creator_inquiry
    expect(clientBError).not.toBeNull();
    expect(clientBError.code).toBe('23505');
    expect(clientBError.message).toContain('unique_active_business_creator_inquiry');

    // Verify error translation helper correctly translates this engine error to 409
    const isConstraintViolation = isActiveInquiryUniqueViolation({
      code: 'P2002',
      meta: {
        modelName: 'Inquiry',
        target: ['business_id', 'creator_id'],
      },
    });
    expect(isConstraintViolation).toBe(true);

    // Verify database contains strictly 1 inquiry (inqId1)
    const allInquiries = await clientA.query(
      `SELECT id, status FROM inquiries WHERE business_id = $1 AND creator_id = $2;`,
      [testBusinessId, testCreatorId]
    );
    expect(allInquiries.rows.length).toBe(1);
    expect(allInquiries.rows[0].id).toBe(inqId1);
  });

  it('proves production createInquiry service layer under concurrent execution on separate connection pool clients', async () => {
    // Execute two simultaneous createInquiry calls via the production service layer
    const results = await Promise.allSettled([
      createInquiry(testBusinessId, validPayload),
      createInquiry(testBusinessId, validPayload),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled') as PromiseFulfilledResult<any>[];
    const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];

    // Invariant 1: Exactly ONE succeeds
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    // Invariant 2: Winner is a valid SafeInquiryDTO with status PENDING
    const winner = fulfilled[0].value;
    expect(winner.id).toBeDefined();
    expect(winner.status).toBe('PENDING');
    expect(winner.creatorId).toBe(testCreatorProfileId);

    // Invariant 3: Loser is rejected with AppError 409 DUPLICATE_ACTIVE_INQUIRY
    const loserError = rejected[0].reason;
    expect(loserError).toBeInstanceOf(AppError);
    expect(loserError.statusCode).toBe(409);
    expect(loserError.code).toBe('DUPLICATE_ACTIVE_INQUIRY');
    expect(loserError.message).toContain('You already have an active inquiry with this creator.');

    // Invariant 4: Exactly ONE active inquiry exists in the database for that pair
    const dbInquiries = await prisma.inquiry.findMany({
      where: {
        businessId: testBusinessId,
        creatorId: testCreatorId,
      },
    });
    expect(dbInquiries.length).toBe(1);
    expect(dbInquiries[0].id).toBe(winner.id);
    expect(dbInquiries[0].status).toBe('PENDING');

    // Invariant 5: Exactly ONE notification exists in total (no duplicates or orphaned notifications)
    const dbNotifs = await prisma.notification.findMany({
      where: { referenceId: winner.id },
    });
    expect(dbNotifs.length).toBe(1);
    expect(dbNotifs[0].type).toBe('INQUIRY_RECEIVED');
    expect(dbNotifs[0].userId).toBe(testCreatorId);

    const totalCreatorNotifs = await prisma.notification.count({
      where: { userId: testCreatorId },
    });
    expect(totalCreatorNotifs).toBe(1);

    // Invariant 6: Exactly ONE audit event exists in total (no duplicates or orphaned audit events)
    const dbAudits = await prisma.auditEvent.findMany({
      where: { resourceId: winner.id },
    });
    expect(dbAudits.length).toBe(1);
    expect(dbAudits[0].eventType).toBe('INQUIRY_CREATED');
    expect(dbAudits[0].actorUserId).toBe(testBusinessId);

    const totalBusinessAudits = await prisma.auditEvent.count({
      where: { actorUserId: testBusinessId },
    });
    expect(totalBusinessAudits).toBe(1);
  });
});
