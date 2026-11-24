import type { Env } from '../types';
import { createMockD1 } from './mock-d1';

const globalForDb = globalThis as typeof globalThis & { __squaiMockDb?: D1Database };

function getMockDb(): D1Database {
  if (!globalForDb.__squaiMockDb) {
    globalForDb.__squaiMockDb = createMockD1();
  }
  return globalForDb.__squaiMockDb;
}

export function getNodeEnv(): Env {
  return {
    DB: getMockDb(),
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
    TURNSTILE_HOSTNAME: process.env.TURNSTILE_HOSTNAME,
    BOLD_IDENTITY_KEY: process.env.BOLD_IDENTITY_KEY,
    BOLD_SECRET_KEY: process.env.BOLD_SECRET_KEY,
    BREVO_API_KEY: process.env.BREVO_API_KEY,
  } as Env;
}
