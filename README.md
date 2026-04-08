# 📡 FOSS Radar

**A personal dashboard for discovering, tracking, and monitoring open-source software.**

No accounts. No cloud. No tracking. Runs as a local service on your Linux machine. Built for tinkerers, Linux hobbyists, ham radio operators, and anyone who likes keeping tabs on cool FOSS tools.

---

## Screenshot

![FOSS Radar Dashboard](docs/screenshot.png)

---

## Features

- Track projects with status tags: `Using` · `Want to Try` · `Archived`
- **Project Health Indicator** — color-coded dot on every card showing how recently each project was updated (green = active, red = abandoned)
- Live GitHub stats — stars, forks, open issues, license, last commit
- Discovery engine — search GitHub by keyword, language, topic, and star count
- One-click import from search results into your library
- Star ratings, personal notes, and setup tips per project
- Categories: Linux Apps · Self-Hosted · Android Apps · Ham Radio · Utilities · Customization
- JSON export anytime via `/api/export`

---

## Tech Stack

| | |
|---|---|
| Frontend | React + TypeScript + Tailwind CSS + shadcn/ui |
| Backend | Express.js + TypeScript |
| Database | SQLite (via Drizzle ORM — zero config, single file) |
| GitHub API | Public REST API — optional token for higher rate limits |

---

## Running Locally on Linux

FOSS Radar is a Node.js app. It serves both the API and the frontend from a single process on port 5000. The database is a local SQLite file (`fossradar.db`) — no database server required.

### 1. Install Node.js (v20+)

```bash
# Arch
sudo pacman -S nodejs npm

# Debian/Ubuntu
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Fedora
sudo dnf install nodejs npm
```

Verify: `node --version` should show v20 or higher.

### 2. Clone and Install

```bash
git clone https://github.com/flyboy-byte/foss-radar.git
cd foss-radar
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

The defaults in `.env.example` work out of the box. The only thing worth adding is a GitHub token for higher API rate limits (see [GitHub Token](#github-token-optional) below).

### 4. Initialize the Database and Start

```bash
npm run db:push   # creates the fossradar.db SQLite file
npm run build     # compiles the frontend and bundles the server
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
Description=FOSS Radar — personal FOSS tracking dashboard
After=network.target

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

> **Note:** Replace `YOUR_USERNAME` with your actual Linux username in both `User=` and the paths.

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

## Security Notes

> **Local use only.** FOSS Radar has no authentication. Do not expose port 5000 to the internet — it is designed to be used on your local machine or LAN only.

- The `.env` file contains your GitHub token (if set). It is listed in `.gitignore` and will never be committed.
- The `fossradar.db` database file is also excluded from git — your personal ratings and notes stay on your machine.
- If you run this on a home server accessible to other LAN devices, consider restricting access with your firewall (see below).

---

## Firewall Notes

The app listens on port 5000 on all interfaces (`0.0.0.0`). For a personal laptop this is fine. If you want to restrict who can reach it:

**ufw (Ubuntu/Debian):**
```bash
sudo ufw allow from 192.168.1.0/24 to any port 5000   # LAN only
```

**firewalld (Fedora/Arch):**
```bash
sudo firewall-cmd --add-port=5000/tcp --permanent
sudo firewall-cmd --reload
```

**nftables / iptables:**
```bash
sudo iptables -A INPUT -p tcp --dport 5000 -j ACCEPT
```

If you only need it on your local machine (not other LAN devices), no firewall changes are needed — just open `http://localhost:5000`.

---

## Linux Desktop Launcher

Adds FOSS Radar to your app menu so you can launch it without opening a terminal.

```bash
bash script/install-desktop-entry.sh
```

This creates `~/.local/share/applications/foss-radar.desktop`. It uses `xdg-open` so it works across GNOME, KDE, XFCE, and anything else that respects XDG.

The app still needs to be running (`node dist/index.cjs` or the systemd service) for the launcher to do anything useful.

To remove it:

```bash
bash script/remove-desktop-entry.sh
```

---

## Updating

```bash
cd foss-radar
git pull
npm install
npm run db:push   # only needed if the schema changed
npm run build
sudo systemctl restart foss-radar
```

---

## GitHub Token (Optional)

Without a token the GitHub API allows 60 requests/hour — enough for occasional use. With a token it's 5,000/hour.

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Generate a new **classic token** — no scopes needed (public repos only)
3. Add to `.env`: `GITHUB_TOKEN=ghp_...`
4. Restart the server

---

## License

MIT
