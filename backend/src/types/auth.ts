import { UserRole, AccountStatus } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  firebaseUid: string;
  email: string;
  emailVerified: boolean;
  role: UserRole;
  status: AccountStatus;
}

export interface DecodedFirebaseTokenContext {
  firebaseUid: string;
  email: string;
  emailVerified: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      decodedToken?: DecodedFirebaseTokenContext;
    }
  }
}
