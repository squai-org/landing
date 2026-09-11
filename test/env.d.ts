/// <reference types="@cloudflare/vitest-pool-workers/types" />

/**
 * Bindings que solo existen durante los tests, además de los que
 * `pnpm cf-typegen` genera en worker-configuration.d.ts.
 */
declare namespace Cloudflare {
  interface Env {
    TEST_MIGRATIONS: import('@cloudflare/vitest-pool-workers').D1Migration[];
    TURNSTILE_SECRET_KEY?: string;
  }
}
