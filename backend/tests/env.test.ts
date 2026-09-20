import { envSchema, parseEnv, isPlaceholderValue } from '../src/config/env';

describe('Phase 13B-5C Production Firebase Configuration Validation Test Suite', () => {
  const validHmacSecret = 'secure_hmac_secret_with_at_least_32_characters_length';
  const validProductionFirebase = {
    NODE_ENV: 'production',
    EMAIL_RESERVATION_HMAC_SECRET: validHmacSecret,
    FIREBASE_PROJECT_ID: 'creator-connect-prod',
    FIREBASE_CLIENT_EMAIL: 'firebase-adminsdk@creator-connect-prod.iam.gserviceaccount.com',
    FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASC\n-----END PRIVATE KEY-----',
  };

  describe('1. isPlaceholderValue Helper', () => {
    it('should identify undefined, empty, or whitespace-only strings as placeholders', () => {
      expect(isPlaceholderValue(undefined)).toBe(true);
      expect(isPlaceholderValue('')).toBe(true);
      expect(isPlaceholderValue('   ')).toBe(true);
    });

    it('should identify known repository default placeholders', () => {
      expect(isPlaceholderValue('placeholder-project-id')).toBe(true);
      expect(isPlaceholderValue('placeholder-project')).toBe(true);
      expect(isPlaceholderValue('placeholder@example.com')).toBe(true);
      expect(isPlaceholderValue('placeholder-client-email')).toBe(true);
      expect(
        isPlaceholderValue('placeholder-service-account@placeholder-project-id.iam.gserviceaccount.com')
      ).toBe(true);
      expect(isPlaceholderValue('placeholder-key')).toBe(true);
    });

    it('should defensively identify strings containing case-insensitive "placeholder"', () => {
      expect(isPlaceholderValue('MY_PLACEHOLDER_KEY')).toBe(true);
      expect(isPlaceholderValue('-----BEGIN PRIVATE KEY-----\nPLACEHOLDER\n-----END PRIVATE KEY-----')).toBe(true);
    });

    it('should return false for genuine, valid-looking credential strings', () => {
      expect(isPlaceholderValue('creator-connect-production')).toBe(false);
      expect(isPlaceholderValue('firebase-adminsdk@creator-connect-prod.iam.gserviceaccount.com')).toBe(false);
      expect(isPlaceholderValue('-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASC...-----END PRIVATE KEY-----')).toBe(false);
    });
  });

  describe('2. Development & Test Environment Defaults', () => {
    it('should accept missing Firebase credentials in development and apply defaults', () => {
      const result = envSchema.safeParse({
        NODE_ENV: 'development',
        EMAIL_RESERVATION_HMAC_SECRET: validHmacSecret,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.FIREBASE_PROJECT_ID).toBe('placeholder-project-id');
        expect(result.data.FIREBASE_CLIENT_EMAIL).toBe('placeholder@example.com');
        expect(result.data.FIREBASE_PRIVATE_KEY).toBe('placeholder-key');
      }
    });

    it('should accept missing Firebase credentials in test and apply defaults', () => {
      const result = envSchema.safeParse({
        NODE_ENV: 'test',
        EMAIL_RESERVATION_HMAC_SECRET: validHmacSecret,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.FIREBASE_PROJECT_ID).toBe('placeholder-project-id');
        expect(result.data.FIREBASE_CLIENT_EMAIL).toBe('placeholder@example.com');
        expect(result.data.FIREBASE_PRIVATE_KEY).toBe('placeholder-key');
      }
    });
  });

  describe('3. Production Environment Validation', () => {
    it('should reject production configuration when Firebase credentials are omitted (defaulting to placeholders)', () => {
      const result = envSchema.safeParse({
        NODE_ENV: 'production',
        EMAIL_RESERVATION_HMAC_SECRET: validHmacSecret,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map((i) => i.path[0]);
        expect(paths).toContain('FIREBASE_PROJECT_ID');
        expect(paths).toContain('FIREBASE_CLIENT_EMAIL');
        expect(paths).toContain('FIREBASE_PRIVATE_KEY');
      }
    });

    it('should reject production configuration when Firebase credentials are explicitly empty', () => {
      const result = envSchema.safeParse({
        ...validProductionFirebase,
        FIREBASE_PROJECT_ID: '   ',
        FIREBASE_CLIENT_EMAIL: '',
        FIREBASE_PRIVATE_KEY: '  ',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map((i) => i.path[0]);
        expect(paths).toContain('FIREBASE_PROJECT_ID');
        expect(paths).toContain('FIREBASE_CLIENT_EMAIL');
        expect(paths).toContain('FIREBASE_PRIVATE_KEY');
      }
    });

    it('should reject production configuration when credentials contain placeholder tokens', () => {
      const result = envSchema.safeParse({
        ...validProductionFirebase,
        FIREBASE_PROJECT_ID: 'placeholder-project',
        FIREBASE_CLIENT_EMAIL: 'placeholder-client-email',
        FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nPLACEHOLDER\n-----END PRIVATE KEY-----',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map((i) => i.path[0]);
        expect(paths).toContain('FIREBASE_PROJECT_ID');
        expect(paths).toContain('FIREBASE_CLIENT_EMAIL');
        expect(paths).toContain('FIREBASE_PRIVATE_KEY');
      }
    });

    it('should reject production configuration when client email lacks "@"', () => {
      const result = envSchema.safeParse({
        ...validProductionFirebase,
        FIREBASE_CLIENT_EMAIL: 'invalid-email-format-without-at-sign',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const emailIssue = result.error.issues.find((i) => i.path[0] === 'FIREBASE_CLIENT_EMAIL');
        expect(emailIssue).toBeDefined();
        expect(emailIssue?.message).toContain('valid, non-placeholder service account email');
      }
    });

    it('should succeed in production when all credentials are valid-looking and non-placeholder', () => {
      const result = envSchema.safeParse(validProductionFirebase);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NODE_ENV).toBe('production');
        expect(result.data.FIREBASE_PROJECT_ID).toBe('creator-connect-prod');
        expect(result.data.FIREBASE_CLIENT_EMAIL).toBe(
          'firebase-adminsdk@creator-connect-prod.iam.gserviceaccount.com'
        );
        expect(result.data.FIREBASE_PRIVATE_KEY).toContain('BEGIN PRIVATE KEY');
      }
    });

    it('should preserve escaped newlines in private key without corrupting format', () => {
      const rawPrivateKeyWithEscapes =
        '-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASC\\n-----END PRIVATE KEY-----';
      const result = envSchema.safeParse({
        ...validProductionFirebase,
        FIREBASE_PRIVATE_KEY: rawPrivateKeyWithEscapes,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.FIREBASE_PRIVATE_KEY).toBe(rawPrivateKeyWithEscapes);
        // Verify formatting transformation compatibility as done in firebase.ts
        const unescaped = result.data.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
        expect(unescaped).toContain('\n');
      }
    });
  });

  describe('4. parseEnv Startup Fail-Fast Function', () => {
    it('should throw an Error on invalid production configuration without leaking private key content', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const invalidProdEnv = {
        NODE_ENV: 'production',
        EMAIL_RESERVATION_HMAC_SECRET: validHmacSecret,
        FIREBASE_PROJECT_ID: 'placeholder-project',
        FIREBASE_CLIENT_EMAIL: 'placeholder@example.com',
        FIREBASE_PRIVATE_KEY: 'placeholder-secret-key-that-must-not-leak',
      };

      expect(() => parseEnv(invalidProdEnv as any)).toThrow('Invalid environment configuration');

      // Ensure console.error received formatted errors without raw private key dump
      expect(consoleErrorSpy).toHaveBeenCalled();
      const loggedOutput = JSON.stringify(consoleErrorSpy.mock.calls);
      expect(loggedOutput).not.toContain('placeholder-secret-key-that-must-not-leak');

      consoleErrorSpy.mockRestore();
    });

    it('should parse successfully when given valid production environment variables', () => {
      const parsed = parseEnv(validProductionFirebase as any);
      expect(parsed.NODE_ENV).toBe('production');
      expect(parsed.FIREBASE_PROJECT_ID).toBe('creator-connect-prod');
    });
  });
});
