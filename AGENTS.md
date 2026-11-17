# squai-org/landing

Squai's marketing site (https://squai.io): a static Astro site plus a lead-capture API (Hono) served by a single Cloudflare Worker, with leads stored in Cloudflare D1. Stack: Astro, TypeScript, Hono, Zod, Cloudflare Workers + D1, Vitest (workerd), pnpm.

## Commands

* Install: `pnpm install --frozen-lockfile`
* Build: `pnpm build`
* Tests (all): `pnpm test`
* One test: `pnpm test -t "<test name substring>"`
* Run local (front only, no `/api`): `pnpm dev`
* Run local (front + API + local D1): `pnpm db:migrate:local && pnpm preview:worker`
* Typecheck (Worker code in `src/server` only): `pnpm typecheck`
* Lint/format: none configured

## Non-obvious conventions

* Backend dependencies go one way: `routes → services → repositories → D1`. SQL lives only in `src/server/repositories/`, always as prepared statements with `.bind()`.
* Content lives in `src/content/copies.json` and `src/content/services/<slug>.json`. Components never read the JSON directly; they use `getSiteContent()` from `src/lib/content.ts`.
* The filename of each service JSON is its public URL slug. Renaming it changes the published URL.
* `src/content/schema.ts` (Zod) is the editorial contract and is validated at build; a bad field fails the build. `.pages.yml` (Pages CMS forms) mirrors it, so change both in the same commit.
* The canonical domain exists in two places that must match: `site` in `astro.config.mjs` and `SITE_URL` in `src/lib/seo.ts`.
* Runtime config (API paths, booking URL) goes in `src/config/`, not in content.
* No unverified facts in JSON-LD (prices, dates, addresses). `sameAs` is emitted only when `socials[].href` is non-empty.
* The CSP is not written by hand: `src/integrations/csp-headers.mjs` injects it into `dist/_headers` at build, replacing the `# @csp@` marker in `public/_headers`. `/api/*` takes its headers from `src/server/middleware/security-headers.ts`.
* `wrangler.jsonc` is the source of the Worker types: after editing it, run `pnpm cf-typegen`.
* After changing the logo, run `pnpm og` to regenerate `public/og/*` and `apple-touch-icon.png`.
* The API stores the visitor's country (`CF-IPCountry`), never the IP.
* Repo prose (copy, comments, README) is mostly Spanish; keep that when editing existing text.

## Boundaries

* Do not edit: `worker-configuration.d.ts` (generated), `pnpm-lock.yaml` (changes only via `pnpm add/remove`), `dist/`, `.wrangler/`, `.env*`, `.dev.vars*`, and existing files in `migrations/` (applied migrations are immutable; add a new numbered file).
* Ask before:
  * Changing public contracts: `/api/*` request/response shapes, error codes or paths; `src/content/schema.ts`; service filenames; canonical URLs.
  * Adding or upgrading dependencies, or changing `.node-version`.
  * Adding migrations.
  * Touching Turnstile, rate limiting, the same-origin guard, the CSP, `public/_headers` or `robots.txt`.
  * Editing `wrangler.jsonc`.
  * Running `pnpm deploy`, `pnpm deploy:ci`, `pnpm db:migrate:remote` or `pnpm version:*` (they touch production).

## Known pitfalls

* `pnpm dev` does not serve `/api`, so forms fail there. Use `pnpm preview:worker` to test them.
* `pnpm typecheck` covers only `src/server`; the root `tsconfig.json` excludes it, and Astro files are not checked by it. `pnpm build` is what catches content and Astro errors.
* `README.md` links to `docs/pages-cms.md`, `docs/pages-cms-inventario.md` and `docs/cloudflare-setup.md`, which do not exist, and says team photos are in `public/images/` when they are in `src/assets/`. Do not rely on those references.
* To check the built site with production routing and headers, use `pnpm build && node docs/scripts/serve-dist.mjs`; a generic static server returns 404 on internal routes.

## Maintenance

* Humans own this file. Agents propose edits, humans approve them.
* When an agent repeats a mistake, add one line under Known pitfalls.
* Keep it short: if the agent can learn something by reading the code, remove it from here.
