import { Request, Response, NextFunction } from 'express';
import rateLimit, { MemoryStore } from 'express-rate-limit';
import { RATE_LIMITS } from '../config/rateLimits';

// Registry of stores for test isolation and reset
const registeredStores: MemoryStore[] = [];

/**
 * Resets all rate limit store counters.
 * Intended for test isolation across test cases.
 */
export const resetAllRateLimits = (): void => {
  for (const store of registeredStores) {
    store.resetAll();
  }
};

/**
 * Strict authenticated user rate limit key generator.
 * Requires req.user.id to exist.
 * Fails fast with an explicit error if executed without authenticated user context.
 */
export const getAuthenticatedUserRateLimitKey = (req: Request): string => {
  const userId = req.user?.id;
  if (!userId) {
    throw new Error(
      `Invariant violation: Authenticated rate limiter executed without req.user.id on ${req.method} ${req.originalUrl}`
    );
  }
  return `user:${userId}`;
};

/**
 * Lifecycle rate limit key generator.
 * Uses req.user.id if available (for /deactivate, /reactivate, /delete-account),
 * or req.decodedToken.firebaseUid for first-time provisioning before DB user creation.
 * Fails fast with an explicit error if neither exists.
 */
export const getLifecycleRateLimitKey = (req: Request): string => {
  const userId = req.user?.id;
  if (userId) {
    return `user:${userId}`;
  }
  const firebaseUid = req.decodedToken?.firebaseUid;
  if (firebaseUid) {
    return `firebase:${firebaseUid}`;
  }
  throw new Error(
    `Invariant violation: Lifecycle rate limiter executed without authenticated user or verified token on ${req.method} ${req.originalUrl}`
  );
};

/**
 * Standard 429 error response handler matching the API error contract.
 */
const createRateLimitHandler = (message: string) => {
  return (req: Request, res: Response, _next: NextFunction, options: any): void => {
    res.status(options.statusCode).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message,
        requestId: req.id ? String(req.id) : undefined,
      },
    });
  };
};

/**
 * Factory to create rate limiters with registered MemoryStore and standard options.
 */
export const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  message: string;
  keyGenerator?: (req: Request, res: Response) => string;
  skip?: (req: Request, res: Response) => boolean | Promise<boolean>;
}) => {
  const store = new MemoryStore();
  registeredStores.push(store);

  return rateLimit({
    windowMs: options.windowMs,
    limit: options.max,
    store,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    statusCode: 429,
    keyGenerator: options.keyGenerator,
    skip: options.skip || ((req) => req.method === 'OPTIONS'),
    handler: createRateLimitHandler(options.message),
  });
};

// ── Exported Production Rate Limiters ─────────────────────────────────────

/**
 * Global IP limiter: coarse volumetric protection for all API traffic (1000 req / 15 min).
 * Skips CORS OPTIONS preflights and health check endpoint.
 */
export const globalIpLimiter = createRateLimiter({
  windowMs: RATE_LIMITS.GLOBAL_IP.WINDOW_MS,
  max: RATE_LIMITS.GLOBAL_IP.MAX,
  message: RATE_LIMITS.GLOBAL_IP.MESSAGE,
  skip: (req) =>
    req.method === 'OPTIONS' ||
    req.path === '/health' ||
    req.baseUrl.endsWith('/health') ||
    req.originalUrl.includes('/health'),
});

/**
 * Creator discovery limiter: targeted protection for GET /creators (60 req / 1 min / IP).
 */
export const discoveryLimiter = createRateLimiter({
  windowMs: RATE_LIMITS.DISCOVERY.WINDOW_MS,
  max: RATE_LIMITS.DISCOVERY.MAX,
  message: RATE_LIMITS.DISCOVERY.MESSAGE,
});

/**
 * Inquiry creation limiter: targeted protection for POST /inquiries (15 req / 15 min / user).
 */
export const inquiryLimiter = createRateLimiter({
  windowMs: RATE_LIMITS.INQUIRY_CREATION.WINDOW_MS,
  max: RATE_LIMITS.INQUIRY_CREATION.MAX,
  message: RATE_LIMITS.INQUIRY_CREATION.MESSAGE,
  keyGenerator: getAuthenticatedUserRateLimitKey,
});

/**
 * Account lifecycle limiter: targeted protection for auth lifecycle actions (5 req / 15 min).
 */
export const lifecycleLimiter = createRateLimiter({
  windowMs: RATE_LIMITS.ACCOUNT_LIFECYCLE.WINDOW_MS,
  max: RATE_LIMITS.ACCOUNT_LIFECYCLE.MAX,
  message: RATE_LIMITS.ACCOUNT_LIFECYCLE.MESSAGE,
  keyGenerator: getLifecycleRateLimitKey,
});

/**
 * Profile update limiter: targeted protection for profile PATCH endpoints (30 req / 15 min / user).
 */
export const profileUpdateLimiter = createRateLimiter({
  windowMs: RATE_LIMITS.PROFILE_UPDATE.WINDOW_MS,
  max: RATE_LIMITS.PROFILE_UPDATE.MAX,
  message: RATE_LIMITS.PROFILE_UPDATE.MESSAGE,
  keyGenerator: getAuthenticatedUserRateLimitKey,
});

/**
 * Upload signature limiter: targeted protection for POST /uploads/signature (20 req / 15 min / user).
 */
export const uploadSignatureLimiter = createRateLimiter({
  windowMs: RATE_LIMITS.UPLOAD_SIGNATURE.WINDOW_MS,
  max: RATE_LIMITS.UPLOAD_SIGNATURE.MAX,
  message: RATE_LIMITS.UPLOAD_SIGNATURE.MESSAGE,
  keyGenerator: getAuthenticatedUserRateLimitKey,
});
