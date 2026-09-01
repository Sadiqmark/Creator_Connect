import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('8000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().optional().default('postgresql://postgres:postgres@localhost:5432/creator_connect?schema=public'),
  FIREBASE_PROJECT_ID: z.string().optional().default('placeholder-project-id'),
  FIREBASE_CLIENT_EMAIL: z.string().optional().default('placeholder@example.com'),
  FIREBASE_PRIVATE_KEY: z.string().optional().default('placeholder-key'),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    // Structured error without leaking secret values
    console.error('❌ Invalid environment variables:', result.error.format());
    throw new Error('Invalid environment configuration');
  }
  return result.data;
};

export const env = parseEnv();
export type Env = z.infer<typeof envSchema>;
