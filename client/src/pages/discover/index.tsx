import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { discoverProjects, importProject, CATEGORIES } from "@/lib/api";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Search, Star, GitFork, ExternalLink, Github, Plus, Compass, Zap } from "lucide-react";

const PRESET_SEARCHES = [
  { label: "Self-hosted", query: "self-hosted", topic: "self-hosted" },
  { label: "Ham Radio", query: "ham radio amateur radio software", topic: "amateur-radio" },
  { label: "Wayland", query: "wayland compositor linux desktop", topic: "wayland" },
  { label: "Android FOSS", query: "android open source privacy", language: "Kotlin" },
  { label: "Linux CLI tools", query: "linux command line utility terminal", language: "Rust" },
  { label: "Network tools", query: "network monitoring self-hosted", topic: "networking" },
];

function formatNumber(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = Date.now();
  const diff = now - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export default function Discover() {
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState("");
  const [minStars, setMinStars] = useState("");
  const [topic, setTopic] = useState("");
  const [sort, setSort] = useState("stars");
  const [importCategory, setImportCategory] = useState<Record<string, string>>({});
  const [hasSearched, setHasSearched] = useState(false);
  const [searchParams, setSearchParams] = useState<any>(null);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["discover", searchParams],
    queryFn: () => discoverProjects(searchParams!),
    enabled: !!searchParams,
  });

  const importMutation = useMutation({
    mutationFn: (item: any) => importProject({
      name: item.name,
      description: item.description,
      htmlUrl: item.htmlUrl,
      stars: item.stars,
      forks: item.forks,
      language: item.language,
      license: item.license,
      topics: item.topics,
      category: importCategory[item.fullName] || "Utilities",
    }),
    onSuccess: (p) => {
      toast({ title: `Added "${p.name}" to your library` });
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (err: any) => toast({ title: "Import failed", description: err.message, variant: "destructive" }),
  });

  const runSearch = (overrides?: any) => {
    const params = {
      query: overrides?.query ?? query,
      language: overrides?.language ?? (language || undefined),
      minStars: overrides?.minStars ?? (minStars ? parseInt(minStars) : undefined),
      topic: overrides?.topic ?? (topic || undefined),
      sort,
    };
    setSearchParams(params);
    setHasSearched(true);
  };

  const applyPreset = (preset: typeof PRESET_SEARCHES[0]) => {
    setQuery(preset.query);
    if ('topic' in preset && preset.topic) setTopic(preset.topic);
    if ('language' in preset && preset.language) setLanguage(preset.language);
    runSearch({ query: preset.query, topic: (preset as any).topic, language: (preset as any).language });
  };

  const results = data?.results ?? [];

  return (
    <div className="flex h-screen bg-background overflow-hidden selection:bg-primary/30">
      <div className="pointer-events-none fixed inset-0 z-50 scanlines" />
      <Sidebar />

      <main className="flex-1 flex flex-col h-full relative z-10 overflow-y-auto">
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-white/5 px-6 py-4">
          <div className="flex items-center gap-2 mb-1">
            <Compass className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-heading font-bold">Discover Projects</h1>
          </div>
          <p className="text-muted-foreground font-mono text-sm">Search GitHub for new FOSS tools to add to your radar</p>
        </header>

        <div className="flex-1 p-6 md:p-8 space-y-6">

          {/* Search Panel */}
          <div className="glass-panel rounded-xl border-white/5 p-6 space-y-4">
            <div className="flex gap-3 flex-col sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9 bg-secondary/20 border-white/10 font-mono text-sm focus-visible:ring-primary/50"
                  placeholder="e.g. ham radio ft8, self-hosted media server..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') runSearch(); }}
                  data-testid="input-discover-query"
                />
              </div>
              <Button
                className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
                onClick={() => runSearch()}
                disabled={isLoading || !query.trim()}
                data-testid="button-search-github"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                Search GitHub
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-mono text-muted-foreground mb-1 block">Language</label>
                <Input
                  className="bg-secondary/20 border-white/5 font-mono text-xs h-8"
                  placeholder="e.g. Python, Rust"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-mono text-muted-foreground mb-1 block">Min Stars</label>
                <Input
                  type="number"
                  className="bg-secondary/20 border-white/5 font-mono text-xs h-8"
                  placeholder="e.g. 100"
                  value={minStars}
                  onChange={(e) => setMinStars(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-mono text-muted-foreground mb-1 block">Topic Tag</label>
                <Input
                  className="bg-secondary/20 border-white/5 font-mono text-xs h-8"
                  placeholder="e.g. self-hosted"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-mono text-muted-foreground mb-1 block">Sort by</label>
                <Select value={sort} onValueChange={setSort}>
                  <SelectTrigger className="h-8 bg-secondary/20 border-white/5 font-mono text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-white/10">
                    <SelectItem value="stars">Stars</SelectItem>
                    <SelectItem value="updated">Recently Updated</SelectItem>
                    <SelectItem value="help-wanted-issues">Help Wanted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-mono text-muted-foreground/60 flex items-center gap-1">
                <Zap className="w-3 h-3" /> Quick:
              </span>
              {PRESET_SEARCHES.map(p => (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p)}
                  className="text-xs font-mono px-2.5 py-1 rounded-full bg-secondary/30 border border-white/5 hover:border-primary/30 hover:text-primary transition-colors"
                  data-testid={`preset-${p.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Results */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="h-52 rounded-lg glass-panel border-white/5 animate-pulse" />
              ))}
            </div>
          )}

          {error && (
            <div className="glass-panel rounded-xl border-red-500/20 p-6 text-center">
              <p className="text-red-400 font-mono text-sm">GitHub search failed. Check rate limits or try again.</p>
            </div>
          )}

          {!isLoading && hasSearched && results.length === 0 && (
            <div className="glass-panel rounded-xl border-white/5 p-12 text-center">
              <Compass className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
              <p className="font-heading font-medium">No results found</p>
              <p className="text-muted-foreground font-mono text-sm mt-1">Try different keywords or fewer filters.</p>
            </div>
          )}

          {!isLoading && results.length > 0 && (
            <>
              <p className="text-xs font-mono text-muted-foreground">{results.length} repositories found</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {results.map((item: any) => (
                  <div key={item.fullName} className="glass-panel rounded-xl border-white/5 hover:border-primary/30 transition-all duration-200 flex flex-col p-5 gap-3 group">
                    {/* Title */}
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-heading font-bold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {item.name}
                        </h3>
                        <a href={item.htmlUrl} target="_blank" rel="noopener noreferrer"
                          className="text-muted-foreground/50 hover:text-muted-foreground shrink-0 mt-0.5">
                          <Github className="w-4 h-4" />
                        </a>
                      </div>
                      <p className="text-muted-foreground text-xs font-mono mb-0.5">{item.fullName}</p>
                      <p className="text-sm text-muted-foreground/80 line-clamp-2 leading-relaxed">
                        {item.description || "No description."}
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground/60">
                      <span className="flex items-center gap-1"><Star className="w-3 h-3" /> {formatNumber(item.stars)}</span>
                      <span className="flex items-center gap-1"><GitFork className="w-3 h-3" /> {formatNumber(item.forks)}</span>
                      {item.language && <span className="text-primary/60">{item.language}</span>}
                      {item.license && <span>{item.license}</span>}
                      <span className="ml-auto">{formatDate(item.pushedAt)}</span>
                    </div>

                    {/* Topics */}
                    {item.topics?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.topics.slice(0, 4).map((t: string) => (
                          <span key={t} className="text-[10px] font-mono text-muted-foreground bg-secondary/40 px-1.5 py-0.5 rounded border border-white/5">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Import */}
                    <div className="flex gap-2 mt-auto pt-2 border-t border-white/5">
                      <Select
                        value={importCategory[item.fullName] || "Utilities"}
                        onValueChange={(v) => setImportCategory(prev => ({ ...prev, [item.fullName]: v }))}
                      >
                        <SelectTrigger className="flex-1 h-8 bg-secondary/20 border-white/5 font-mono text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-white/10">
                          {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        className="h-8 bg-primary/10 text-primary border border-primary/30 hover:bg-primary hover:text-primary-foreground transition-colors"
                        onClick={() => importMutation.mutate(item)}
                        disabled={importMutation.isPending}
                        data-testid={`button-import-${item.name}`}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
