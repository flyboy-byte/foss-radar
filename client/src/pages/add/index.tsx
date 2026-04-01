import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createProject, CATEGORIES } from "@/lib/api";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Plus } from "lucide-react";
import { Link } from "wouter";

export default function AddProject() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [category, setCategory] = useState("Utilities");
  const [status, setStatus] = useState("Want to Try");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: () => createProject({
      name: name.trim(),
      description: description.trim(),
      url: url.trim(),
      githubUrl: githubUrl.trim() || undefined,
      category: category as any,
      status: status as any,
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
      notes: notes.trim() || undefined,
      setupNotes: [],
      alternatives: [],
      isSeeded: false,
    }),
    onSuccess: (p) => {
      toast({ title: `"${p.name}" added to your radar` });
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      navigate(`/project/${p.id}`);
    },
    onError: () => toast({ title: "Failed to add project", variant: "destructive" }),
  });

  const isValid = name.trim().length > 0 && url.trim().length > 0;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <div className="pointer-events-none fixed inset-0 z-50 scanlines" />
      <Sidebar />

      <main className="flex-1 flex flex-col h-full relative z-10 overflow-y-auto">
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center">
          <Link href="/">
            <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground hover:text-foreground hover:bg-secondary/50">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          </Link>
          <span className="ml-4 text-sm font-mono text-muted-foreground">Add Project to Radar</span>
        </header>

        <div className="flex-1 p-6 md:p-8 max-w-2xl w-full mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-heading font-bold">New Project</h1>
            <p className="text-muted-foreground font-mono text-sm mt-1">Manually add an open-source project to track.</p>
          </div>

          <div className="glass-panel rounded-xl border-white/5 p-6 space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Project Name *</label>
              <Input
                className="bg-secondary/20 border-white/5 focus-visible:ring-primary/50 font-mono"
                placeholder="e.g. Jellyfin"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="input-project-name"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Description</label>
              <Textarea
                className="bg-secondary/20 border-white/5 focus-visible:ring-primary/50 font-mono text-sm resize-none"
                placeholder="What does it do?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                data-testid="textarea-description"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Website URL *</label>
              <Input
                className="bg-secondary/20 border-white/5 focus-visible:ring-primary/50 font-mono text-sm"
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                data-testid="input-url"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">GitHub URL (for monitoring)</label>
              <Input
                className="bg-secondary/20 border-white/5 focus-visible:ring-primary/50 font-mono text-sm"
                placeholder="https://github.com/..."
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                data-testid="input-github-url"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Category</label>
                <Select value={category} onValueChange={setCategory} data-testid="select-category">
                  <SelectTrigger className="bg-secondary/20 border-white/5 font-mono text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-white/10">
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Status</label>
                <Select value={status} onValueChange={setStatus} data-testid="select-status">
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
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Tags (comma separated)</label>
              <Input
                className="bg-secondary/20 border-white/5 focus-visible:ring-primary/50 font-mono text-sm"
                placeholder="e.g. media, streaming, docker"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                data-testid="input-tags"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Personal Notes</label>
              <Textarea
                className="bg-secondary/20 border-white/5 focus-visible:ring-primary/50 font-mono text-sm resize-none"
                placeholder="Any initial thoughts?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                data-testid="textarea-notes"
              />
            </div>

            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => mutation.mutate()}
              disabled={!isValid || mutation.isPending}
              data-testid="button-submit"
            >
              <Plus className="w-4 h-4 mr-2" />
              {mutation.isPending ? "Adding..." : "Add to Radar"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
