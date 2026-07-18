from extensions import db
from models import Project

# Same starter library as the local app's server/seed.ts, given to every new user on signup.
STARTER_PROJECTS = [
    {
        "name": "Jellyfin",
        "description": "The Free Software Media System. It puts you in control of managing and streaming your media.",
        "category": "Self-Hosted",
        "status": "Using",
        "url": "https://jellyfin.org/",
        "github_url": "https://github.com/jellyfin/jellyfin",
        "tags": ["media", "streaming", "video"],
        "rating": 5,
        "notes": "Best replacement for Plex. Completely free and open source.",
        "setup_notes": ["Runs great on Docker", "Hardware acceleration needed for transcoding 4K"],
    },
    {
        "name": "Termux",
        "description": "A terminal emulator and Linux environment app for Android.",
        "category": "Android Apps",
        "status": "Using",
        "url": "https://termux.dev/en/",
        "github_url": "https://github.com/termux/termux-app",
        "tags": ["terminal", "linux", "dev"],
        "rating": 5,
        "notes": "Essential for any Android power user.",
        "setup_notes": ["Install from F-Droid, not Play Store", "pkg update && pkg upgrade first thing"],
    },
    {
        "name": "KDE Plasma",
        "description": "A graphical workspaces environment created by KDE primarily for Linux systems.",
        "category": "Customization",
        "status": "Using",
        "url": "https://kde.org/plasma-desktop/",
        "github_url": "https://github.com/KDE/plasma-desktop",
        "tags": ["desktop", "gui", "wayland"],
        "rating": 4,
        "notes": "Extremely customizable. Currently using with Wayland on Arch.",
        "setup_notes": ["Wayland session is mostly stable now", "Use kvantum for advanced themes"],
    },
    {
        "name": "Hyprland",
        "description": "A dynamic tiling Wayland compositor that doesn't sacrifice on its looks.",
        "category": "Customization",
        "status": "Want to Try",
        "url": "https://hyprland.org/",
        "github_url": "https://github.com/hyprwm/Hyprland",
        "tags": ["tiling", "wayland", "compositor"],
        "notes": "Looks amazing but might take time to configure perfectly.",
        "setup_notes": ["Needs custom config file", "Waybar is a good companion"],
    },
    {
        "name": "Syncthing",
        "description": "A continuous file synchronization program — peer-to-peer, no cloud middleman.",
        "category": "Utilities",
        "status": "Using",
        "url": "https://syncthing.net/",
        "github_url": "https://github.com/syncthing/syncthing",
        "tags": ["sync", "files", "p2p"],
        "rating": 5,
        "notes": "Replaced Dropbox for me. Peer to peer is the way to go.",
        "setup_notes": ["Set up on phone and desktop", "Battery optimization needs to be disabled on Android"],
    },
    {
        "name": "Nextcloud",
        "description": "A suite of client-server software for creating and using file hosting services.",
        "category": "Self-Hosted",
        "status": "Archived",
        "url": "https://nextcloud.com/",
        "github_url": "https://github.com/nextcloud/server",
        "tags": ["sync", "cloud", "files"],
        "rating": 3,
        "notes": "Too heavy for just file sync. Switched to Syncthing.",
        "setup_notes": ["Requires database setup (MariaDB/PostgreSQL)", "PHP tuning is crucial for performance"],
    },
    {
        "name": "KDE Connect",
        "description": "A tool that allows devices to communicate with each other — clipboard sync, file sending, and more.",
        "category": "Utilities",
        "status": "Using",
        "url": "https://kdeconnect.kde.org/",
        "github_url": "https://github.com/KDE/kdeconnect-kde",
        "tags": ["sync", "clipboard", "remote"],
        "rating": 5,
        "notes": "Shared clipboard and file sending is magic.",
        "setup_notes": ["Open ports 1714-1764 (TCP/UDP) in firewall"],
    },
    {
        "name": "Kodi",
        "description": "A free and open source media player application.",
        "category": "Self-Hosted",
        "status": "Archived",
        "url": "https://kodi.tv/",
        "github_url": "https://github.com/xbmc/xbmc",
        "tags": ["media", "player"],
        "rating": 4,
        "notes": "Used to use it on a Raspberry Pi, moved to Jellyfin for centralized server.",
        "setup_notes": [],
    },
]


# A new cloud signup gets a small taste of the library, not the full local-app
# starter set — Jellyfin, Syncthing, and Hyprland span three categories and two
# statuses (Using / Want to Try) so the empty states and filters are visibly not empty.
NEW_USER_STARTER_NAMES = {"Jellyfin", "Syncthing", "Hyprland"}
NEW_USER_STARTER_PROJECTS = [p for p in STARTER_PROJECTS if p["name"] in NEW_USER_STARTER_NAMES]


def seed_user_library(user_id: str):
    for data in NEW_USER_STARTER_PROJECTS:
        db.session.add(Project(
            user_id=user_id,
            name=data["name"],
            description=data["description"],
            category=data["category"],
            status=data["status"],
            url=data["url"],
            github_url=data.get("github_url"),
            tags=data.get("tags", []),
            rating=data.get("rating"),
            notes=data.get("notes"),
            setup_notes=data.get("setup_notes", []),
            alternatives=[],
            is_seeded=True,
        ))
    db.session.commit()
