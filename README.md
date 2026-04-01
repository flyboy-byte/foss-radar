# 📡 FOSS Radar

**A personal dashboard for discovering, tracking, and monitoring open-source software.**

No accounts, no cloud, no tracking. Runs as a local service on your Linux machine. Built for tinkerers, Linux hobbyists, ham radio operators, and anyone who likes keeping a list of cool FOSS tools.

---

## Screenshot

![FOSS Radar Dashboard](docs/screenshot.png)

---

## Features

- Track projects with status tags: `Using` · `Want to Try` · `Archived`
- Live GitHub stats — stars, forks, open issues, license, last commit
- Discovery engine — search GitHub by keyword, language, topic, and star count
- One-click import from search results into your library
- Star ratings, personal notes, setup tips per project
- Categories: Linux Apps · Self-Hosted · Android Apps · Ham Radio · Utilities · Customization
- JSON export anytime via `/api/export`

---

## Tech Stack

| | |
|---|---|
| Frontend | React + TypeScript + Tailwind CSS + shadcn/ui |
| Backend | Express.js + TypeScript |
| Database | PostgreSQL (via Drizzle ORM) |
| GitHub API | Public REST API — optional token for higher rate limits |

---

## Running Locally on Linux

FOSS Radar is a Node.js + PostgreSQL app. It serves both the API and the built frontend from a single process on port 5000.

All frontend API calls are same-origin — no CORS configuration needed.

### 1. Install Node.js (v20+)

```bash
# Arch
sudo pacman -S nodejs npm

# Debian/Ubuntu
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Fedora
sudo dnf install nodejs
```

### 2. Install PostgreSQL

```bash
# Arch
sudo pacman -S postgresql
sudo -u postgres initdb -D /var/lib/postgres/data
sudo systemctl enable --now postgresql

# Debian/Ubuntu
sudo apt install -y postgresql
sudo systemctl enable --now postgresql

# Fedora
sudo dnf install postgresql-server
sudo postgresql-setup --initdb
sudo systemctl enable --now postgresql
```

Create the database:

```bash
sudo -u postgres psql << 'EOF'
CREATE USER fossradar WITH PASSWORD 'changeme';
CREATE DATABASE fossradar OWNER fossradar;
GRANT ALL PRIVILEGES ON DATABASE fossradar TO fossradar;
EOF
```

### 3. Clone and Install

```bash
git clone https://github.com/flyboy-byte/foss-radar.git
cd foss-radar
npm install
```

### 4. Configure Environment

```bash
cp .env.example .env
nano .env
```

Minimum required in `.env`:

```env
DATABASE_URL=postgresql://fossradar:changeme@localhost:5432/fossradar
NODE_ENV=production
PORT=5000
```

Optionally add a GitHub token for higher API rate limits (see below).

### 5. Build and Start

```bash
npm run db:push   # creates database tables
npm run build     # compiles frontend + bundles server
node dist/index.cjs
```

Open `http://localhost:5000` in your browser. The app seeds your library with starter projects on first launch.

---

## Running as a systemd Service

Run on boot, restart on crash.

```bash
sudo nano /etc/systemd/system/foss-radar.service
```

```ini
[Unit]
Description=FOSS Radar
After=network.target postgresql.service

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/home/YOUR_USERNAME/foss-radar
ExecStart=/usr/bin/node /home/YOUR_USERNAME/foss-radar/dist/index.cjs
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
EnvironmentFile=/home/YOUR_USERNAME/foss-radar/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now foss-radar
sudo systemctl status foss-radar
```

View logs:

```bash
journalctl -u foss-radar -f
```

---

## Firewall Notes

The app listens on port 5000 on all interfaces (`0.0.0.0`). For a laptop/desktop this is usually fine since there's no incoming traffic by default. If you're running a firewall:

**ufw (Ubuntu/Debian):**
```bash
sudo ufw allow from 192.168.1.0/24 to any port 5000   # LAN only
# or just: sudo ufw allow 5000  (all interfaces)
```

**firewalld (Fedora/Arch with firewalld):**
```bash
sudo firewall-cmd --add-port=5000/tcp --permanent
sudo firewall-cmd --reload
```

**nftables / iptables (manual):**
```bash
sudo iptables -A INPUT -p tcp --dport 5000 -j ACCEPT
```

If you only need it on your local machine (not other devices on your network), no firewall changes are needed — just open `http://localhost:5000`.

---

## Linux Desktop Launcher

Adds FOSS Radar to your app menu so you can launch it without opening a terminal.

```bash
bash script/install-desktop-entry.sh
```

This creates `~/.local/share/applications/foss-radar.desktop`. It uses `xdg-open` so it works across GNOME, KDE, XFCE, and anything else that respects XDG — no browser hardcoded. Whether it opens a new tab or window is up to your browser's defaults.

The app still needs to be running (`node dist/index.cjs` or the systemd service) for the launcher to do anything useful.

To remove it:

```bash
bash script/remove-desktop-entry.sh
```

To change the name or URL, edit the variables at the top of `script/install-desktop-entry.sh`.

---

## Updating

```bash
cd foss-radar
git pull
npm install
npm run build
npm run db:push   # only needed if schema changed
sudo systemctl restart foss-radar
```

---

## GitHub Token (Optional)

Without a token the GitHub API allows 60 requests/hour — enough for occasional use. With a token it's 5,000/hour.

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Generate a new classic token — no scopes needed (public repos only)
3. Add to `.env`: `GITHUB_TOKEN=ghp_...`
4. Restart the server

---

## License

MIT
