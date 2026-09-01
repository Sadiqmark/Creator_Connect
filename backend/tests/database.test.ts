import fs from 'fs';
import path from 'path';
import { PGlite } from '@electric-sql/pglite';

describe('PostgreSQL Database Schema & Invariants Integration Tests', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = new PGlite();
    const migrationPath = path.join(
      __dirname,
      '../prisma/migrations/20260901000000_init_domain_schema/migration.sql'
    );
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    await db.exec(migrationSql);
  });

  afterAll(async () => {
    await db.close();
  });

  describe('1. User Entity & Uniqueness Constraints', () => {
    it('should create valid creator and business users', async () => {
      const creatorRes = await db.query<any>(
        `INSERT INTO users (id, firebase_uid, email, role, status, updated_at)
         VALUES (
           '11111111-1111-4111-8111-111111111111',
           'fb-uid-creator-1',
           'test.creator1@example.com',
           'CREATOR',
           'ACTIVE',
           NOW()
         ) RETURNING id, role, status;`
      );
      expect(creatorRes.rows[0].role).toBe('CREATOR');
      expect(creatorRes.rows[0].status).toBe('ACTIVE');

      const businessRes = await db.query<any>(
        `INSERT INTO users (id, firebase_uid, email, role, status, updated_at)
         VALUES (
           '22222222-2222-4222-8222-222222222222',
           'fb-uid-biz-1',
           'test.biz1@example.com',
           'BUSINESS',
           'ACTIVE',
           NOW()
         ) RETURNING id, role, status;`
      );
      expect(businessRes.rows[0].role).toBe('BUSINESS');
    });

    it('should reject duplicate firebase_uid', async () => {
      await expect(
        db.query<any>(
          `INSERT INTO users (id, firebase_uid, email, role, status, updated_at)
           VALUES (
             '33333333-3333-4333-8333-333333333333',
             'fb-uid-creator-1', -- Duplicate firebase_uid
             'different.email@example.com',
             'CREATOR',
             'ACTIVE',
             NOW()
           );`
        )
      ).rejects.toThrow(/unique constraint/i);
    });

    it('should reject duplicate email', async () => {
      await expect(
        db.query<any>(
          `INSERT INTO users (id, firebase_uid, email, role, status, updated_at)
           VALUES (
             '44444444-4444-4444-8444-444444444444',
             'fb-uid-unique-diff',
             'test.creator1@example.com', -- Duplicate email
             'CREATOR',
             'ACTIVE',
             NOW()
           );`
        )
      ).rejects.toThrow(/unique constraint/i);
    });
  });

  describe('2. Profiles & Nullable Collaboration Email', () => {
    it('should insert creator profile and allow nullable collaboration_email on soft delete', async () => {
      const creatorProfileRes = await db.query<any>(
        `INSERT INTO creator_profiles (id, user_id, name, niche, location, bio, specialties, collaboration_email, updated_at)
         VALUES (
           '55555555-5555-4555-8555-555555555555',
           '11111111-1111-4111-8111-111111111111',
           'Priya Style',
           'Fashion & Style',
           'Mumbai, India',
           'Creator bio',
           ARRAY['Reels', 'Lookbooks'],
           'priya.contact@example.com',
           NOW()
         ) RETURNING id, collaboration_email;`
      );
      expect(creatorProfileRes.rows[0].collaboration_email).toBe('priya.contact@example.com');

      // Test clearing email upon soft deletion
      const updateRes = await db.query<any>(
        `UPDATE creator_profiles
         SET collaboration_email = NULL, updated_at = NOW()
         WHERE user_id = '11111111-1111-4111-8111-111111111111'
         RETURNING collaboration_email;`
      );
      expect(updateRes.rows[0].collaboration_email).toBeNull();
    });

    it('should insert business profile with optional logo/website as null', async () => {
      const businessProfileRes = await db.query<any>(
        `INSERT INTO business_profiles (id, user_id, business_name, category, description, city, state_or_province, country, collaboration_email, updated_at)
         VALUES (
           '66666666-6666-4666-8666-666666666666',
           '22222222-2222-4222-8222-222222222222',
           'Aura Craft Roasters',
           'Food & Beverage',
           'Specialty coffee roastery',
           'Delhi',
           'Delhi NCR',
           'India',
           'collab@auracraft.example.com',
           NOW()
         ) RETURNING business_name, logo_url, website_url;`
      );
      expect(businessProfileRes.rows[0].business_name).toBe('Aura Craft Roasters');
      expect(businessProfileRes.rows[0].logo_url).toBeNull();
      expect(businessProfileRes.rows[0].website_url).toBeNull();
    });
  });

  describe('3. SavedCreator Uniqueness', () => {
    it('should allow business to save creator once', async () => {
      const res = await db.query<any>(
        `INSERT INTO saved_creators (id, business_id, creator_id)
         VALUES (
           '77777777-7777-4777-8777-777777777777',
           '22222222-2222-4222-8222-222222222222',
           '11111111-1111-4111-8111-111111111111'
         ) RETURNING id;`
      );
      expect(res.rows.length).toBe(1);
    });

    it('should reject duplicate save of the same creator by the same business', async () => {
      await expect(
        db.query<any>(
          `INSERT INTO saved_creators (id, business_id, creator_id)
           VALUES (
             '88888888-8888-4888-8888-888888888888',
             '22222222-2222-4222-8222-222222222222',
             '11111111-1111-4111-8111-111111111111'
           );`
        )
      ).rejects.toThrow(/unique constraint/i);
    });
  });

  describe('4. Inquiry State Machine & Duplicate Active Inquiry Partial Unique Index', () => {
    const bizId = '22222222-2222-4222-8222-222222222222';
    const creatorId = '11111111-1111-4111-8111-111111111111';

    it('should insert a PENDING inquiry', async () => {
      const inqRes = await db.query<any>(
        `INSERT INTO inquiries (
           id, business_id, creator_id, status, collaboration_type, platform, deliverables, brief, expires_at, updated_at
         ) VALUES (
           'a1111111-1111-4111-8111-111111111111',
           '${bizId}',
           '${creatorId}',
           'PENDING',
           'Sponsored Reel',
           'Instagram',
           '1 Reel',
           'Monsoon launch campaign',
           NOW() + INTERVAL '60 days',
           NOW()
         ) RETURNING id, status;`
      );
      expect(inqRes.rows[0].status).toBe('PENDING');
    });

    it('should REJECT a second PENDING inquiry between the same business and creator (Partial Unique Index)', async () => {
      await expect(
        db.query<any>(
          `INSERT INTO inquiries (
             id, business_id, creator_id, status, collaboration_type, platform, deliverables, brief, expires_at, updated_at
           ) VALUES (
             'a2222222-2222-4222-8222-222222222222',
             '${bizId}',
             '${creatorId}',
             'PENDING',
             'Another proposal',
             'Instagram',
             '2 Stories',
             'Duplicate attempt',
             NOW() + INTERVAL '60 days',
             NOW()
           );`
        )
      ).rejects.toThrow(/unique constraint|unique_active_business_creator_inquiry/i);
    });

    it('should atomically transition PENDING to ACCEPTED', async () => {
      const updateRes = await db.query<any>(
        `UPDATE inquiries
         SET status = 'ACCEPTED', responded_at = NOW(), updated_at = NOW()
         WHERE id = 'a1111111-1111-4111-8111-111111111111'
           AND status = 'PENDING'
         RETURNING id, status;`
      );
      expect(updateRes.rows[0].status).toBe('ACCEPTED');
    });

    it('should REJECT another active inquiry while the current one is ACCEPTED', async () => {
      await expect(
        db.query<any>(
          `INSERT INTO inquiries (
             id, business_id, creator_id, status, collaboration_type, platform, deliverables, brief, expires_at, updated_at
           ) VALUES (
             'a3333333-3333-4333-8333-333333333333',
             '${bizId}',
             '${creatorId}',
             'PENDING',
             'Third proposal',
             'Instagram',
             '1 Reel',
             'While accepted',
             NOW() + INTERVAL '60 days',
             NOW()
           );`
        )
      ).rejects.toThrow(/unique constraint|unique_active_business_creator_inquiry/i);
    });

    it('should ALLOW a new inquiry after previous inquiry is REJECTED, EXPIRED, or CLOSED', async () => {
      // Transition previous to REJECTED (simulating completed historical cycle)
      await db.query<any>(
        `UPDATE inquiries
         SET status = 'REJECTED', updated_at = NOW()
         WHERE id = 'a1111111-1111-4111-8111-111111111111';`
      );

      // Now inserting a new PENDING inquiry must SUCCEED because the old one is no longer active
      const newInqRes = await db.query<any>(
        `INSERT INTO inquiries (
           id, business_id, creator_id, status, collaboration_type, platform, deliverables, brief, expires_at, updated_at
         ) VALUES (
           'a4444444-4444-4444-8444-444444444444',
           '${bizId}',
           '${creatorId}',
           'PENDING',
           'Fresh proposal after rejection',
           'Instagram',
           '1 Reel',
           'New brief',
           NOW() + INTERVAL '60 days',
           NOW()
         ) RETURNING id, status;`
      );
      expect(newInqRes.rows[0].status).toBe('PENDING');
    });
  });

  describe('5. Notifications & Audit Events', () => {
    it('should create notification with reference_id and track read status', async () => {
      const notifRes = await db.query<any>(
        `INSERT INTO notifications (id, user_id, type, reference_id)
         VALUES (
           'fa111111-1111-4111-8111-111111111111',
           '11111111-1111-4111-8111-111111111111',
           'INQUIRY_RECEIVED',
           'a4444444-4444-4444-8444-444444444444'
         ) RETURNING id, type, read_at;`
      );
      expect(notifRes.rows[0].type).toBe('INQUIRY_RECEIVED');
      expect(notifRes.rows[0].read_at).toBeNull();

      const markReadRes = await db.query<any>(
        `UPDATE notifications
         SET read_at = NOW()
         WHERE id = 'fa111111-1111-4111-8111-111111111111'
         RETURNING read_at;`
      );
      expect(markReadRes.rows[0].read_at).not.toBeNull();
    });

    it('should create audit event with arbitrary actor_user_id and privacy-safe metadata without requiring FK', async () => {
      const auditRes = await db.query<any>(
        `INSERT INTO audit_events (id, event_type, actor_user_id, resource_type, resource_id, metadata)
         VALUES (
           'e1111111-1111-4111-8111-111111111111',
           'INQUIRY_ACCEPTED',
           '99999999-9999-4999-8999-999999999999', -- Non-existent user ID (proves no hard FK restriction)
           'INQUIRY',
           'a4444444-4444-4444-8444-444444444444',
           '{"previousStatus":"PENDING","newStatus":"ACCEPTED"}'::jsonb
         ) RETURNING id, event_type;`
      );
      expect(auditRes.rows[0].event_type).toBe('INQUIRY_ACCEPTED');
    });
  });
});
