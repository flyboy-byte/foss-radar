# FOSS Radar — Cloud (multi-user)

Public, multi-user version of FOSS Radar. Separate codebase from the root `client/`/`server/` app — that one stays local-first, single-user, untouched. This one adds accounts (email/password) and per-user data isolation, backed by Flask + SQLite instead of Express.

## Local development

Two processes, run together:

```bash
# Terminal 1 — Flask API (from cloud/server/)
cd cloud/server
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in SECRET_KEY at minimum
flask --app app:create_app run -p 8000

# Terminal 2 — Vite frontend, proxies /api to Flask on :8000 (from repo root)
npm run dev:cloud:client   # http://localhost:5001
```

## Production-equivalent run (for testing before real deployment)

```bash
npm run build:cloud:client        # builds cloud/dist/public

cd cloud/server
source venv/bin/activate
gunicorn --preload -w 3 -b 127.0.0.1:8000 wsgi:app
```

**`--preload` is required**, not optional. Without it, each gunicorn worker independently
imports `wsgi.py` and calls `db.create_all()` at boot — multiple workers racing to
`CREATE TABLE` at the same time crashes worker startup (`table already exists`).
`--preload` loads the app once in the master process before forking workers, so table
creation happens exactly once. Verified: without `--preload`, 3 workers reliably fail to
boot; with it, they boot clean and 10 concurrent writes across all 3 workers succeed with
no `database is locked` errors (SQLite WAL mode + `busy_timeout` handle the rest).

## Typecheck

```bash
npm run check:cloud   # from repo root — scoped to cloud/client only
```

## Auth

Registration collects both a `username` and an `email` (both unique). Login accepts
either as a single `identifier` field — `POST /api/auth/login` looks up
`User.username == identifier OR User.email == identifier`. Session cookies via
Flask-Login, `SESSION_COOKIE_SECURE=true` in production.

## Public community board

`/api/public/*` is a second, fully open project library — no auth on any route —
scoped to a single well-known shared account (`public_user.py`, resolved by a fixed
email so it survives a fresh `db.create_all()`, not by a hardcoded ID). Anyone can
add/edit/delete/sync entries with zero login. It reuses the exact same CRUD/stats logic
as the personal `/api/projects` routes (`routes/projects.py` and `routes/stats.py`
expose `user_id`-parameterized internal functions that both the personal and public
blueprints call) rather than duplicating it — one tested implementation, not two
drifting apart.

**The one thing that must never regress here**: a public route must never be able to
reach a personal user's project by ID. Every public handler resolves the shared
account's `user_id` and passes it into the same helpers personal routes use, which
filter by `user_id` — that's the actual isolation boundary. Verified with a live test:
attempting `GET`/`PATCH`/`DELETE` on a real personal project's ID through
`/api/public/projects/<id>` returns 404, not the project.

Logged-out visitors land on this board at `/` (split banner: public board pitch on the
left with an inline add form, personal-login pitch with a LOGIN button on the right) —
`client/src/pages/public/index.tsx`. Authenticated users see their personal dashboard
at `/` instead, same as always.

## Deployment status

Deployed and live behind a reverse proxy with TLS, running under systemd with
`gunicorn --preload` (see above for why `--preload` matters). Full public smoke test
passed against the real deployment: username+email registration, login via both
username and email, public board add/edit/delete/sync with zero auth, and the
personal/public isolation check — all verified live, not just locally.

Note: Flask serves the built frontend itself in this deployment (the reverse proxy here
forwards everything to the app rather than serving static files directly) — `app.py`
has a catch-all route (`serve_frontend`) that serves `dist/public` with an
`index.html` SPA fallback. Run `npm run build:cloud:client` before starting gunicorn in
any setup that follows this same pattern, or `/` will 404 even though `/api/*` works.

**Adding a column to an already-deployed database**: `db.create_all()` only creates
missing *tables*, not missing *columns* on existing tables. Add new columns manually —
e.g. `ALTER TABLE users ADD COLUMN username TEXT` plus a separate `CREATE UNIQUE INDEX`
if the column needs uniqueness, since SQLite's `ALTER TABLE ADD COLUMN` can't attach a
`UNIQUE` constraint directly. The deploy target's `sqlite3` CLI wasn't installed —
used Python's stdlib `sqlite3` module over SSH instead, which needs no extra install.

Deployment specifics (host details, ports, service names) are intentionally not recorded
in this public repo — see local operator notes for the exact host and resume steps.
