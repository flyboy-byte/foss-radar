import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError, getPublicProjects, createPublicProject, deletePublicProject,
  monitorPublicAll, CATEGORIES,
} from "@/lib/api";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Radar, Plus, LogIn, RefreshCw, Users } from "lucide-react";

export default function PublicLanding() {
  const qc = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [category, setCategory] = useState("Utilities");

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["public-projects"],
    queryFn: () => getPublicProjects(),
  });

  const addMutation = useMutation({
    mutationFn: () => createPublicProject({
      name: name.trim(),
      url: url.trim(),
      githubUrl: githubUrl.trim() || undefined,
      category: category as any,
    }),
    onSuccess: (p) => {
      toast({ title: `"${p.name}" added to the public radar` });
      qc.invalidateQueries({ queryKey: ["public-projects"] });
      setName(""); setUrl(""); setGithubUrl(""); setShowAddForm(false);
    },
    onError: (err) => {
      const message = err instanceof ApiError ? err.message : "Failed to add project";
      toast({ title: message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePublicProject(id),
    onSuccess: () => {
      toast({ title: "Removed from the public radar" });
      qc.invalidateQueries({ queryKey: ["public-projects"] });
    },
    onError: () => toast({ title: "Failed to remove project", variant: "destructive" }),
  });

  const syncMutation = useMutation({
    mutationFn: monitorPublicAll,
    onSuccess: (data) => {
      const success = data.results.filter((r: any) => r.success).length;
      toast({ title: `Synced ${success}/${data.total} projects` });
      qc.invalidateQueries({ queryKey: ["public-projects"] });
    },
  });

  const isValid = name.trim().length > 0 && url.trim().length > 0;

  return (
    <div className="min-h-screen bg-background selection:bg-primary/30">
      <div className="pointer-events-none fixed inset-0 z-50 scanlines" />

      {/* Split banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 border-b border-white/5 relative z-10">
        <div className="p-8 md:p-12 flex flex-col justify-center gap-3 border-b md:border-b-0 md:border-r border-white/5 bg-secondary/10">
          <div className="flex items-center gap-2.5 text-primary font-heading font-bold text-lg">
            <Users className="w-5 h-5" />
            <span>Public FOSS Radar</span>
          </div>
          <p className="text-muted-foreground max-w-md">
            Add what you think other people should check out. No account needed — this board is open to everyone.
          </p>
          <Button
            className="w-fit bg-primary text-primary-foreground hover:bg-primary/90 mt-2"
            onClick={() => setShowAddForm((v) => !v)}
            data-testid="button-toggle-add"
          >
            <Plus className="w-4 h-4 mr-2" />
            {showAddForm ? "Cancel" : "Add a Project"}
          </Button>
        </div>

        <div className="p-8 md:p-12 flex flex-col justify-center gap-3">
          <div className="flex items-center gap-2.5 text-primary font-heading font-bold text-lg">
            <Radar className="w-5 h-5" />
            <span>FOSS Radar</span>
          </div>
          <p className="text-muted-foreground max-w-md">
            Your personal GitHub project tracker — private library, notes, ratings, and sync, just for you.
          </p>
          <div className="flex gap-3 mt-2">
            <Link href="/login">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90" data-testid="button-login">
                <LogIn className="w-4 h-4 mr-2" />
                LOGIN
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="outline" className="border-white/10" data-testid="button-register-link">
                Register
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <main className="relative z-10 p-6 md:p-8 max-w-6xl mx-auto space-y-6">
        {showAddForm && (
          <div className="glass-panel rounded-xl border-white/5 p-6 space-y-4">
            <h2 className="font-heading font-semibold">Add a project</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                className="bg-secondary/20 border-white/5 focus-visible:ring-primary/50 font-mono"
                placeholder="Project name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="input-public-name"
              />
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-secondary/20 border-white/5 font-mono text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-white/10">
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input
                className="bg-secondary/20 border-white/5 focus-visible:ring-primary/50 font-mono text-sm"
                placeholder="https://... (website)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                data-testid="input-public-url"
              />
              <Input
                className="bg-secondary/20 border-white/5 focus-visible:ring-primary/50 font-mono text-sm"
                placeholder="https://github.com/... (optional)"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                data-testid="input-public-github-url"
              />
            </div>
            <Button
              onClick={() => addMutation.mutate()}
              disabled={!isValid || addMutation.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="button-submit-public"
            >
              {addMutation.isPending ? "Adding..." : "Add to Public Radar"}
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-xl font-heading font-bold">Community Board</h2>
          <Button
            variant="outline"
            size="sm"
            className="border-white/10 bg-card/50 hover:bg-secondary/50 hover:text-primary text-muted-foreground"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${syncMutation.isPending ? "animate-spin" : ""}`} />
            Sync GitHub
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-56 rounded-lg glass-panel border-white/5 animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center glass-panel rounded-lg border-dashed">
            <Radar className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-heading font-medium">Nothing here yet</h3>
            <p className="text-muted-foreground mt-2 font-mono text-sm">Be the first to add something worth checking out.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                linkToDetail={false}
                onDelete={() => {
                  if (window.confirm(`Remove "${project.name}" from the public radar?`)) {
                    deleteMutation.mutate(project.id);
                  }
                }}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
