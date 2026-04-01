import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProjects, getStats, monitorAll, CATEGORIES } from "@/lib/api";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Search, LayoutGrid, List, RefreshCw, Download, Star, Activity, Archive, Radar, Plus } from "lucide-react";
import { Link } from "wouter";
import type { Project } from "@shared/schema";

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const queryClient = useQueryClient();

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ["projects", searchQuery, selectedCategory, selectedStatus],
    queryFn: () => getProjects({
      q: searchQuery || undefined,
      category: selectedCategory,
      status: selectedStatus,
    }),
    staleTime: 30_000,
  });

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: getStats,
    staleTime: 60_000,
  });

  const monitorMutation = useMutation({
    mutationFn: monitorAll,
    onSuccess: (data) => {
      const success = data.results.filter(r => r.success).length;
      toast({ title: `Monitored ${success}/${data.total} projects`, description: "GitHub stats refreshed." });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: () => {
      toast({ title: "Monitoring failed", variant: "destructive" });
    },
  });

  return (
    <div className="flex h-screen bg-background overflow-hidden selection:bg-primary/30">
      <div className="pointer-events-none fixed inset-0 z-50 scanlines" />
      <Sidebar />

      <main className="flex-1 flex flex-col h-full relative z-10 overflow-y-auto">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center gap-4">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search projects, tags..."
              className="pl-9 bg-card/50 border-white/10 focus-visible:ring-primary/50 font-mono text-sm h-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search"
            />
          </div>

          <div className="hidden md:flex items-center gap-2 ml-auto">
            {stats && (
              <>
                <div className="text-xs font-mono flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/30 border border-white/5">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-muted-foreground">{stats.using} Active</span>
                </div>
                <div className="text-xs font-mono flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/30 border border-white/5">
                  <span className="w-2 h-2 rounded-full bg-orange-400" />
                  <span className="text-muted-foreground">{stats.wantToTry} Queued</span>
                </div>
              </>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="border-white/10 bg-card/50 hover:bg-secondary/50 hover:text-primary text-muted-foreground hidden md:flex"
            onClick={() => monitorMutation.mutate()}
            disabled={monitorMutation.isPending}
            data-testid="button-monitor-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${monitorMutation.isPending ? "animate-spin" : ""}`} />
            Sync GitHub
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="border-white/10 bg-card/50 text-muted-foreground hidden md:flex"
            asChild
          >
            <a href="/api/export" download>
              <Download className="w-3.5 h-3.5 mr-2" />
              Export
            </a>
          </Button>
        </header>

        <div className="flex-1 p-6 md:p-8 space-y-8">

          {/* Stats Row */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Total Projects", value: stats.total, icon: Radar, color: "text-primary" },
                { label: "Currently Using", value: stats.using, icon: Activity, color: "text-green-400" },
                { label: "Want to Try", value: stats.wantToTry, icon: Star, color: "text-orange-400" },
                { label: "Archived", value: stats.archived, icon: Archive, color: "text-muted-foreground" },
              ].map(item => (
                <div key={item.label} className="glass-panel rounded-lg p-4 border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{item.label}</span>
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <div className="text-3xl font-heading font-bold">{item.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Filters + Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-2xl font-heading font-bold">My Library</h1>
            <div className="flex flex-wrap items-center gap-3">
              <Select value={selectedStatus} onValueChange={setSelectedStatus} data-testid="select-status">
                <SelectTrigger className="w-[140px] bg-card border-white/10 font-mono text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-white/10">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Using">Using</SelectItem>
                  <SelectItem value="Want to Try">Want to Try</SelectItem>
                  <SelectItem value="Archived">Archived</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedCategory} onValueChange={setSelectedCategory} data-testid="select-category">
                <SelectTrigger className="w-[160px] bg-card border-white/10 font-mono text-xs">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-white/10">
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>

              <div className="flex items-center bg-card border border-white/10 rounded-md p-1">
                <Button variant="ghost" size="sm" className={`h-7 w-8 p-0 ${viewMode === 'grid' ? 'bg-secondary/50 text-primary' : 'text-muted-foreground'}`} onClick={() => setViewMode('grid')}>
                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className={`h-7 w-8 p-0 ${viewMode === 'list' ? 'bg-secondary/50 text-primary' : 'text-muted-foreground'}`} onClick={() => setViewMode('list')}>
                  <List className="w-4 h-4" />
                </Button>
              </div>

              <Link href="/add">
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" data-testid="button-add-project">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Project
                </Button>
              </Link>
            </div>
          </div>

          {/* Grid */}
          {loadingProjects ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-56 rounded-lg glass-panel border-white/5 animate-pulse" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center glass-panel rounded-lg border-dashed">
              <Radar className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-xl font-heading font-medium">No signals detected</h3>
              <p className="text-muted-foreground mt-2 font-mono text-sm">Try adjusting your filters or search query.</p>
              <Button variant="outline" className="mt-6 border-white/10" onClick={() => {
                setSearchQuery(""); setSelectedCategory("all"); setSelectedStatus("all");
              }}>
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className={`grid gap-5 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
              {projects.map(project => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
