# AGENTS.md

## What this repo is

Squai's marketing site (https://squai.io): a static Astro landing page plus a small lead-capture backend, both served by a single Cloudflare Worker (static assets from `./dist`, `/api/*` handled by Hono, leads stored in D1). Visitors browse the home page and service pages, and submit the waitlist and contact forms. Editors change copy through Pages CMS, which writes straight to the JSON files in `src/content/`. What must never break: lead capture (`POST /api/waitlist`, `POST /api/contact`) and its protections (Turnstile, same-origin guard, rate limiting, prepared statements only, no visitor IP stored), the build-time content validation, and the canonical URLs/sitemap/JSON-LD that SEO depends on. Prose in the repo (copy, comments, README) is mostly Spanish.

## Map

* `src/pages/` — Astro routes: `index.astro` (home), `servicios/[slug].astro` (one page per file in `src/content/services/`), legal pages, `llms.txt.ts`
* `src/components/` — One component per page section, plus `Seo`, `Turnstile`, forms (`Waitlist`, `ContactModal`)
* `src/layouts/` — `Layout.astro` (head, meta, fonts, form script) and `LegalLayout.astro`
* `src/content/` — Editorial content: `copies.json`, `services/<slug>.json` (filename = public URL), `schema.ts` (Zod contract validated at build)
* `src/content.config.ts`, `src/lib/content.ts` — Content collections; `getSiteContent()` is the only way components read content
* `src/lib/seo.ts` — Canonical domain (`SITE_URL`) and JSON-LD builders
* `src/config/` — Runtime config (API paths, booking URL). Not content
* `src/server/` — Worker backend. Dependency direction is one way: `routes → services → repositories → D1`. SQL lives only in `repositories/`
* `src/integrations/csp-headers.mjs` — Writes the CSP (with script hashes) into `dist/_headers` at build
* `migrations/` — D1 migrations, applied in filename order
* `.pages.yml` — Pages CMS form tree that mirrors `schema.ts`
* `public/` — Static files, fonts, `_headers`, `robots.txt`, generated `og/` images
* `scripts/generate-og.mjs` — Regenerates OG image and icons (`pnpm og`)
* `docs/scripts/` — Performance audit helpers (`serve-dist.mjs` serves `dist/` with production routing and headers)
* `wrangler.jsonc` — Worker, D1 binding, rate-limit binding. `worker-configuration.d.ts` is generated from it
* `test/` — Vitest suite running inside workerd against a local D1 (`test/server/api.test.ts`, migrations applied in `test/apply-migrations.ts`)
* Working examples to copy from: a new endpoint → `src/server/routes/contact.ts` with its schema and repository; a new section → any component in `src/components/` fed by `getSiteContent()`; a new test → `test/server/api.test.ts`

## Commands

Package manager is pnpm; Node version is in `.node-version`.

* Install: `pnpm install --frozen-lockfile`
* Build: `pnpm build` (output in `dist/`; fails if content does not match `schema.ts`)
* Typecheck (Worker code only): `pnpm typecheck`
* Run all tests: `pnpm test`
* Run one test: `pnpm test -t "<test name substring>"`
* Run locally, front only (no `/api`): `pnpm dev` (http://localhost:4321)
* Run locally, front + API + local D1: `pnpm db:migrate:local && pnpm preview:worker`
* Regenerate Worker types after editing `wrangler.jsonc`: `pnpm cf-typegen`
* Never run without being asked: `pnpm deploy`, `pnpm deploy:ci`, `pnpm db:migrate:remote`, `pnpm version:*`

## Start of every session

1. Read recent history: `git log --oneline -20`.
2. Run the full test suite before changing anything: `pnpm test && pnpm typecheck && pnpm build`. Report existing failures first.

## Definition of done

* Every task has checkable success criteria. If the task has none, propose them before writing code.
* Tests first: write the test, run it, confirm it fails (red). Implement until it passes (green). Backend changes get a test in `test/server/`. For front-end and content changes there is no unit-test harness, so the build (schema validation) plus the manual check below is the test.
* Run what you changed. Passing tests are not proof the feature works. Exercise it directly and keep the real output:
  * API: `pnpm preview:worker`, then `curl` the endpoint (send `Origin` matching the host and `Content-Type: application/json`).
  * UI: `pnpm build && node docs/scripts/serve-dist.mjs`, then drive the page with Playwright.
  * `pnpm dev` does not serve `/api`; do not use it to verify forms.
* Bug found while exercising the code: add a failing test for it, then fix.
* Add an entry under `## Unreleased` in `CHANGELOG.md` for each user-visible change. (The file does not exist yet; create it with that heading on first use.)
* Keep these pairs in sync in the same commit:
  * `src/content/schema.ts` and `.pages.yml`
  * `site` in `astro.config.mjs` and `SITE_URL` in `src/lib/seo.ts`
  * `wrangler.jsonc` and `worker-configuration.d.ts` (run `pnpm cf-typegen`)
  * A new page: pass `title`, `description` and `schemas` to the layout
  * A logo change: run `pnpm og` and commit the regenerated `public/og/*` and `apple-touch-icon.png`

## Behavior

* State assumptions before acting on them. If the request is ambiguous, ask. Do not pick an interpretation silently.
* Surface inconsistencies you find. When more than one approach is reasonable, present the tradeoffs. Push back when a simpler approach exists.
* Smallest change that meets the success criteria. No new abstraction, layer, option, or public API unless the task needs it.
* Remove dead code your change leaves behind.
* Do not change code or comments outside the task scope. Report them instead.
* No SQL outside `src/server/repositories/`; always prepared statements with `.bind()`.
* No unverified facts in JSON-LD (prices, dates, addresses). `sameAs` only when `socials[].href` is non-empty.
* Components never read the content JSON directly; go through `getSiteContent()`.

## Boundaries

* You edit: `src/`, `test/`, `scripts/`, `docs/`, `README.md`, `AGENTS.md` proposals (see below), and `CHANGELOG.md`.
* Read-only, never modify: `pnpm-lock.yaml` (only via `pnpm add/remove` after approval), `worker-configuration.d.ts` (generated), `dist/`, `.wrangler/`, existing files in `migrations/` (applied migrations are immutable; add a new numbered file instead), `.env*`, `.dev.vars*`, secrets of any kind.
* Ask before:
  * Dependency changes (`package.json`, lockfile) and `.node-version`.
  * Schema changes: any new migration, or changes to `src/content/schema.ts` (it is the contract Pages CMS and editors rely on).
  * Public contract changes: `/api/*` request/response shapes, error codes, endpoint paths; file names in `src/content/services/` (they are public URLs); canonical URLs.
  * Security surface: Turnstile, rate limiting, same-origin guard, CSP (`public/_headers`, `src/integrations/csp-headers.mjs`), `robots.txt`.
  * `wrangler.jsonc` (bindings, D1 id, rate-limit settings) and anything that touches deployment.
  * Copy changes in `src/content/*.json` beyond what the task states (editors own the wording).

## Git and pull requests

* Small commits, one logical change each.
* Keep PRs small.
* Do not open a PR, or mark one ready, until a human has reviewed the code.
* PR description: what changed, commands run with their output, what was not verified. A human reads and edits it before it goes out.

## Maintaining this file

* Humans own this file. Agents propose edits, humans approve them.
* When an agent repeats a mistake, add one rule here.
