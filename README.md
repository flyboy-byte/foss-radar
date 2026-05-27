# FOSS Radar

Personal dashboard for discovering, tracking, and monitoring open-source software.

FOSS Radar is a local-first single-user app for people who keep long mental lists of tools they want to try, projects they already use, and repositories they want to keep an eye on. It runs as one Node process, stores data in a local SQLite file, and optionally talks to the public GitHub API for discovery and live repo stats.

![FOSS Radar dashboard](docs/screenshot.png)

## What It Does

- Track projects in a personal library with categories, status, tags, notes, setup notes, and ratings
- Discover new projects from GitHub by keyword, language, topic, and minimum stars
- Import discovered repos directly into the local library
- Sync GitHub metadata for tracked repos: stars, forks, open issues, license, description, and last commit date
- Export the full library as JSON from `/api/export`
- Seed a starter library on first launch so the app is immediately usable

## Starter Library

A fresh database currently seeds with 8 starter projects:

- Jellyfin
- Termux
- KDE Plasma
- Hyprland
- Syncthing
- Nextcloud
- KDE Connect
- Kodi

## Product Shape

The app is opinionated in a useful way:

- `local-first`: no accounts, no cloud sync, no auth flow
- `single-user`: one local database file, one user profile implied by the install
- `single-process`: API and frontend are served together
- `GitHub-aware`: discovery and health signals come from public repository data
- `Linux-friendly`: includes scripts for a desktop launcher and systemd-style deployment

## Tech Stack

| Layer | Implementation |
| --- | --- |
| Frontend | React 19 + TypeScript + Vite + Wouter |
| Data fetching | TanStack Query |
| UI | Tailwind CSS v4 + shadcn/ui + Lucide icons |
| Backend | Express 5 + TypeScript |
| Database | SQLite via `better-sqlite3` + Drizzle ORM |
| External API | GitHub REST API |

## Runtime Architecture

```text
client/
  src/
    pages/
      dashboard/        Main library view, filters, stats, batch GitHub sync
      project/[id].tsx  Project detail, notes, rating, manual GitHub sync
      discover/         GitHub search and import flow
      add/              Manual project creation
    lib/api.ts          Client-side API wrapper

server/
  index.ts              Express entry point, .env loading, seed trigger
  routes.ts             All /api routes
  storage.ts            Drizzle-backed persistence layer
  github.ts             GitHub repo fetch + search helpers
  db.ts                 SQLite connection
  seed.ts               First-run seed data

shared/
  schema.ts             Drizzle schema and Zod request schemas
```

The database file is `fossradar.db` in the project root. On first boot the server seeds the library if the `projects` table is empty.

## UI Direction

The current product style is deliberate and consistent:

- dark, terminal-adjacent interface
- green primary accent with muted blue-gray surfaces
- monospaced metadata layered over bold heading typography
- "radar" / "signals" / "sync" language instead of generic CRUD copy
- local tool for tinkerers, not a SaaS dashboard

If you extend the UI, keep that direction intact. A bright generic admin theme would be a regression.

## Project Statuses

- `Want to Try`
- `Using`
- `Archived`

## Default Categories

- `Linux Apps`
- `Self-Hosted`
- `Android Apps`
- `Ham Radio`
- `Utilities`
- `Customization`

## Environment

Copy the example file:

```bash
cp .env.example .env
```

Available variables:

```env
# Optional, but strongly recommended for discovery and sync-heavy usage
GITHUB_TOKEN=

# HTTP port for the combined API + frontend server
PORT=5000

# Optional app URL used by helper scripts
APP_URL=http://127.0.0.1:5000

# Optional data directory for fossradar.db (defaults to repo root)
DATA_DIR=

# production for built runs, development for tsx/Vite dev
NODE_ENV=production
```

`GITHUB_TOKEN` is optional. Without it, GitHub's unauthenticated rate limit is much lower.

## Local Development

Requirements:

- Node.js 20+
- npm

Install dependencies:

```bash
npm install
```

Quick bootstrap (Linux):

```bash
bash script/bootstrap-linux.sh
```

Create the SQLite tables:

```bash
npm run db:push
```

Start development mode:

```bash
npm run dev
```

The dev server runs the Express app on port `5000` and mounts Vite in middleware mode. Open `http://localhost:5000`.

## Production Build

Build the client and bundled server:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

Important: run the built app from the repository root so the SQLite database path resolves to `./fossradar.db` and static assets resolve from `dist/public`.

## Useful Commands

```bash
npm run dev       # Express + Vite development server
npm run check     # TypeScript typecheck
npm run db:push   # Apply schema changes to the SQLite database
npm run build     # Build frontend and bundled backend into dist/
npm start         # Run the production build
bash script/bootstrap-linux.sh           # Linux setup helper
bash script/install-user-service.sh      # systemd user service install
sudo bash script/install-system-service.sh <linux-user>  # systemd system service install
```

## API Overview

Project library:

- `GET /api/projects`
- `GET /api/projects/:id`
- `POST /api/projects`
- `PATCH /api/projects/:id`
- `DELETE /api/projects/:id`

GitHub monitoring:

- `POST /api/projects/:id/monitor`
- `POST /api/monitor/all`

Discovery:

- `GET /api/discover`
- `GET /api/discover/history`
- `POST /api/discover/import`

Stats and export:

- `GET /api/stats`
- `GET /api/export`

## Linux Desktop Launcher

Install a launcher into `~/.local/share/applications`:

```bash
bash script/install-desktop-entry.sh
# or override URL:
bash script/install-desktop-entry.sh http://127.0.0.1:5000
```

Remove it:

```bash
bash script/remove-desktop-entry.sh
```

The launcher opens `http://127.0.0.1:5000` via `xdg-open`. The app still needs to be running.

## Deployment Notes

This project is best treated as a personal service running on one machine or inside a private LAN.

- The server binds to `0.0.0.0`
- There is no auth layer
- Data is stored in a local SQLite file
- GitHub sync happens on demand, not in a background job
- Batch sync applies a small per-repo delay to reduce rate-limit pressure

If you expose it beyond your own machine or trusted network, add an actual auth and access-control layer first.

## Known Repo Drift

The codebase still contains a small amount of template residue from older iterations:

- some docs previously referred to PostgreSQL
- `client/src/lib/data/projects.ts` is legacy mock data and is not used at runtime
- `package.json` still has some unused dependencies from earlier scaffolding

The source of truth for the current app is the runtime code under `client/`, `server/`, and `shared/`.
