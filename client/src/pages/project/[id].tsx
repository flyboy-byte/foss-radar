import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProject, updateProject, deleteProject, monitorProject, CATEGORIES } from "@/lib/api";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft, ExternalLink, Github, Star, Tag, ListChecks,
  Network, TerminalSquare, RefreshCw, Trash2, GitFork, AlertCircle,
  Clock
} from "lucide-react";
import type { Project } from "@shared/schema";

function StatusBadge({ status }: { status: Project['status'] }) {
  const cls = status === 'Want to Try' ? 'status-want' :
              status === 'Using' ? 'status-using' : 'status-archived';
  const dot = status === 'Want to Try' ? 'bg-orange-400 animate-pulse' :
               status === 'Using' ? 'bg-primary' : 'bg-muted-foreground';
  return (
    <Badge variant="outline" className={`${cls} font-mono text-sm`}>
      <span className={`w-2 h-2 rounded-full ${dot} mr-2 inline-block`} />
      {status}
    </Badge>
  );
}

function formatDate(date: string | Date | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function formatNumber(n: number | null | undefined) {
  if (n == null) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function AlternativesList({ ids }: { ids: string[] }) {
  const { data: allProjects } = useQuery({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then(r => r.json()),
  });
  if (!allProjects) return null;
  const matched = ids
    .map((id: string) => allProjects.find((p: { id: string; name: string }) => p.id === id))
    .filter(Boolean);
  if (matched.length === 0) return (
    <div className="p-4 text-center">
      <p className="text-muted-foreground font-mono text-xs italic">No alternatives tracked.</p>
    </div>
  );
  return (
    <div className="divide-y divide-white/5">
      {matched.map((p: { id: string; name: string }) => (
        <Link key={p.id} href={`/project/${p.id}`}>
          <div className="p-4 hover:bg-secondary/30 cursor-pointer transition-colors">
            <div className="font-mono text-xs text-primary">{p.name}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function ProjectDetail() {
  const params = useParams();
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", params.id],
    queryFn: () => getProject(params.id!),
    enabled: !!params.id,
  });

  const [notes, setNotes] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [setupNoteInput, setSetupNoteInput] = useState("");

  const displayNotes = notes !== undefined ? notes : (project?.notes ?? "");
  const displayStatus = status !== undefined ? status : (project?.status ?? "");
  const displayRating = rating !== undefined ? rating : (project?.rating ?? 0);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Project>) => updateProject(project!.id, data as any),
    onSuccess: () => {
      toast({ title: "Project updated" });
      qc.invalidateQueries({ queryKey: ["project", params.id] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: () => toast({ title: "Update failed", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteProject(project!.id),
    onSuccess: () => {
      toast({ title: "Project removed" });
      navigate("/");
    },
    onError: () => toast({ title: "Delete failed", variant: "destructive" }),
  });

  const monitorMutation = useMutation({
    mutationFn: () => monitorProject(project!.id),
    onSuccess: ({ githubInfo }) => {
      toast({ title: "GitHub data refreshed", description: `${githubInfo.stars} stars, last push ${formatDate(githubInfo.pushedAt)}` });
      qc.invalidateQueries({ queryKey: ["project", params.id] });
    },
    onError: (err: any) => toast({ title: "Monitor failed", description: err.message, variant: "destructive" }),
  });

  const saveNotes = () => {
    const updates: any = {};
    if (notes !== undefined) updates.notes = notes;
    if (status !== undefined) updates.status = status;
    if (rating !== undefined) updates.rating = rating;
    updateMutation.mutate(updates);
  };

  const addSetupNote = () => {
    if (!setupNoteInput.trim() || !project) return;
    const newNotes = [...project.setupNotes, setupNoteInput.trim()];
    updateMutation.mutate({ setupNotes: newNotes });
    setSetupNoteInput("");
  };

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-12 h-12 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="flex h-screen bg-background overflow-hidden selection:bg-primary/30">
      <div className="pointer-events-none fixed inset-0 z-50 scanlines" />
      <Sidebar />

      <main className="flex-1 flex flex-col h-full relative z-10 overflow-y-auto">
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground hover:text-foreground hover:bg-secondary/50">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
            </Link>
            <div className="text-sm font-mono text-muted-foreground flex items-center gap-2 hidden sm:flex">
              <span className="text-primary/30">/</span> {project.category}
              <span className="text-primary/30">/</span> {project.name}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {project.githubUrl && (
              <Button variant="outline" size="sm"
                className="border-white/10 bg-card text-muted-foreground hover:text-primary"
                onClick={() => monitorMutation.mutate()}
                disabled={monitorMutation.isPending}
                data-testid="button-monitor-project"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-2 ${monitorMutation.isPending ? 'animate-spin' : ''}`} />
                Sync GitHub
              </Button>
            )}
            <Button variant="outline" size="sm"
              className="border-red-500/20 bg-card text-red-400 hover:bg-red-500/10"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              data-testid="button-delete-project"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </header>

        <div className="flex-1 p-6 md:p-8 max-w-5xl w-full mx-auto space-y-8">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <StatusBadge status={project.status as Project['status']} />
                <Badge variant="outline" className="bg-secondary/30 border-white/10 text-muted-foreground font-mono">
                  <Tag className="w-3 h-3 mr-1.5" />{project.category}
                </Badge>
              </div>
              <h1 className="text-4xl font-heading font-bold tracking-tight">{project.name}</h1>
              <p className="text-lg text-muted-foreground mt-3 max-w-2xl leading-relaxed">{project.description}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {project.githubUrl && (
                <Button variant="outline" className="border-white/10 bg-card hover:bg-secondary" asChild>
                  <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                    <Github className="w-4 h-4 mr-2" /> Source Code
                  </a>
                </Button>
              )}
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                <a href={project.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" /> Website
                </a>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Main Column */}
            <div className="md:col-span-2 space-y-6">

              {/* GitHub Live Stats */}
              {project.githubUrl && (
                <Card className="glass-panel border-white/5">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Github className="w-4 h-4 text-primary" />
                      <span className="font-heading font-semibold">GitHub Stats</span>
                      {project.lastMonitored && (
                        <span className="ml-auto text-xs font-mono text-muted-foreground/50 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          synced {formatDate(project.lastMonitored)}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                      {[
                        { label: "Stars", value: formatNumber(project.githubStars), icon: Star },
                        { label: "Forks", value: formatNumber(project.githubForks), icon: GitFork },
                        { label: "Issues", value: formatNumber(project.githubOpenIssues), icon: AlertCircle },
                        { label: "License", value: project.githubLicense ?? "—", icon: Tag },
                      ].map(item => (
                        <div key={item.label} className="bg-secondary/30 rounded-lg p-3 border border-white/5">
                          <item.icon className="w-4 h-4 text-primary/60 mx-auto mb-1" />
                          <div className="text-lg font-heading font-bold">{item.value}</div>
                          <div className="text-xs font-mono text-muted-foreground">{item.label}</div>
                        </div>
                      ))}
                    </div>
                    {project.githubLastCommit && (
                      <p className="text-xs font-mono text-muted-foreground/60 mt-3">
                        Last commit: {formatDate(project.githubLastCommit)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Setup Notes */}
              <Card className="glass-panel border-l-4 border-l-primary/60 border-white/5">
                <CardHeader>
                  <CardTitle className="font-heading text-lg flex items-center gap-2">
                    <TerminalSquare className="w-5 h-5 text-primary" />
                    Setup / Implementation Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {project.setupNotes.length > 0 ? (
                    <ul className="space-y-2 font-mono text-sm">
                      {project.setupNotes.map((note, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <span className="text-primary mt-0.5">❯</span>
                          <span className="text-muted-foreground">{note}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground/50 font-mono text-sm italic">No setup notes yet.</p>
                  )}
                  <div className="flex gap-2">
                    <input
                      className="flex-1 bg-secondary/20 border border-white/5 rounded-md px-3 py-1.5 text-sm font-mono placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/50"
                      placeholder='e.g. "easy on Arch", "self-hosted", "lightweight"'
                      value={setupNoteInput}
                      onChange={(e) => setSetupNoteInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') addSetupNote(); }}
                      data-testid="input-setup-note"
                    />
                    <Button size="sm" variant="outline" className="border-white/10 hover:bg-secondary/50"
                      onClick={addSetupNote} data-testid="button-add-setup-note">
                      Add
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Personal Notes */}
              <Card className="glass-panel border-white/5">
                <CardHeader>
                  <CardTitle className="font-heading text-lg flex items-center gap-2">
                    <ListChecks className="w-5 h-5 text-primary" />
                    Personal Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    className="min-h-[120px] bg-secondary/20 border-white/5 focus-visible:ring-primary/50 font-mono text-sm resize-y"
                    placeholder="Add observations, opinions, or anything useful..."
                    value={displayNotes}
                    onChange={(e) => setNotes(e.target.value)}
                    data-testid="textarea-notes"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Sidebar Column */}
            <div className="space-y-6">

              {/* Quick Actions */}
              <Card className="glass-panel border-white/5">
                <CardHeader>
                  <CardTitle className="font-heading text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-xs font-mono text-muted-foreground mb-1.5 block uppercase tracking-wider">Status</label>
                    <Select value={displayStatus} onValueChange={setStatus} data-testid="select-project-status">
                      <SelectTrigger className="bg-secondary/20 border-white/5 font-mono text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-white/10">
                        <SelectItem value="Want to Try">Want to Try</SelectItem>
                        <SelectItem value="Using">Using</SelectItem>
                        <SelectItem value="Archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-mono text-muted-foreground mb-1.5 block uppercase tracking-wider">Rating</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(n => (
                        <button key={n}
                          className="p-1 rounded hover:scale-110 transition-transform"
                          onClick={() => setRating(n === displayRating ? 0 : n)}
                          data-testid={`button-star-${n}`}
                        >
                          <Star className={`w-5 h-5 ${n <= displayRating ? 'fill-primary text-primary' : 'text-muted'}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={saveNotes}
                    disabled={updateMutation.isPending}
                    data-testid="button-save-changes"
                  >
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </CardContent>
              </Card>

              {/* Tags */}
              <Card className="glass-panel border-white/5">
                <CardHeader>
                  <CardTitle className="font-heading text-base flex items-center gap-2">
                    <Tag className="w-4 h-4 text-primary" /> Tags
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="bg-secondary/50 border-white/5 font-mono text-xs">
                        #{tag}
                      </Badge>
                    ))}
                    {project.tags.length === 0 && (
                      <p className="text-xs font-mono text-muted-foreground/50 italic">No tags</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Alternatives */}
              <Card className="glass-panel border-white/5">
                <CardHeader>
                  <CardTitle className="font-heading text-base flex items-center gap-2">
                    <Network className="w-4 h-4 text-primary" /> See Also
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {project.alternatives && project.alternatives.length > 0 ? (
                    <AlternativesList ids={project.alternatives} />
                  ) : (
                    <div className="p-4 text-center">
                      <p className="text-muted-foreground font-mono text-xs italic">No alternatives tracked.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
