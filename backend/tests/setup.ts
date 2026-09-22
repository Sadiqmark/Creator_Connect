import { resetAllRateLimits } from '../src/middleware/rateLimiter';

// Ensure required HMAC secret is present for test environment
process.env.EMAIL_RESERVATION_HMAC_SECRET =
  process.env.EMAIL_RESERVATION_HMAC_SECRET ||
  'phase13b3_secure_email_reservation_hmac_secret_32bytes_long!';

// Stub external network boundary for jwks-rsa in test runner
jest.mock('jwks-rsa', () => {
  return {
    JwksClient: jest.fn().mockImplementation(() => ({
      getSigningKey: jest.fn(),
    })),
  };
});

// Reset all rate limit store counters between test cases for strict test isolation
beforeEach(() => {
  resetAllRateLimits();
});
