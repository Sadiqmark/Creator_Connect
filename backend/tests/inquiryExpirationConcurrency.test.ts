import crypto from 'crypto';
import { Pool, PoolClient } from 'pg';

describe('Phase 12 Genuine PostgreSQL Multi-Connection Expiration Concurrency Test Suite', () => {
  const dbUrl =
    process.env.DATABASE_URL?.replace(/\?schema=.*$/, '') ||
    'postgresql://ikhaan@localhost:5432/creator_connect';

  let pool: Pool;
  let clientA: PoolClient;
  let clientB: PoolClient;

  const testBusinessId = 'b8200000-0000-4000-8000-000000000001';
  const testCreatorId = 'c8200000-0000-4000-8000-000000000001';
  const testProfileId = 'a8200000-0000-4000-8000-000000000001';
  const testInquiryId = 'e8200000-0000-4000-8000-000000000001';

  beforeAll(async () => {
    pool = new Pool({ connectionString: dbUrl });

    // Establish two independent TCP connections to PostgreSQL
    clientA = await pool.connect();
    clientB = await pool.connect();

    // Verify independent backend PIDs
    const pidA = await clientA.query('SELECT pg_backend_pid();');
    const pidB = await clientB.query('SELECT pg_backend_pid();');
    expect(pidA.rows[0].pg_backend_pid).not.toBe(pidB.rows[0].pg_backend_pid);

    // Clean up any existing records
    await clientA.query(`DELETE FROM notifications WHERE reference_id = $1;`, [testInquiryId]);
    await clientA.query(`DELETE FROM audit_events WHERE resource_id = $1;`, [testInquiryId]);
    await clientA.query(`DELETE FROM inquiries WHERE id = $1;`, [testInquiryId]);
    await clientA.query(`DELETE FROM creator_profiles WHERE id = $1;`, [testProfileId]);
    await clientA.query(`DELETE FROM users WHERE id IN ($1, $2);`, [testBusinessId, testCreatorId]);

    // Seed test users in PostgreSQL
    await clientA.query(
      `INSERT INTO users (id, firebase_uid, email, role, status, updated_at)
       VALUES ($1, 'fb_biz_exp_conc', 'exp_biz@example.com', 'BUSINESS', 'ACTIVE', NOW()),
              ($2, 'fb_creator_exp_conc', 'exp_creator@example.com', 'CREATOR', 'ACTIVE', NOW());`,
      [testBusinessId, testCreatorId]
    );

    await clientA.query(
      `INSERT INTO creator_profiles (
        id, user_id, name, niche, location, bio, specialties, instagram_url, profile_photo_url, collaboration_email, updated_at
      ) VALUES (
        $1, $2, 'Elena Expiration', 'Fashion', 'Mumbai', 'Bio text', ARRAY['Fashion'], 'https://instagram.com/elena', 'https://example.com/p.jpg', 'elena@brand.com', NOW()
      );`,
      [testProfileId, testCreatorId]
    );
  });

  afterAll(async () => {
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
    // Reset test inquiry to an EXPIRED candidate (created 61 days ago, expiresAt 1 day ago)
    await clientA.query(`DELETE FROM notifications WHERE reference_id = $1;`, [testInquiryId]);
    await clientA.query(`DELETE FROM audit_events WHERE resource_id = $1;`, [testInquiryId]);
    await clientA.query(`DELETE FROM inquiries WHERE id = $1;`, [testInquiryId]);

    await clientA.query(
      `INSERT INTO inquiries (
        id, business_id, creator_id, status, collaboration_type, platform, deliverables, brief, created_at, expires_at, updated_at
      ) VALUES (
        $1, $2, $3, 'PENDING', 'Reel Campaign', 'Instagram', 'Deliverables', 'Brief text',
        NOW() - INTERVAL '61 days',
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '61 days'
      );`,
      [testInquiryId, testBusinessId, testCreatorId]
    );
  });

  /**
   * Simulates the exact atomic transaction executed by expireInquiries() on a database connection
   */
  async function executeExpirationOnConnection(
    client: PoolClient
  ): Promise<{ transitioned: boolean }> {
    await client.query('BEGIN');
    try {
      // 1. Atomic compare-and-swap update
      const updateRes = await client.query(
        `UPDATE inquiries
         SET status = 'EXPIRED', updated_at = NOW()
         WHERE id = $1 AND status = 'PENDING' AND expires_at <= NOW()
         RETURNING id, business_id;`,
        [testInquiryId]
      );

      if (updateRes.rows.length === 0) {
        await client.query('COMMIT');
        return { transitioned: false };
      }

      const businessId = updateRes.rows[0].business_id;

      // 2. Create Notification strictly when CAS update won
      await client.query(
        `INSERT INTO notifications (id, user_id, type, reference_id, created_at)
         VALUES ($1, $2, 'INQUIRY_EXPIRED', $3, NOW());`,
        [crypto.randomUUID(), businessId, testInquiryId]
      );

      // 3. Create AuditEvent strictly when CAS update won
      await client.query(
        `INSERT INTO audit_events (id, event_type, actor_user_id, resource_type, resource_id, metadata, created_at)
         VALUES ($1, 'INQUIRY_EXPIRED', NULL, 'INQUIRY', $2, $3, NOW());`,
        [
          crypto.randomUUID(),
          testInquiryId,
          JSON.stringify({ previousStatus: 'PENDING', newStatus: 'EXPIRED' }),
        ]
      );

      await client.query('COMMIT');
      return { transitioned: true };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  }

  /**
   * Simulates a Creator attempting to accept the inquiry on a database connection with the hardened CAS check
   */
  async function executeAcceptOnConnection(
    client: PoolClient
  ): Promise<{ accepted: boolean }> {
    await client.query('BEGIN');
    try {
      // 1. Verify existence & in-memory validity
      const inqRes = await client.query(
        `SELECT id, status, expires_at FROM inquiries WHERE id = $1 AND creator_id = $2;`,
        [testInquiryId, testCreatorId]
      );

      if (
        inqRes.rows.length === 0 ||
        inqRes.rows[0].status !== 'PENDING' ||
        new Date(inqRes.rows[0].expires_at) <= new Date()
      ) {
        throw new Error('409:INVALID_INQUIRY_STATE');
      }

      // 2. Atomic CAS with expires_at > NOW() guard
      const updateRes = await client.query(
        `UPDATE inquiries
         SET status = 'ACCEPTED', responded_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND creator_id = $2 AND status = 'PENDING' AND expires_at > NOW()
         RETURNING *;`,
        [testInquiryId, testCreatorId]
      );

      if (updateRes.rows.length === 0) {
        throw new Error('409:INVALID_INQUIRY_STATE');
      }

      await client.query('COMMIT');
      return { accepted: true };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  }

  it('proves concurrent expiration runners: exactly ONE runner transitions the inquiry, creates 1 notification and 1 audit event', async () => {
    // Run two expiration runners simultaneously across separate PostgreSQL connections
    const results = await Promise.all([
      executeExpirationOnConnection(clientA),
      executeExpirationOnConnection(clientB),
    ]);

    const winnerCount = results.filter((r) => r.transitioned).length;
    const loserCount = results.filter((r) => !r.transitioned).length;

    // Invariant 1: Exactly one runner wins the CAS
    expect(winnerCount).toBe(1);
    expect(loserCount).toBe(1);

    // Invariant 2: Database status is EXPIRED, responded_at remains NULL
    const inqRes = await clientA.query(
      `SELECT status, responded_at, closed_at FROM inquiries WHERE id = $1;`,
      [testInquiryId]
    );
    expect(inqRes.rows[0].status).toBe('EXPIRED');
    expect(inqRes.rows[0].responded_at).toBeNull();
    expect(inqRes.rows[0].closed_at).toBeNull();

    // Invariant 3: Exactly ONE notification was created
    const notifRes = await clientA.query(
      `SELECT id, type, user_id FROM notifications WHERE reference_id = $1;`,
      [testInquiryId]
    );
    expect(notifRes.rows.length).toBe(1);
    expect(notifRes.rows[0].type).toBe('INQUIRY_EXPIRED');
    expect(notifRes.rows[0].user_id).toBe(testBusinessId);

    // Invariant 4: Exactly ONE audit event was created
    const auditRes = await clientA.query(
      `SELECT id, event_type, actor_user_id FROM audit_events WHERE resource_id = $1;`,
      [testInquiryId]
    );
    expect(auditRes.rows.length).toBe(1);
    expect(auditRes.rows[0].event_type).toBe('INQUIRY_EXPIRED');
    expect(auditRes.rows[0].actor_user_id).toBeNull();
  });

  it('proves race between expiration runner and Creator accept on expired inquiry: expiration wins, Creator accept fails with 409', async () => {
    // Fire concurrent expiration and accept on expired inquiry
    const results = await Promise.allSettled([
      executeExpirationOnConnection(clientA),
      executeAcceptOnConnection(clientB),
    ]);

    const expirationResult = results[0];
    const acceptResult = results[1];

    // Invariant 1: Expiration succeeds
    expect(expirationResult.status).toBe('fulfilled');
    if (expirationResult.status === 'fulfilled') {
      expect(expirationResult.value.transitioned).toBe(true);
    }

    // Invariant 2: Creator accept fails with 409 INVALID_INQUIRY_STATE
    expect(acceptResult.status).toBe('rejected');
    if (acceptResult.status === 'rejected') {
      expect(acceptResult.reason.message).toContain('409:INVALID_INQUIRY_STATE');
    }

    // Invariant 3: Database state reflects EXPIRED with responded_at NULL
    const inqRes = await clientA.query(
      `SELECT status, responded_at FROM inquiries WHERE id = $1;`,
      [testInquiryId]
    );
    expect(inqRes.rows[0].status).toBe('EXPIRED');
    expect(inqRes.rows[0].responded_at).toBeNull();
  });
});
