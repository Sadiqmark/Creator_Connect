import request from 'supertest';
import crypto from 'crypto';
import { app } from '../src/app';
import { firebaseAdminAuth } from '../src/config/firebase';
import prisma from '../src/database/prisma';
import { UserRole, AccountStatus } from '@prisma/client';
import { resetAllRateLimits } from '../src/middleware/rateLimiter';
import { signParameters } from '../src/services/upload.service';
import { isValidCloudinaryProfileImageUrl } from '../src/utils/cloudinaryUrlValidator';
import { env } from '../src/config/env';

describe('Phase 19 Part 4 — Cloudinary Hardening Test Suite', () => {
  let verifyIdTokenSpy: jest.SpyInstance;

  const mockCreatorUser = {
    id: 'c1000000-0000-4000-8000-000000000001',
    firebaseUid: 'firebase_creator_uid_1',
    email: 'creator1@example.com',
    role: UserRole.CREATOR,
    status: AccountStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockBusinessUser = {
    id: 'b2000000-0000-4000-8000-000000000002',
    firebaseUid: 'firebase_business_uid_2',
    email: 'business2@example.com',
    role: UserRole.BUSINESS,
    status: AccountStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOtherCreatorUser = {
    id: 'c3000000-0000-4000-8000-000000000003',
    firebaseUid: 'firebase_creator_uid_3',
    email: 'creator3@example.com',
    role: UserRole.CREATOR,
    status: AccountStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDeactivatedUser = {
    id: 'd4000000-0000-4000-8000-000000000004',
    firebaseUid: 'firebase_deactivated_uid_4',
    email: 'deactivated@example.com',
    role: UserRole.CREATOR,
    status: AccountStatus.DEACTIVATED,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDeletedUser = {
    id: 'del50000-0000-4000-8000-000000000005',
    firebaseUid: 'firebase_deleted_uid_5',
    email: 'deleted@example.com',
    role: UserRole.CREATOR,
    status: AccountStatus.DELETED,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetAllRateLimits();
    verifyIdTokenSpy = jest.spyOn(firebaseAdminAuth, 'verifyIdToken');
  });

  afterEach(() => {
    verifyIdTokenSpy.mockRestore();
  });

  describe('1. Authentication & Authorization for Signature Endpoint', () => {
    it('1. should return 401 when request is unauthenticated', async () => {
      const res = await request(app).post('/api/v1/uploads/signature').send({});

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('MISSING_TOKEN');
    });

    it('2. should return valid signature response for authenticated Creator', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockCreatorUser.firebaseUid,
        email: mockCreatorUser.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockCreatorUser as any);

      const res = await request(app)
        .post('/api/v1/uploads/signature')
        .set('Authorization', 'Bearer valid-creator-token')
        .send({});

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('signature');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('apiKey');
      expect(res.body).toHaveProperty('cloudName');
      expect(res.body).toHaveProperty('folder');
      expect(res.body).toHaveProperty('publicId');

      expect(res.body.folder).toBe(`creator-connect/profiles/${mockCreatorUser.id}`);
      expect(typeof res.body.timestamp).toBe('number');
      expect(res.body.cloudName).toBe(env.CLOUDINARY_CLOUD_NAME);
      expect(res.body.apiKey).toBe(env.CLOUDINARY_API_KEY);
    });

    it('3. should return valid signature response for authenticated Business', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockBusinessUser.firebaseUid,
        email: mockBusinessUser.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockBusinessUser as any);

      const res = await request(app)
        .post('/api/v1/uploads/signature')
        .set('Authorization', 'Bearer valid-business-token')
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.folder).toBe(`creator-connect/profiles/${mockBusinessUser.id}`);
      expect(res.body.cloudName).toBe(env.CLOUDINARY_CLOUD_NAME);
    });

    it('4. should reject deactivated/deleted accounts with 403 according to existing auth policy', async () => {
      // Deactivated account
      verifyIdTokenSpy.mockResolvedValueOnce({
        uid: mockDeactivatedUser.firebaseUid,
        email: mockDeactivatedUser.email,
        email_verified: true,
      } as any);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce(mockDeactivatedUser as any);

      const deactRes = await request(app)
        .post('/api/v1/uploads/signature')
        .set('Authorization', 'Bearer deact-token')
        .send({});

      expect(deactRes.status).toBe(403);
      expect(deactRes.body.error.code).toBe('ACCOUNT_DEACTIVATED');

      // Deleted account
      verifyIdTokenSpy.mockResolvedValueOnce({
        uid: mockDeletedUser.firebaseUid,
        email: mockDeletedUser.email,
        email_verified: true,
      } as any);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce(mockDeletedUser as any);

      const delRes = await request(app)
        .post('/api/v1/uploads/signature')
        .set('Authorization', 'Bearer deleted-token')
        .send({});

      expect(delRes.status).toBe(403);
      expect(delRes.body.error.code).toBe('ACCOUNT_DELETED');
    });
  });

  describe('2. Rate Limiting & User Keying', () => {
    it('5. should allow requests 1-20 and reject request 21 with 429 RATE_LIMIT_EXCEEDED', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockCreatorUser.firebaseUid,
        email: mockCreatorUser.email,
        email_verified: true,
      } as any);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockCreatorUser as any);

      // Make 20 allowed requests
      for (let i = 1; i <= 20; i++) {
        const res = await request(app)
          .post('/api/v1/uploads/signature')
          .set('Authorization', 'Bearer valid-token')
          .send({});
        expect(res.status).toBe(200);
      }

      // 21st request must trigger 429
      const blockedRes = await request(app)
        .post('/api/v1/uploads/signature')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(blockedRes.body.error.message).toContain('Too many upload signature requests');
    });

    it('6. should strictly isolate rate limit counters by authenticated user ID', async () => {
      // User 1 uses up all 20 tokens
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockCreatorUser.firebaseUid,
        email: mockCreatorUser.email,
        email_verified: true,
      } as any);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockCreatorUser as any);

      for (let i = 1; i <= 20; i++) {
        const res = await request(app)
          .post('/api/v1/uploads/signature')
          .set('Authorization', 'Bearer user-1-token')
          .send({});
        expect(res.status).toBe(200);
      }

      // User 1 is blocked
      const user1Blocked = await request(app)
        .post('/api/v1/uploads/signature')
        .set('Authorization', 'Bearer user-1-token')
        .send({});
      expect(user1Blocked.status).toBe(429);

      // User 2 has their own independent bucket and succeeds
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockOtherCreatorUser.firebaseUid,
        email: mockOtherCreatorUser.email,
        email_verified: true,
      } as any);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockOtherCreatorUser as any);

      const user2Success = await request(app)
        .post('/api/v1/uploads/signature')
        .set('Authorization', 'Bearer user-2-token')
        .send({});
      expect(user2Success.status).toBe(200);
    });
  });

  describe('3. Parameter Generation & Tamper Resistance', () => {
    it('7. server strictly controls folder to creator-connect/profiles/<userId>', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockCreatorUser.firebaseUid,
        email: mockCreatorUser.email,
        email_verified: true,
      } as any);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockCreatorUser as any);

      const res = await request(app)
        .post('/api/v1/uploads/signature')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.folder).toBe(`creator-connect/profiles/${mockCreatorUser.id}`);
      expect(res.body.folder).not.toContain(mockCreatorUser.firebaseUid);
      expect(res.body.folder).not.toContain(mockCreatorUser.email);
    });

    it('8. server strictly controls public_id as cryptographically random UUID', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockCreatorUser.firebaseUid,
        email: mockCreatorUser.email,
        email_verified: true,
      } as any);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockCreatorUser as any);

      const res = await request(app)
        .post('/api/v1/uploads/signature')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(res.status).toBe(200);
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(res.body.publicId).toMatch(uuidRegex);
      expect(res.body.publicId).not.toContain('avatar_');
      expect(res.body.publicId).not.toContain('logo_');
      expect(res.body.publicId).not.toBe(String(res.body.timestamp));
    });

    it('9. client cannot control upload semantics via request body', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockCreatorUser.firebaseUid,
        email: mockCreatorUser.email,
        email_verified: true,
      } as any);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockCreatorUser as any);

      // Attempt client parameter tampering
      const res = await request(app)
        .post('/api/v1/uploads/signature')
        .set('Authorization', 'Bearer valid-token')
        .send({
          uploadType: 'avatar',
          folder: 'malicious/folder',
          public_id: 'overwrite_victim',
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('10. API secret never appears anywhere in the signature response', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockCreatorUser.firebaseUid,
        email: mockCreatorUser.email,
        email_verified: true,
      } as any);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockCreatorUser as any);

      const res = await request(app)
        .post('/api/v1/uploads/signature')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(res.status).toBe(200);
      const stringifiedBody = JSON.stringify(res.body);

      expect(res.body).not.toHaveProperty('apiSecret');
      expect(res.body).not.toHaveProperty('api_secret');
      expect(res.body).not.toHaveProperty('CLOUDINARY_API_SECRET');
      expect(stringifiedBody).not.toContain(env.CLOUDINARY_API_SECRET);
    });

    it('11. missing Cloudinary configuration is handled safely with 500 error', () => {
      expect(() => {
        signParameters({ folder: 'test', timestamp: 123 }, '');
      }).toThrow('Cloudinary API secret is required for signing');
    });

    it('12. Cloudinary signature generation is deterministic for known test parameters + known test secret', () => {
      const knownParams = {
        folder: 'creator-connect/profiles/test-user-123',
        public_id: '00000000-0000-4000-8000-000000000000',
        timestamp: 1711111111,
      };
      const knownSecret = 'sample_secret_key_123';

      // Recreate manual SHA-1 according to Cloudinary specification:
      // Alphabetical order: folder -> public_id -> timestamp
      const stringToSign =
        'folder=creator-connect/profiles/test-user-123&public_id=00000000-0000-4000-8000-000000000000&timestamp=1711111111sample_secret_key_123';
      const expectedDigest = crypto.createHash('sha1').update(stringToSign).digest('hex');

      const result = signParameters(knownParams, knownSecret);
      expect(result).toBe(expectedDigest);
    });
  });

  describe('4. Cloudinary Profile Image URL Validator', () => {
    const testCloud = env.CLOUDINARY_CLOUD_NAME;

    it('13. valid Cloudinary URL is accepted', () => {
      const validUrl = `https://res.cloudinary.com/${testCloud}/image/upload/v1/mock-avatar.jpg`;
      expect(isValidCloudinaryProfileImageUrl(validUrl)).toBe(true);
    });

    it('14. HTTP protocol is rejected', () => {
      const httpUrl = `http://res.cloudinary.com/${testCloud}/image/upload/v1/mock-avatar.jpg`;
      expect(isValidCloudinaryProfileImageUrl(httpUrl)).toBe(false);
    });

    it('15. attacker domains are rejected', () => {
      expect(isValidCloudinaryProfileImageUrl('https://evil-attacker.com/avatar.jpg')).toBe(false);
      expect(
        isValidCloudinaryProfileImageUrl(`https://res.cloudinary.com.attacker.com/${testCloud}/image/upload/v1/avatar.jpg`)
      ).toBe(false);
      expect(isValidCloudinaryProfileImageUrl('https://images.unsplash.com/photo-1')).toBe(false);
    });

    it('16. wrong Cloudinary cloud name is rejected', () => {
      const wrongCloudUrl = 'https://res.cloudinary.com/attacker-cloud/image/upload/v1/avatar.jpg';
      expect(isValidCloudinaryProfileImageUrl(wrongCloudUrl)).toBe(false);
    });

    it('17. raw resources are rejected', () => {
      const rawUrl = `https://res.cloudinary.com/${testCloud}/raw/upload/v1/malware.exe`;
      expect(isValidCloudinaryProfileImageUrl(rawUrl)).toBe(false);
    });

    it('18. non-upload delivery types are rejected', () => {
      const fetchUrl = `https://res.cloudinary.com/${testCloud}/image/fetch/https://evil.com/pic.jpg`;
      const authUrl = `https://res.cloudinary.com/${testCloud}/image/authenticated/s--xyz--/v1/private.jpg`;
      expect(isValidCloudinaryProfileImageUrl(fetchUrl)).toBe(false);
      expect(isValidCloudinaryProfileImageUrl(authUrl)).toBe(false);
    });

    it('19. valid Cloudinary version, transformation, and nested path segments are accepted', () => {
      const complexUrl = `https://res.cloudinary.com/${testCloud}/image/upload/c_fill,w_300,h_300/v1700000000/creator-connect/profiles/c-123/avatar.png`;
      expect(isValidCloudinaryProfileImageUrl(complexUrl)).toBe(true);

      const noVersionUrl = `https://res.cloudinary.com/${testCloud}/image/upload/creator-connect/profiles/c-123/avatar.png`;
      expect(isValidCloudinaryProfileImageUrl(noVersionUrl)).toBe(true);
    });

    it('20. profile PATCH rejects invalid image URL and accepts valid Cloudinary URL', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockCreatorUser.firebaseUid,
        email: mockCreatorUser.email,
        email_verified: true,
      } as any);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockCreatorUser as any);

      // Rejects non-Cloudinary URL
      const rejectRes = await request(app)
        .patch('/api/v1/creators/me')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Valid Name',
          niche: 'Fitness',
          location: 'City',
          bio: 'Valid bio text',
          specialties: ['Fitness'],
          instagramUrl: 'https://instagram.com/valid',
          collaborationEmail: 'valid@collab.com',
          profilePhotoUrl: 'https://attacker.com/fake-avatar.jpg',
        });

      expect(rejectRes.status).toBe(422);
      expect(rejectRes.body.error.code).toBe('VALIDATION_ERROR');

      // Accepts genuine Cloudinary URL
      jest.spyOn(prisma.creatorProfile, 'upsert').mockResolvedValue({
        id: 'cp-001',
        userId: mockCreatorUser.id,
        name: 'Valid Name',
        profilePhotoUrl: `https://res.cloudinary.com/${testCloud}/image/upload/v1/mock-avatar.jpg`,
      } as any);

      const acceptRes = await request(app)
        .patch('/api/v1/creators/me')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Valid Name',
          niche: 'Fitness',
          location: 'City',
          bio: 'Valid bio text',
          specialties: ['Fitness'],
          instagramUrl: 'https://instagram.com/valid',
          collaborationEmail: 'valid@collab.com',
          profilePhotoUrl: `https://res.cloudinary.com/${testCloud}/image/upload/v1/mock-avatar.jpg`,
        });

      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.profile.profilePhotoUrl).toBe(
        `https://res.cloudinary.com/${testCloud}/image/upload/v1/mock-avatar.jpg`
      );
    });
  });
});
