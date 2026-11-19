/// <reference types="@cloudflare/vitest-plugin/types" />

declare namespace Cloudflare {
  interface Env {
    TEST_MIGRATIONS: import('@cloudflare/vitest-plugin').D1Migration[];
    TURNSTILE_SECRET_KEY?: string;
    BOLD_IDENTITY_KEY?: string;
    BOLD_SECRET_KEY?: string;
  }
}
