/// <reference types="@cloudflare/vitest-plugin/types" />

declare namespace Cloudflare {
  interface Env {
    TEST_MIGRATIONS: import('@cloudflare/vitest-plugin').D1Migration[];
    MIGRATIONS_DB: D1Database;
    TURNSTILE_SECRET_KEY?: string;
    BOLD_IDENTITY_KEY?: string;
    BOLD_SECRET_KEY?: string;
    BREVO_API_KEY?: string;
  }
}
