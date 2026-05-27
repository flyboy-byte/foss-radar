# FOSS Radar

## Overview

FOSS Radar is a local-first dashboard for tracking and discovering open-source software. It is not a multi-user SaaS app. It behaves more like a personal utility: one local database, one operator, one combined frontend/backend server.

The current implementation uses SQLite, not PostgreSQL.

## Core Stack

- Frontend: React 19, TypeScript, Vite, Wouter, TanStack Query
- Styling: Tailwind CSS v4, shadcn/ui, Lucide
- Backend: Express 5, TypeScript
- Persistence: Drizzle ORM on top of `better-sqlite3`
- External integration: GitHub REST API

## Actual Runtime Model

- `server/index.ts` loads `.env`, configures Express, seeds the DB on first boot, and serves the app
- `server/routes.ts` defines the full HTTP API
- `server/storage.ts` is the persistence boundary used by routes
- `server/github.ts` handles GitHub repo lookup and repository search
- `shared/schema.ts` defines both the Drizzle schema and the Zod-backed request shapes
- `client/src/lib/api.ts` is the client-side API wrapper
- `client/src/pages/*` contains the full user flow

The SQLite database file lives at `./fossradar.db`.

## Product Style

The app has a strong existing visual and product voice:

- dark "terminal chic" presentation
- green accent, muted panels, scanline overlay
- hacker-radio-radar vocabulary: signals, sync, discover, monitor
- personal knowledge base for software, not a team workflow tool

That style matters. Product changes should preserve the feeling that this is a private operator console for open-source exploration.

## Main User Flows

1. Browse and filter tracked projects on the dashboard
2. Open a project detail page and edit notes, status, rating, and setup notes
3. Sync GitHub metadata for one project or all GitHub-backed projects
4. Search GitHub for new software and import results into the library
5. Export the full library as JSON

## Current Commands

```bash
npm run dev
npm run check
npm run db:push
npm run build
npm start
bash script/bootstrap-linux.sh
bash script/install-user-service.sh
sudo bash script/install-system-service.sh <linux-user>
```

## Operational Notes

- No auth is implemented
- The app binds to `0.0.0.0`
- GitHub API usage is optional but much better with `GITHUB_TOKEN`
- The server and frontend are served from the same process
- Production runs depend on being started from the repo root so relative paths resolve correctly
- Node runtime policy: `>=20` and `<25`
- Optional `DATA_DIR` controls SQLite file location

## Important Repo Truths

- Old docs referenced PostgreSQL; that is no longer accurate
- `client/src/lib/data/projects.ts` is legacy mock data and is unused
- Some dependencies in `package.json` are leftover scaffolding and not part of the current runtime
- `npm run check` currently passes

## Near-Term Improvement Targets

- remove unused dependencies and template residue
- add tests around routes and storage behavior
- surface discovery history in the UI or remove the unused API path
- add duplicate protection when importing or manually adding projects
- improve project-detail editing for tags and alternatives
