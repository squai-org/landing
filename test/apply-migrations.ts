import { applyD1Migrations, env } from 'cloudflare:test';

// Cada worker de test arranca con el esquema de `migrations/` ya aplicado.
// https://developers.cloudflare.com/workers/testing/vitest-integration/test-apis/
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
