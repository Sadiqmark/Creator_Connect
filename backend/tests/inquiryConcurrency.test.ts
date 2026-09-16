import crypto from 'crypto';
import { Pool, PoolClient } from 'pg';

describe('Phase 8B Genuine PostgreSQL 16 Multi-Connection Concurrency Test Suite', () => {
  const dbUrl =
    process.env.DATABASE_URL?.replace(/\?schema=.*$/, '') ||
    'postgresql://ikhaan@localhost:5432/creator_connect';

  let pool: Pool;
  let clientA: PoolClient;
  let clientB: PoolClient;

  const testBusinessId = 'b8000000-0000-4000-8000-000000000001';
  const testCreatorId = 'c8000000-0000-4000-8000-000000000001';
  const testProfileId = 'a8000000-0000-4000-8000-000000000001';
  const testInquiryId = 'e8000000-0000-4000-8000-000000000001';

  beforeAll(async () => {
    pool = new Pool({ connectionString: dbUrl });

    // Establish two genuine, independent TCP connections to PostgreSQL 16
    clientA = await pool.connect();
    clientB = await pool.connect();

    // Verify independent connection backend PIDs
    const pidA = await clientA.query('SELECT pg_backend_pid();');
    const pidB = await clientB.query('SELECT pg_backend_pid();');

    expect(pidA.rows[0].pg_backend_pid).not.toBe(pidB.rows[0].pg_backend_pid);

    // Clean up any prior test rows
    await clientA.query(`DELETE FROM notifications WHERE reference_id = $1;`, [testInquiryId]);
    await clientA.query(`DELETE FROM audit_events WHERE resource_id = $1;`, [testInquiryId]);
    await clientA.query(`DELETE FROM inquiries WHERE id = $1;`, [testInquiryId]);
    await clientA.query(`DELETE FROM creator_profiles WHERE id = $1;`, [testProfileId]);
    await clientA.query(`DELETE FROM users WHERE id IN ($1, $2);`, [testBusinessId, testCreatorId]);

    // Seed test users in PostgreSQL 16
    await clientA.query(
      `INSERT INTO users (id, firebase_uid, email, role, status, updated_at)
       VALUES ($1, 'fb_biz_conc', 'conc_biz@example.com', 'BUSINESS', 'ACTIVE', NOW()),
              ($2, 'fb_creator_conc', 'conc_creator@example.com', 'CREATOR', 'ACTIVE', NOW());`,
      [testBusinessId, testCreatorId]
    );

    await clientA.query(
      `INSERT INTO creator_profiles (
        id, user_id, name, niche, location, bio, specialties, instagram_url, profile_photo_url, collaboration_email, updated_at
      ) VALUES (
        $1, $2, 'Elena Concurrency', 'Fashion', 'Mumbai', 'Bio text', ARRAY['Fashion'], 'https://instagram.com/elena', 'https://example.com/p.jpg', 'elena@brand.com', NOW()
      );`,
      [testProfileId, testCreatorId]
    );
  });

  afterAll(async () => {
    // Clean up all test rows
    if (clientA) {
      await clientA.query(`DELETE FROM notifications WHERE reference_id = $1;`, [testInquiryId]);
      await clientA.query(`DELETE FROM audit_events WHERE resource_id = $1;`, [testInquiryId]);
      await clientA.query(`DELETE FROM inquiries WHERE id = $1;`, [testInquiryId]);
      await clientA.query(`DELETE FROM creator_profiles WHERE id = $1;`, [testProfileId]);
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
    // Clean and reset the single test inquiry to PENDING
    await clientA.query(`DELETE FROM notifications WHERE reference_id = $1;`, [testInquiryId]);
    await clientA.query(`DELETE FROM audit_events WHERE resource_id = $1;`, [testInquiryId]);
    await clientA.query(`DELETE FROM inquiries WHERE id = $1;`, [testInquiryId]);

    await clientA.query(
      `INSERT INTO inquiries (
        id, business_id, creator_id, status, collaboration_type, platform, deliverables, brief, created_at, expires_at, updated_at
      ) VALUES (
        $1, $2, $3, 'PENDING', 'Reel Campaign', 'Instagram', 'Deliverables', 'Brief text', NOW(), NOW() + interval '60 days', NOW()
      );`,
      [testInquiryId, testBusinessId, testCreatorId]
    );
  });

  async function executeTransitionOnConnection(
    client: PoolClient,
    targetStatus: 'ACCEPTED' | 'REJECTED'
  ): Promise<{ success: boolean; status: string }> {
    await client.query('BEGIN');
    try {
      // 1. Ownership & existence check
      const inqRes = await client.query(
        `SELECT id, creator_id, business_id, status FROM inquiries WHERE id = $1;`,
        [testInquiryId]
      );
      if (inqRes.rows.length === 0 || inqRes.rows[0].creator_id !== testCreatorId) {
        throw new Error('404:INQUIRY_NOT_FOUND');
      }
      if (inqRes.rows[0].status !== 'PENDING') {
        throw new Error('409:INVALID_INQUIRY_STATE');
      }

      // 2. Atomic compare-and-swap update
      const updateRes = await client.query(
        `UPDATE inquiries
         SET status = $1, responded_at = NOW(), updated_at = NOW()
         WHERE id = $2 AND creator_id = $3 AND status = 'PENDING'
         RETURNING *;`,
        [targetStatus, testInquiryId, testCreatorId]
      );

      if (updateRes.rows.length === 0) {
        throw new Error('409:INVALID_INQUIRY_STATE');
      }

      // 3. Notification creation
      const notifType = targetStatus === 'ACCEPTED' ? 'INQUIRY_ACCEPTED' : 'INQUIRY_REJECTED';
      await client.query(
        `INSERT INTO notifications (id, user_id, type, reference_id, created_at)
         VALUES ($1, $2, $3, $4, NOW());`,
        [crypto.randomUUID(), inqRes.rows[0].business_id, notifType, testInquiryId]
      );

      // 4. Audit creation
      const auditType = targetStatus === 'ACCEPTED' ? 'INQUIRY_ACCEPTED' : 'INQUIRY_REJECTED';
      await client.query(
        `INSERT INTO audit_events (id, event_type, actor_user_id, resource_type, resource_id, metadata, created_at)
         VALUES ($1, $2, $3, 'INQUIRY', $4, $5, NOW());`,
        [
          crypto.randomUUID(),
          auditType,
          testCreatorId,
          testInquiryId,
          JSON.stringify({ previousStatus: 'PENDING', newStatus: targetStatus }),
        ]
      );

      await client.query('COMMIT');
      return { success: true, status: targetStatus };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  }

  it('proves genuine PostgreSQL 16 multi-connection concurrency: only ONE transition wins between concurrent ACCEPT and REJECT', async () => {
    // Fire concurrent transactions on separate PostgreSQL backend processes
    const results = await Promise.allSettled([
      executeTransitionOnConnection(clientA, 'ACCEPTED'),
      executeTransitionOnConnection(clientB, 'REJECTED'),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled') as PromiseFulfilledResult<any>[];
    const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];

    // Invariant 1: Exactly ONE request must succeed
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    // Invariant 2: The losing request must fail cleanly with 409 INVALID_INQUIRY_STATE
    expect(rejected[0].reason.message).toContain('409:INVALID_INQUIRY_STATE');

    const winnerStatus = fulfilled[0].value.status;
    expect(['ACCEPTED', 'REJECTED']).toContain(winnerStatus);

    // Invariant 3: Verify the actual database state in PostgreSQL 16
    const inquiryDbRes = await clientA.query(
      `SELECT status, responded_at, closed_at FROM inquiries WHERE id = $1;`,
      [testInquiryId]
    );
    expect(inquiryDbRes.rows.length).toBe(1);
    expect(inquiryDbRes.rows[0].status).toBe(winnerStatus);
    expect(inquiryDbRes.rows[0].responded_at).not.toBeNull();
    expect(inquiryDbRes.rows[0].closed_at).toBeNull();

    // Invariant 4: Exactly ONE notification was created in PostgreSQL 16 matching the winner
    const notifDbRes = await clientA.query(
      `SELECT type FROM notifications WHERE reference_id = $1;`,
      [testInquiryId]
    );
    expect(notifDbRes.rows.length).toBe(1);
    const expectedNotifType =
      winnerStatus === 'ACCEPTED' ? 'INQUIRY_ACCEPTED' : 'INQUIRY_REJECTED';
    expect(notifDbRes.rows[0].type).toBe(expectedNotifType);

    // Invariant 5: Exactly ONE audit event was created in PostgreSQL 16 matching the winner
    const auditDbRes = await clientA.query(
      `SELECT event_type FROM audit_events WHERE resource_id = $1;`,
      [testInquiryId]
    );
    expect(auditDbRes.rows.length).toBe(1);
    const expectedAuditType =
      winnerStatus === 'ACCEPTED' ? 'INQUIRY_ACCEPTED' : 'INQUIRY_REJECTED';
    expect(auditDbRes.rows[0].event_type).toBe(expectedAuditType);
  });
});
