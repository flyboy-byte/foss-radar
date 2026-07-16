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

## Deployment status

Currently mid-deployment to its production host. The Flask service is built, installed,
and running under systemd with `gunicorn --preload` (see above for why `--preload`
matters). Final step — wiring up the reverse proxy and TLS in front of it — is blocked
pending a manual configuration step outside this repo's scope.

Deployment specifics (host details, ports, service names) are intentionally not recorded
in this public repo — see local operator notes for the exact resume steps.
