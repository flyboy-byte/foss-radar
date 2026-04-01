# FOSS Radar

A personal hobby dashboard for discovering, tracking, and monitoring open-source software. Local-first, no login, fully self-contained.

## Tech Stack

- **Frontend**: React + TypeScript, Wouter routing, TanStack Query, Tailwind v4, shadcn/ui
- **Backend**: Express.js + TypeScript (tsx)
- **Database**: PostgreSQL (Replit built-in) via Drizzle ORM
- **GitHub API**: Public REST API for live monitoring and discovery

## Architecture

```
client/src/
  pages/
    dashboard/index.tsx   — Main library view with stats + filtering
    project/[id].tsx      — Project detail, editing, GitHub stats
    discover/index.tsx    — GitHub search + import
    add/index.tsx         — Manual project add form
  components/
    dashboard/
      Sidebar.tsx         — Navigation + live stats sidebar
      ProjectCard.tsx     — Project card component
  lib/
    api.ts                — All API calls to the backend
    queryClient.ts        — TanStack Query client

server/
  index.ts               — Entry point + seed trigger
  routes.ts              — All /api/* endpoints
  storage.ts             — DatabaseStorage (Drizzle-backed CRUD)
  db.ts                  — Drizzle + pg pool
  github.ts              — GitHub API client (fetch repo info + search)
  seed.ts                — Seeds 10 initial projects on first run

shared/
  schema.ts              — Drizzle schema: projects, discoverySearches
```

## Features

- **Library**: Browse, filter, search all tracked FOSS projects by category/status/tag
- **Detail View**: Personal notes, star rating, status management, setup notes
- **GitHub Monitoring**: Sync live stars/forks/issues/license/last commit per project or all at once
- **Discovery**: Search GitHub by keyword, language, min stars, topic tag — import directly
- **Add manually**: Form to add any project to the radar
- **Export**: Download full library as JSON at `/api/export`
- **Stats Dashboard**: Overview counts, category breakdown, avg rating

## Project Categories

Linux Apps · Self-Hosted · Android Apps · Ham Radio · Utilities · Customization

## Project Status Options

- **Want to Try** — on the queue
- **Using** — actively using
- **Archived** — used before, no longer active

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (auto-set by Replit)
- `GITHUB_TOKEN` (optional) — Raises GitHub API rate limit from 60 to 5000 req/hr

## Dev

```bash
npm run dev       # Start Express + Vite
npm run db:push   # Sync schema changes to DB
npm run build     # Build for production
```
