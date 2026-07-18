import { Link, useLocation } from "wouter";
import { Radar, Terminal, Compass, Plus, Download, LogOut } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getStats, getMe, logout } from "@/lib/api";

const navItems = [
  { href: "/", icon: Terminal, label: "My Library" },
  { href: "/explore", icon: Compass, label: "Discover" },
  { href: "/add", icon: Plus, label: "Add Project" },
];

export function Sidebar() {
  const [location, navigate] = useLocation();
  const qc = useQueryClient();
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: getStats, staleTime: 60_000 });
  const { data: user } = useQuery({ queryKey: ["me"], queryFn: getMe, retry: false });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      qc.setQueryData(["me"], null);
      qc.clear();
      navigate("/login");
    },
  });

  return (
    <>
      {/* Mobile logout: the aside below is desktop-only (hidden md:flex), so
          without this, small screens have no logout access at all. Fixed
          positioning keeps it out of the parent flex layout entirely. */}
      {user && (
        <button
          className="md:hidden fixed top-3 right-3 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-white/10 bg-card/90 backdrop-blur-xl text-muted-foreground hover:text-red-400 hover:border-red-400/30 transition-colors text-xs font-mono shadow-lg"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          data-testid="button-logout-mobile"
        >
          <LogOut className="w-3.5 h-3.5" />
          {logoutMutation.isPending ? "Logging out..." : "Log out"}
        </button>
      )}

      <aside className="w-60 border-r border-white/5 bg-card/50 backdrop-blur-sm h-screen flex-col hidden md:flex sticky top-0 shrink-0">
      <div className="p-5 pb-4">
        <Link href="/">
          <div className="flex items-center gap-2.5 text-primary font-heading font-bold text-lg cursor-pointer group">
            <Radar className="w-5 h-5 group-hover:animate-spin transition-all" style={{ animationDuration: '3s' }} />
            <span>FOSS Radar</span>
          </div>
        </Link>
        <p className="text-muted-foreground/40 text-[10px] mt-1 font-mono">cloud · multi-user</p>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        <div className="text-[10px] font-mono text-muted-foreground/50 mb-3 px-2 uppercase tracking-widest">Navigation</div>

        {navItems.map(({ href, icon: Icon, label }) => {
          const active = location === href || (href !== '/' && location.startsWith(href));
          return (
            <Link key={href} href={href}>
              <div className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-all group
                ${active
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'hover:bg-secondary/50 text-muted-foreground hover:text-foreground border border-transparent'
                }`}
                data-testid={`nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'} transition-colors`} />
                <span className="text-sm font-medium">{label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5 space-y-3">
        {stats && (
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Using", value: stats.using, color: "text-primary" },
              { label: "Queued", value: stats.wantToTry, color: "text-orange-400" },
              { label: "Saved", value: stats.total, color: "text-muted-foreground" },
            ].map(item => (
              <div key={item.label} className="bg-secondary/30 rounded-md p-1.5 border border-white/5">
                <div className={`text-lg font-heading font-bold ${item.color}`}>{item.value}</div>
                <div className="text-[9px] font-mono text-muted-foreground/50 uppercase">{item.label}</div>
              </div>
            ))}
          </div>
        )}
        {stats && (
          <div className="rounded-md border border-white/5 bg-secondary/20 p-2.5 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground/70">
              <span>Need first sync</span>
              <span className="text-cyan-400">{stats.neverMonitored}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground/70">
              <span>Stale repos</span>
              <span className="text-red-400">{stats.staleRepos}</span>
            </div>
          </div>
        )}

        <a href="/api/export" download className="flex items-center gap-2 px-3 py-1.5 rounded-md text-muted-foreground/60 hover:text-muted-foreground hover:bg-secondary/30 transition-colors text-xs font-mono">
          <Download className="w-3.5 h-3.5" />
          Export JSON
        </a>

        <div className="flex items-center gap-2 px-1 text-[10px] font-mono text-muted-foreground/40">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />
          <span>GitHub monitoring active</span>
        </div>

        {user && (
          <div className="pt-2 border-t border-white/5 space-y-2">
            <span className="block text-[10px] font-mono text-muted-foreground/50 truncate" title={user.username || user.email || undefined}>
              {user.username || user.email || "Signed in"}
            </span>
            <button
              className="flex items-center justify-center gap-2 w-full px-3 py-1.5 rounded-md border border-white/5 bg-secondary/20 text-muted-foreground hover:text-red-400 hover:border-red-400/30 hover:bg-red-400/5 transition-colors text-xs font-mono"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              data-testid="button-logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              {logoutMutation.isPending ? "Logging out..." : "Log out"}
            </button>
          </div>
        )}
      </div>
    </aside>
    </>
  );
}
