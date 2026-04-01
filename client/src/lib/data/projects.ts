export type ProjectCategory = 'Linux Apps' | 'Self-Hosted' | 'Android Apps' | 'Ham Radio' | 'Utilities' | 'Customization';
export type ProjectStatus = 'Want to Try' | 'Using' | 'Archived';

export interface Project {
  id: string;
  name: string;
  description: string;
  category: ProjectCategory;
  status: ProjectStatus;
  url: string;
  githubUrl?: string;
  tags: string[];
  rating?: number; // 1-5
  notes?: string;
  setupNotes: string[];
  alternatives: string[]; // IDs of other projects
  lastUpdated: string;
}

export const mockProjects: Project[] = [
  {
    id: "p1",
    name: "Jellyfin",
    description: "The Free Software Media System. It puts you in control of managing and streaming your media.",
    category: "Self-Hosted",
    status: "Using",
    url: "https://jellyfin.org/",
    githubUrl: "https://github.com/jellyfin/jellyfin",
    tags: ["media", "streaming", "video"],
    rating: 5,
    notes: "Best replacement for Plex. Completely free and open source.",
    setupNotes: ["Runs great on Docker", "Hardware acceleration needed for transcoding 4K"],
    alternatives: ["p10"], // Plex/Emby but those aren't purely FOSS in this list
    lastUpdated: "2024-05-12"
  },
  {
    id: "p2",
    name: "Termux",
    description: "A terminal emulator and Linux environment app for Android.",
    category: "Android Apps",
    status: "Using",
    url: "https://termux.dev/en/",
    githubUrl: "https://github.com/termux/termux-app",
    tags: ["terminal", "linux", "dev"],
    rating: 5,
    notes: "Essential for any Android power user.",
    setupNotes: ["Install from F-Droid, not Play Store", "pkg update && pkg upgrade first thing"],
    alternatives: [],
    lastUpdated: "2024-01-20"
  },
  {
    id: "p3",
    name: "WSJT-X",
    description: "Software for weak-signal radio communication.",
    category: "Ham Radio",
    status: "Want to Try",
    url: "https://wsjt.sourceforge.io/wsjtx.html",
    tags: ["ft8", "digital", "vhf"],
    notes: "Need to set up the audio interface first before trying this.",
    setupNotes: ["Requires accurate time sync on PC", "Check audio levels carefully"],
    alternatives: ["p4"],
    lastUpdated: "2023-11-05"
  },
  {
    id: "p4",
    name: "JTDX",
    description: "Alternative to WSJT-X with modified decoding algorithms.",
    category: "Ham Radio",
    status: "Want to Try",
    url: "https://sourceforge.net/projects/jtdx/",
    tags: ["ft8", "digital", "hf"],
    notes: "Some say it decodes better on crowded bands.",
    setupNotes: [],
    alternatives: ["p3"],
    lastUpdated: "2023-12-10"
  },
  {
    id: "p5",
    name: "KDE Plasma",
    description: "A graphical workspaces environment created by KDE primarily for Linux systems.",
    category: "Customization",
    status: "Using",
    url: "https://kde.org/plasma-desktop/",
    tags: ["desktop", "gui", "wayland"],
    rating: 4,
    notes: "Extremely customizable. Currently using with Wayland on Arch.",
    setupNotes: ["Wayland session is mostly stable now", "Use kvantum for advanced themes"],
    alternatives: ["p6"],
    lastUpdated: "2024-06-01"
  },
  {
    id: "p6",
    name: "Hyprland",
    description: "A dynamic tiling Wayland compositor that doesn't sacrifice on its looks.",
    category: "Customization",
    status: "Want to Try",
    url: "https://hyprland.org/",
    githubUrl: "https://github.com/hyprwm/Hyprland",
    tags: ["tiling", "wayland", "compositor"],
    notes: "Looks amazing but might take time to configure perfectly.",
    setupNotes: ["Needs custom config file", "Waybar is a good companion"],
    alternatives: ["p5"],
    lastUpdated: "2024-05-28"
  },
  {
    id: "p7",
    name: "Syncthing",
    description: "A continuous file synchronization program.",
    category: "Utilities",
    status: "Using",
    url: "https://syncthing.net/",
    githubUrl: "https://github.com/syncthing/syncthing",
    tags: ["sync", "files", "p2p"],
    rating: 5,
    notes: "Replaced Dropbox for me. Peer to peer is the way to go.",
    setupNotes: ["Set up on phone and desktop", "Battery optimization needs to be disabled on Android"],
    alternatives: ["p8"],
    lastUpdated: "2024-04-15"
  },
  {
    id: "p8",
    name: "Nextcloud",
    description: "A suite of client-server software for creating and using file hosting services.",
    category: "Self-Hosted",
    status: "Archived",
    url: "https://nextcloud.com/",
    githubUrl: "https://github.com/nextcloud/server",
    tags: ["sync", "cloud", "files"],
    rating: 3,
    notes: "Too heavy for just file sync. Switched to Syncthing.",
    setupNotes: ["Requires database setup (MariaDB/PostgreSQL)", "PHP tuning is crucial for performance"],
    alternatives: ["p7"],
    lastUpdated: "2023-08-22"
  },
  {
    id: "p9",
    name: "KDE Connect",
    description: "A tool that allows devices to communicate with each other.",
    category: "Utilities",
    status: "Using",
    url: "https://kdeconnect.kde.org/",
    tags: ["sync", "clipboard", "remote"],
    rating: 5,
    notes: "Shared clipboard and file sending is magic.",
    setupNotes: ["Open ports 1714-1764 (TCP/UDP) in firewall"],
    alternatives: [],
    lastUpdated: "2024-05-30"
  },
  {
    id: "p10",
    name: "Kodi",
    description: "A free and open source media player application.",
    category: "Self-Hosted",
    status: "Archived",
    url: "https://kodi.tv/",
    tags: ["media", "player"],
    rating: 4,
    notes: "Used to use it on a Raspberry Pi, moved to Jellyfin for centralized server.",
    setupNotes: [],
    alternatives: ["p1"],
    lastUpdated: "2022-11-15"
  }
];

export const getProjects = () => mockProjects;
export const getProjectById = (id: string) => mockProjects.find(p => p.id === id);
export const getCategories = (): ProjectCategory[] => Array.from(new Set(mockProjects.map(p => p.category)));
export const getTags = (): string[] => Array.from(new Set(mockProjects.flatMap(p => p.tags)));
