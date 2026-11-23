import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

const migrations = await readD1Migrations('./migrations');

/**
 * Dos proyectos porque hay dos entornos reales: la API corre en workerd y la
 * integracion que escribe la CSP corre en Node durante el build de Astro (usa
 * node:fs, que workerd no tiene).
 */
export default defineConfig({
  test: {
    projects: [
      {
        plugins: [
          cloudflareTest({
            wrangler: { configPath: './wrangler.jsonc' },
            miniflare: {
              bindings: { TEST_MIGRATIONS: migrations },
              d1Databases: ['MIGRATIONS_DB'],
              compatibilityDate: '2026-08-22',
            },
          }),
        ],
        test: {
          name: 'worker',
          include: ['test/server/**/*.test.ts'],
          setupFiles: ['./test/apply-migrations.ts'],
        },
      },
      {
        test: {
          name: 'build',
          environment: 'node',
          include: ['test/build/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'dist',
          environment: 'node',
          include: ['test/page/**/*.test.ts'],
        },
      },
    ],
  },
});
