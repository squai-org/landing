import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

/**
 * Los tests corren dentro de workerd con un D1 local, no en Node simulado.
 * https://developers.cloudflare.com/workers/testing/vitest-integration/
 */
const migrations = await readD1Migrations('./migrations');

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: {
        // Las migraciones viajan como binding para aplicarlas en el setup.
        bindings: { TEST_MIGRATIONS: migrations },
        // El workerd que trae el runner de tests aún no acepta la
        // compatibility_date de producción (2026-08-31).
        compatibilityDate: '2026-08-22',
      },
    }),
  ],
  test: {
    include: ['test/**/*.test.ts'],
    setupFiles: ['./test/apply-migrations.ts'],
  },
});
