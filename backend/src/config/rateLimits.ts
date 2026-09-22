/**
 * Centralized Rate Limiting Configuration
 * All numeric limits and user-facing messages live here.
 */

export const RATE_LIMITS = {
  GLOBAL_IP: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX: 1000,
    MESSAGE: 'Too many requests from this IP address. Please try again later.',
  },
  DISCOVERY: {
    WINDOW_MS: 60 * 1000, // 1 minute
    MAX: 60,
    MESSAGE: 'Too many creator searches. Please slow down your browsing.',
  },
  INQUIRY_CREATION: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX: 15,
    MESSAGE: 'Too many inquiries submitted. Please wait before sending more.',
  },
  ACCOUNT_LIFECYCLE: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX: 5,
    MESSAGE: 'Too many account status changes. Please wait before trying again.',
  },
  PROFILE_UPDATE: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX: 30,
    MESSAGE: 'Too many profile updates. Please wait before saving again.',
  },
} as const;
