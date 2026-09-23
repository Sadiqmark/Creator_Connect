import { resetAllRateLimits } from '../src/middleware/rateLimiter';

// Ensure required HMAC secret is present for test environment
process.env.EMAIL_RESERVATION_HMAC_SECRET =
  process.env.EMAIL_RESERVATION_HMAC_SECRET ||
  'phase13b3_secure_email_reservation_hmac_secret_32bytes_long!';

// Ensure Cloudinary test configuration is present for test environment
process.env.CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'xinpxb9h';
process.env.CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || 'test_cloudinary_api_key';
process.env.CLOUDINARY_API_SECRET =
  process.env.CLOUDINARY_API_SECRET || 'test_cloudinary_api_secret_for_sha1_signing';

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
