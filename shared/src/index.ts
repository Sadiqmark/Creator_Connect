/**
 * @creator-connect/shared
 * Shared baseline type contracts and response definitions.
 */

export interface HealthCheckResponse {
  status: 'ok';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    requestId?: string;
    details?: unknown;
  };
}

export const UserRole = {
  CREATOR: 'CREATOR',
  BUSINESS: 'BUSINESS',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const AccountStatus = {
  ACTIVE: 'ACTIVE',
  DELETED: 'DELETED',
} as const;

export type AccountStatus = (typeof AccountStatus)[keyof typeof AccountStatus];

export const InquiryStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
  CLOSED: 'CLOSED',
} as const;

export type InquiryStatus = (typeof InquiryStatus)[keyof typeof InquiryStatus];
