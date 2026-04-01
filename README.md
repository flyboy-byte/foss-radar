# 📡 FOSS Radar

**A personal hobby dashboard for discovering, tracking, and monitoring open-source software.**

FOSS Radar is a self-hostable full-stack web app built for tinkerers, Linux enthusiasts, ham radio operators, and anyone who likes keeping tabs on cool open-source tools. No accounts, no cloud, no tracking — just your personal radar for the open-source world.

> *"think open source interesting thing. and not work or school related"*

---

## ✨ Features

- **Personal Library** — Track projects with status labels: `Using`, `Want to Try`, `Archived`
- **Live GitHub Monitoring** — Sync stars, forks, open issues, license, and last commit date
- **Discovery Engine** — Search GitHub directly by keyword, language, topic tag, and minimum stars
- **One-Click Import** — Add any GitHub search result straight to your library
- **Star Ratings & Notes** — Rate projects 1–5 stars and keep personal observations
- **Setup Notes** — Log implementation tips like `easy on Arch`, `needs port 1714 open`, `use Docker`
- **Category Filters** — Linux Apps · Self-Hosted · Android Apps · Ham Radio · Utilities · Customization
- **JSON Export** — Download your full library at any time from `/api/export`
- **Seeded Library** — Ships with 10 hand-picked hobby projects to get you started

---

## 🖥️ Screenshot

![FOSS Radar Dashboard](docs/screenshot.png)

> *A dark, terminal-chic dashboard built with Space Grotesk + JetBrains Mono*

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS v4, shadcn/ui |
| Routing | Wouter |
| State | TanStack Query v5 |
| Backend | Express.js + TypeScript |
| Database | PostgreSQL (via Drizzle ORM) |
| GitHub API | Public REST API (optional token for higher rate limits) |

---

## 🚀 Self-Hosting on Linux

This guide covers deploying FOSS Radar on a Linux server (Ubuntu/Debian or Arch-based). It uses Node.js, PostgreSQL, and optionally Nginx as a reverse proxy.

### Prerequisites

- A Linux server (VPS, home server, or Raspberry Pi 4+)
- Root or sudo access
- Domain name (optional, but recommended for Nginx setup)
- Ports 3000 and 5432 accessible internally

---

### 1. Install Node.js (v20+)

**Ubuntu / Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Should print v20.x.x
```

**Arch Linux:**
```bash
sudo pacman -S nodejs npm
```

---

### 2. Install PostgreSQL

**Ubuntu / Debian:**
```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql
```

**Arch Linux:**
```bash
sudo pacman -S postgresql
sudo -u postgres initdb -D /var/lib/postgres/data
sudo systemctl enable --now postgresql
```

**Create the database and user:**
```bash
sudo -u postgres psql << EOF
CREATE USER fossradar WITH PASSWORD 'changeme_strong_password';
CREATE DATABASE fossradar OWNER fossradar;
GRANT ALL PRIVILEGES ON DATABASE fossradar TO fossradar;
EOF
```

---

### 3. Clone the Repository

```bash
git clone https://github.com/flyboy-byte/foss-radar.git
cd foss-radar
```

---

### 4. Install Dependencies

```bash
npm install
```

---

### 5. Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env   # or create it manually
nano .env
```

Add the following:

```env
# Required: PostgreSQL connection string
DATABASE_URL=postgresql://fossradar:changeme_strong_password@localhost:5432/fossradar

# Optional: GitHub Personal Access Token
# Without this, GitHub API is limited to 60 requests/hour.
# With it: 5,000 requests/hour.
# Get one at: https://github.com/settings/tokens
# Only needs the public_repo scope (read-only is fine for monitoring).
GITHUB_TOKEN=ghp_your_token_here

# Server port (default: 5000)
PORT=5000

# Set to production when deploying
NODE_ENV=production
```

---

### 6. Push the Database Schema

```bash
npm run db:push
```

This creates all the required tables (projects, discovery_searches) and runs the initial seed with 10 starter projects.

---

### 7. Build the Frontend

```bash
npm run build
```

This compiles the React app into `dist/public/` and bundles the Express server into `dist/index.cjs`.

---

### 8. Run the Server

**Test it first:**
```bash
node dist/index.cjs
# Should print: serving on port 5000
```

Open `http://your-server-ip:5000` in a browser to verify it works.

---

### 9. Set Up a systemd Service (Run on Boot)

Create a service file:

```bash
sudo nano /etc/systemd/system/foss-radar.service
```

Paste the following (adjust paths and user as needed):

```ini
[Unit]
Description=FOSS Radar — Personal OSS Dashboard
After=network.target postgresql.service

[Service]
Type=simple
User=youruser
WorkingDirectory=/home/youruser/foss-radar
ExecStart=/usr/bin/node /home/youruser/foss-radar/dist/index.cjs
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=foss-radar
Environment=NODE_ENV=production
EnvironmentFile=/home/youruser/foss-radar/.env

[Install]
WantedBy=multi-user.target
```

Enable and start it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable foss-radar
sudo systemctl start foss-radar
sudo systemctl status foss-radar
```

---

### 10. Set Up Nginx Reverse Proxy (Optional but Recommended)

Install Nginx:

```bash
# Ubuntu/Debian
sudo apt install -y nginx

# Arch
sudo pacman -S nginx
```

Create a config:

```bash
sudo nano /etc/nginx/sites-available/foss-radar
```

```nginx
server {
    listen 80;
    server_name your-domain.com;   # or your server IP

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/foss-radar /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

### 11. Add HTTPS with Let's Encrypt (Optional)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

Certbot will automatically configure HTTPS and set up auto-renewal.

---

### Updating

When new code is available:

```bash
cd foss-radar
git pull
npm install
npm run build
npm run db:push   # only if schema changed
sudo systemctl restart foss-radar
```

---

## 🔧 GitHub Token Setup (for Monitoring)

To use the **Sync GitHub** feature without hitting rate limits:

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Click **"Generate new token (classic)"**
3. Name it `foss-radar`, check **`public_repo`** under `repo`
4. Copy the token and add it to your `.env`:
   ```
   GITHUB_TOKEN=ghp_your_token_here
   ```
5. Restart the server

Without a token: 60 API requests/hour (enough for occasional monitoring)
With a token: 5,000 requests/hour (comfortable for syncing your whole library)

---

## 📦 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List all projects (supports `?q=`, `?category=`, `?status=`, `?tag=`) |
| POST | `/api/projects` | Add a new project |
| PATCH | `/api/projects/:id` | Update a project (notes, rating, status, etc.) |
| DELETE | `/api/projects/:id` | Remove a project |
| POST | `/api/projects/:id/monitor` | Sync GitHub stats for one project |
| POST | `/api/monitor/all` | Sync GitHub stats for all projects |
| GET | `/api/discover?query=...` | Search GitHub for new projects |
| POST | `/api/discover/import` | Import a discovered project |
| GET | `/api/stats` | Dashboard statistics |
| GET | `/api/export` | Download full library as JSON |

---

## 🗂️ Project Structure

```
foss-radar/
├── client/               # React frontend (Vite)
│   ├── src/
│   │   ├── pages/        # Dashboard, Project Detail, Discover, Add
│   │   ├── components/   # ProjectCard, Sidebar, shadcn/ui
│   │   └── lib/          # API client, query config
├── server/               # Express backend
│   ├── routes.ts         # All API routes
│   ├── storage.ts        # Database CRUD layer
│   ├── github.ts         # GitHub API client
│   ├── seed.ts           # Initial project data
│   └── db.ts             # Drizzle + PostgreSQL connection
├── shared/
│   └── schema.ts         # Shared Drizzle schema + Zod types
└── dist/                 # Production build output
```

---

## 📋 Seeded Projects

FOSS Radar ships with these 10 starter projects:

| Project | Category | Status |
|---------|----------|--------|
| Jellyfin | Self-Hosted | Using |
| Termux | Android Apps | Using |
| Syncthing | Utilities | Using |
| KDE Connect | Utilities | Using |
| KDE Plasma | Customization | Using |
| Hyprland | Customization | Want to Try |
| WSJT-X | Ham Radio | Want to Try |
| JTDX | Ham Radio | Want to Try |
| Nextcloud | Self-Hosted | Archived |
| Kodi | Self-Hosted | Archived |

---

## 📄 License

MIT — do whatever you want with it.

---

*Built with Replit · Designed for hobbyists, tinkerers, and open-source enthusiasts*
