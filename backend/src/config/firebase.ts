import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { env } from './env';
import { logger } from '../middleware/logger';

if (!getApps().length) {
  try {
    if (
      env.FIREBASE_PROJECT_ID &&
      env.FIREBASE_CLIENT_EMAIL &&
      env.FIREBASE_PRIVATE_KEY &&
      env.FIREBASE_PRIVATE_KEY !== 'placeholder-key'
    ) {
      initializeApp({
        credential: cert({
          projectId: env.FIREBASE_PROJECT_ID,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
          privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
      logger.info('Firebase Admin SDK initialized with service account credentials');
    } else {
      initializeApp({
        projectId: env.FIREBASE_PROJECT_ID || 'creator-connect-dev',
      });
      logger.info('Firebase Admin SDK initialized with project ID');
    }
  } catch (error) {
    logger.warn({ error }, 'Firebase Admin SDK initialization warning');
  }
}

export const firebaseAdminAuth = getAuth();
export default firebaseAdminAuth;
