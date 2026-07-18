# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

FOSS Radar is a local-first, single-user dashboard for tracking and discovering open-source software. No accounts, no cloud sync, no auth layer — one Node process serves both the API and the frontend, backed by a single SQLite file (`fossradar.db` in the repo root). It optionally talks to the public GitHub REST API for discovery search and repo-stat syncing.

Treat this as a personal tool for one operator, not a multi-tenant app. Don't add auth, multi-user concepts, or cloud persistence unless explicitly asked.

**A separate multi-user version lives in `cloud/`** (Flask + SQLAlchemy + Flask-Login backend, a copy of `client/` extended with login/register pages). It's a distinct codebase reusing the frontend, not a mode of this app — see `cloud/README.md`. Don't conflate the two; changes here should not assume `cloud/` exists or vice versa unless a task explicitly touches both.

## Commands

```bash
npm run dev       # Express + Vite dev server (port 5000, Vite in middleware mode)
npm run check     # TypeScript typecheck (tsc, no emit) — run after any nontrivial change
npm run db:push   # Apply shared/schema.ts changes to the SQLite database (drizzle-kit push)
npm run build     # Build client (Vite) + bundle server (esbuild) into dist/
npm start         # Run the production build (NODE_ENV=production node dist/index.cjs)
```

There is no test runner configured in this repo (no `test` script, no test files) and no lint script — `npm run check` is the only automated gate. Verify behavior manually via `npm run dev` when touching runtime logic.

Production builds must be started from the repo root — `fossradar.db` and `dist/public` are resolved as relative paths.

`script/` holds Linux deployment helpers (`bootstrap-linux.sh`, `install-desktop-entry.sh`, `install-user-service.sh`, `install-system-service.sh`) alongside `build.ts` — these are optional install-time conveniences, not part of the dev loop.

### `cloud/` commands

These build/typecheck the `cloud/` frontend only, from the repo root — the Flask backend has its own venv/pip flow documented in `cloud/README.md`:

```bash
npm run dev:cloud:client    # Vite dev server for cloud/client (port 5001), proxies /api to Flask on :8000
npm run build:cloud:client  # builds cloud/dist/public
npm run check:cloud         # tsc -p cloud/tsconfig.json
```

## Architecture

**Single Express process serves everything.** `server/index.ts` is the entry point: it hand-rolls `.env` loading (no dotenv dependency), runs preflight checks (`server/runtime.ts` — Node version window `>=20 <25`, writable data dir), seeds the DB if empty (`server/seed.ts`), registers all API routes (`server/routes.ts`), then either mounts Vite in middleware mode (dev) or serves the static `dist/public` build (`server/static.ts`, production). Route registration happens before Vite's catch-all so `/api/*` always wins.

**Persistence boundary**: `server/routes.ts` never touches Drizzle directly — it goes through `server/storage.ts`'s `IStorage` interface (`DatabaseStorage` implementation, exported singleton `storage`). If you add a new persistence operation, add it to `IStorage` first.

**Schema is the single source of truth** (`shared/schema.ts`): Drizzle table definitions for `projects`, `discoverySearches`, `projectEvents` (the signals feed — one row per detected star jump / health-state change / new release), and a vestigial `users` table (kept only for storage-interface type compatibility — there's no auth flow using it). `insertProjectSchema`/`updateProjectSchema` are derived from the Drizzle table via `drizzle-zod`, with GitHub-sync fields (including `previousGithub*` snapshot columns and `githubLatestRelease`) and timestamps omitted since those are server-managed. This file is imported by both `server/` and `client/` (via the `@shared/*` path alias), so schema changes ripple across the stack — run `npm run check` and `npm run db:push` after editing it. Note: drizzle-kit's full-table-rebuild strategy (triggered by the enum-checked `category`/`status` columns) has a bug where it can generate an `INSERT ... SELECT` referencing columns that don't exist yet on the old table — if `db:push` errors with "no such column" on a fresh column addition, add the column manually via `sqlite3 ... ALTER TABLE ... ADD COLUMN` first, then re-run `db:push` to confirm no remaining diff.

**GitHub integration** (`server/github.ts`) is the only external dependency: repo lookup for syncing tracked projects' stars/forks/issues/license/last-commit, `fetchLatestRelease` for release-tag detection, and search for the Discover flow. Works unauthenticated but rate-limited hard; `GITHUB_TOKEN` env var raises the limit. Batch sync (`POST /api/monitor/all`) applies a small per-repo delay to stay under rate limits — this is on-demand, not a background job. `syncProject()` in `server/routes.ts` is the core sync logic: on every sync (after the first) it diffs the new GitHub snapshot against the stored one and emits `projectEvents` rows for star jumps, health-state transitions (active/slow/stale, computed from last-commit age), and new releases — surfaced on the dashboard as the Signals feed (`client/src/components/dashboard/SignalsFeed.tsx`, `GET /api/events`).

**Path aliases** (defined in both `tsconfig.json` and `vite.config.ts` — keep them in sync if you add more): `@/*` → `client/src/*`, `@shared/*` → `shared/*`.

**Client structure** (`client/src/`):
- `pages/dashboard/` — main library view: filters, stats, batch GitHub sync
- `pages/project/[id].tsx` — project detail: notes, rating, manual GitHub sync
- `pages/discover/` — GitHub search + import into library
- `pages/add/` — manual project creation
- `lib/api.ts` — the only place that calls the backend; all data fetching goes through TanStack Query
- `lib/data/projects.ts` — **legacy mock data, unused at runtime**; don't wire new code to it

**Build pipeline** (`script/build.ts`): Vite builds the client, then esbuild bundles the server to `dist/index.cjs` (CJS, minified). Most deps are kept external (loaded from `node_modules` at runtime) except a small allowlist bundled in to reduce `openat(2)` syscalls for faster cold starts — `better-sqlite3` is always external (native addon, can't be bundled). If you add a new lightweight server dependency and want it bundled for cold-start speed, add it to the `allowlist` array; the allowlist currently includes some packages not actually used by this app's `package.json` (carried over from a template) — that's expected drift, not a bug to fix incidentally.

## Product/UI Direction

The app has a deliberate dark, terminal-adjacent visual style: green primary accent, muted blue-gray surfaces, monospaced metadata over bold headings, "radar/signals/sync" vocabulary instead of generic CRUD copy. Preserve this direction in any UI work — a bright generic admin-dashboard look is a regression, not an improvement.

Domain vocabulary to keep consistent: project **status** is one of `Want to Try` / `Using` / `Archived`; default **categories** are `Linux Apps`, `Self-Hosted`, `Android Apps`, `Ham Radio`, `Utilities`, `Customization` (both are enums in `shared/schema.ts`, not free text — extend there if adding options).

## Known Repo Drift

- Some docs historically referenced PostgreSQL; the actual persistence is SQLite (`better-sqlite3` + Drizzle). Don't reintroduce Postgres-specific assumptions.
- `client/src/lib/data/projects.ts` is legacy mock data, unused at runtime.
- `package.json` and the esbuild `allowlist` in `script/build.ts` carry some unused/leftover entries from earlier scaffolding.
