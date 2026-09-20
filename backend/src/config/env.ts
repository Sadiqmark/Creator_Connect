import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ override: true });

/**
 * Checks whether a given string is missing, empty, or an obvious placeholder default.
 */
export const isPlaceholderValue = (val?: string): boolean => {
  if (!val || typeof val !== 'string' || !val.trim()) {
    return true;
  }
  const trimmed = val.trim();
  const lower = trimmed.toLowerCase();

  // Known repository placeholder defaults
  if (
    lower === 'placeholder-project-id' ||
    lower === 'placeholder-project' ||
    lower === 'placeholder@example.com' ||
    lower === 'placeholder-client-email' ||
    lower === 'placeholder-service-account@placeholder-project-id.iam.gserviceaccount.com' ||
    lower === 'placeholder-key'
  ) {
    return true;
  }

  // Defensive check for any value explicitly marked as placeholder
  if (lower.includes('placeholder')) {
    return true;
  }

  return false;
};

export const envSchema = z
  .object({
    PORT: z.string().default('8000').transform((val) => parseInt(val, 10)),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    CORS_ORIGIN: z
      .string()
      .default('http://localhost:5173,http://localhost:5174')
      .transform((val) =>
        val
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      ),
    DATABASE_URL: z
      .string()
      .optional()
      .default('postgresql://postgres:postgres@localhost:5432/creator_connect?schema=public'),
    FIREBASE_PROJECT_ID: z.string().optional().default('placeholder-project-id'),
    FIREBASE_CLIENT_EMAIL: z.string().optional().default('placeholder@example.com'),
    FIREBASE_PRIVATE_KEY: z.string().optional().default('placeholder-key'),
    EMAIL_RESERVATION_HMAC_SECRET: z
      .string({ required_error: 'EMAIL_RESERVATION_HMAC_SECRET is required' })
      .min(32, 'EMAIL_RESERVATION_HMAC_SECRET must be at least 32 characters'),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production') {
      if (isPlaceholderValue(data.FIREBASE_PROJECT_ID)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['FIREBASE_PROJECT_ID'],
          message:
            'FIREBASE_PROJECT_ID must be explicitly configured with a non-placeholder value in production',
        });
      }

      if (isPlaceholderValue(data.FIREBASE_CLIENT_EMAIL) || !data.FIREBASE_CLIENT_EMAIL.includes('@')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['FIREBASE_CLIENT_EMAIL'],
          message:
            'FIREBASE_CLIENT_EMAIL must be explicitly configured with a valid, non-placeholder service account email in production',
        });
      }

      if (isPlaceholderValue(data.FIREBASE_PRIVATE_KEY)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['FIREBASE_PRIVATE_KEY'],
          message:
            'FIREBASE_PRIVATE_KEY must be explicitly configured with a non-placeholder private key in production',
        });
      }
    }
  });

export const parseEnv = (rawEnv: NodeJS.ProcessEnv = process.env) => {
  const result = envSchema.safeParse(rawEnv);
  if (!result.success) {
    // Structured error without leaking secret values
    console.error('❌ Invalid environment variables:', result.error.format());
    throw new Error('Invalid environment configuration');
  }
  return result.data;
};

export const env = parseEnv();
export type Env = z.infer<typeof envSchema>;
