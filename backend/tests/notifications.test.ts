import request from 'supertest';
import { app } from '../src/app';
import { firebaseAdminAuth } from '../src/config/firebase';
import prisma from '../src/database/prisma';
import { UserRole, AccountStatus, NotificationType } from '@prisma/client';

describe('Phase 12 Header Notifications Integration Test Suite', () => {
  let verifyIdTokenSpy: jest.SpyInstance;

  const mockUserA = {
    id: 'u1000000-0000-4000-8000-000000000001',
    firebaseUid: 'firebase_user_a',
    email: 'user-a@example.com',
    role: UserRole.CREATOR,
    status: AccountStatus.ACTIVE,
  };

  const mockUserB = {
    id: 'u2000000-0000-4000-8000-000000000002',
    firebaseUid: 'firebase_user_b',
    email: 'user-b@example.com',
    role: UserRole.BUSINESS,
    status: AccountStatus.ACTIVE,
  };

  const mockDeletedUser = {
    id: 'u3000000-0000-4000-8000-000000000003',
    firebaseUid: 'firebase_deleted',
    email: 'deleted@example.com',
    role: UserRole.CREATOR,
    status: AccountStatus.DELETED,
  };

  const notifId1 = 'a1000000-0000-4000-8000-000000000001';
  const notifId2 = 'a2000000-0000-4000-8000-000000000002';
  const inqId1 = 'e1000000-0000-4000-8000-000000000001';
  const inqId2 = 'e2000000-0000-4000-8000-000000000002';

  const mockNotificationsUserA = [
    {
      id: notifId1,
      userId: mockUserA.id,
      type: NotificationType.INQUIRY_RECEIVED,
      referenceId: inqId1,
      readAt: null,
      createdAt: new Date('2026-09-18T10:00:00Z'),
    },
    {
      id: notifId2,
      userId: mockUserA.id,
      type: NotificationType.INQUIRY_ACCEPTED,
      referenceId: inqId2,
      readAt: new Date('2026-09-18T09:00:00Z'),
      createdAt: new Date('2026-09-18T08:00:00Z'),
    },
  ];

  beforeEach(() => {
    jest.restoreAllMocks();

    verifyIdTokenSpy = jest.spyOn(firebaseAdminAuth, 'verifyIdToken').mockResolvedValue({
      uid: mockUserA.firebaseUid,
      email: mockUserA.email,
      email_verified: true,
    } as any);

    (jest.spyOn(prisma.user, 'findUnique') as any).mockImplementation(async (args: any) => {
      if (args.where.firebaseUid === mockUserA.firebaseUid) return mockUserA as any;
      if (args.where.firebaseUid === mockUserB.firebaseUid) return mockUserB as any;
      if (args.where.firebaseUid === mockDeletedUser.firebaseUid) return mockDeletedUser as any;
      return null;
    });
  });

  describe('1. Authentication & Security Guards', () => {
    it('should return 401 MISSING_TOKEN when authorization header is absent', async () => {
      const res = await request(app).get('/api/v1/notifications');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should return 403 ACCOUNT_DELETED when soft-deleted user attempts to access notifications', async () => {
      verifyIdTokenSpy.mockResolvedValueOnce({
        uid: mockDeletedUser.firebaseUid,
        email: mockDeletedUser.email,
        email_verified: true,
      } as any);

      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', 'Bearer valid_deleted_token');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ACCOUNT_DELETED');
    });
  });

  describe('2. GET /api/v1/notifications — Listing & Unread Count', () => {
    it('should return paginated notifications and accurate unreadCount for the authenticated user', async () => {
      jest.spyOn(prisma.notification, 'count').mockResolvedValue(1);
      jest.spyOn(prisma.notification, 'findMany').mockResolvedValue(mockNotificationsUserA as any);

      const res = await request(app)
        .get('/api/v1/notifications?limit=20')
        .set('Authorization', 'Bearer valid_token');

      expect(res.status).toBe(200);
      expect(res.body.unreadCount).toBe(1);
      expect(res.body.notifications.length).toBe(2);
      expect(res.body.notifications[0].id).toBe(notifId1);
      expect(res.body.notifications[0].readAt).toBeNull();
      expect(res.body.notifications[0].type).toBe('INQUIRY_RECEIVED');
      expect(res.body.notifications[0].referenceId).toBe(inqId1);

      // Verify no PII is exposed
      expect(res.body.notifications[0].email).toBeUndefined();
      expect(res.body.notifications[0].collaborationEmail).toBeUndefined();

      // Verify database queries were strictly scoped by userId
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { userId: mockUserA.id, readAt: null },
      });
      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserA.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: expect.any(Object),
      });
    });

    it('should clamp limit to maximum 50 when higher limit is requested', async () => {
      jest.spyOn(prisma.notification, 'count').mockResolvedValue(0);
      const findManySpy = jest.spyOn(prisma.notification, 'findMany').mockResolvedValue([]);

      const res = await request(app)
        .get('/api/v1/notifications?limit=999')
        .set('Authorization', 'Bearer valid_token');

      expect(res.status).toBe(200);
      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        })
      );
    });
  });

  describe('3. PATCH /api/v1/notifications/:id/read — Mark Single Read', () => {
    it('should return 400 VALIDATION_ERROR when notification ID is not a valid UUID', async () => {
      const res = await request(app)
        .patch('/api/v1/notifications/invalid-uuid/read')
        .set('Authorization', 'Bearer valid_token');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should mark an unread notification as read and return updated notification DTO', async () => {
      const unreadNotif = { ...mockNotificationsUserA[0], readAt: null };
      const updatedNotif = { ...unreadNotif, readAt: new Date('2026-09-18T10:05:00Z') };

      jest.spyOn(prisma.notification, 'findUnique').mockResolvedValue(unreadNotif as any);
      const updateSpy = jest.spyOn(prisma.notification, 'update').mockResolvedValue(updatedNotif as any);

      const res = await request(app)
        .patch(`/api/v1/notifications/${notifId1}/read`)
        .set('Authorization', 'Bearer valid_token');

      expect(res.status).toBe(200);
      expect(res.body.notification.id).toBe(notifId1);
      expect(res.body.notification.readAt).not.toBeNull();
      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: notifId1 },
        data: { readAt: expect.any(Date) },
        select: expect.any(Object),
      });
    });

    it('should be idempotent: marking an already-read notification returns 200 without DB update', async () => {
      const alreadyReadNotif = mockNotificationsUserA[1]; // readAt is non-null
      jest.spyOn(prisma.notification, 'findUnique').mockResolvedValue(alreadyReadNotif as any);
      const updateSpy = jest.spyOn(prisma.notification, 'update');

      const res = await request(app)
        .patch(`/api/v1/notifications/${notifId2}/read`)
        .set('Authorization', 'Bearer valid_token');

      expect(res.status).toBe(200);
      expect(res.body.notification.id).toBe(notifId2);
      expect(res.body.notification.readAt).not.toBeNull();
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it('should return 404 NOTIFICATION_NOT_FOUND when notification does not exist', async () => {
      jest.spyOn(prisma.notification, 'findUnique').mockResolvedValue(null);

      const nonExistentId = 'a9000000-0000-4000-8000-000000000009';
      const res = await request(app)
        .patch(`/api/v1/notifications/${nonExistentId}/read`)
        .set('Authorization', 'Bearer valid_token');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOTIFICATION_NOT_FOUND');
    });

    it('should return 404 NOTIFICATION_NOT_FOUND when notification belongs to another user (Strict Isolation)', async () => {
      const otherUsersNotif = {
        ...mockNotificationsUserA[0],
        userId: mockUserB.id, // Owned by User B
      };

      jest.spyOn(prisma.notification, 'findUnique').mockResolvedValue(otherUsersNotif as any);

      const res = await request(app)
        .patch(`/api/v1/notifications/${notifId1}/read`)
        .set('Authorization', 'Bearer valid_token'); // Requested by User A

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOTIFICATION_NOT_FOUND');
    });
  });

  describe('4. POST /api/v1/notifications/mark-all-read — Mark All Read', () => {
    it('should mark all unread notifications as read and return updatedCount', async () => {
      const updateManySpy = jest.spyOn(prisma.notification, 'updateMany').mockResolvedValue({ count: 3 });

      const res = await request(app)
        .post('/api/v1/notifications/mark-all-read')
        .set('Authorization', 'Bearer valid_token');

      expect(res.status).toBe(200);
      expect(res.body.updatedCount).toBe(3);
      expect(updateManySpy).toHaveBeenCalledWith({
        where: { userId: mockUserA.id, readAt: null },
        data: { readAt: expect.any(Date) },
      });
    });

    it('should be idempotent: returns { updatedCount: 0 } when no unread notifications exist', async () => {
      jest.spyOn(prisma.notification, 'updateMany').mockResolvedValue({ count: 0 });

      const res = await request(app)
        .post('/api/v1/notifications/mark-all-read')
        .set('Authorization', 'Bearer valid_token');

      expect(res.status).toBe(200);
      expect(res.body.updatedCount).toBe(0);
    });
  });
});
