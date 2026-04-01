import type { Project } from "@shared/schema";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Link as LinkIcon, Github, GitFork, Eye, Clock } from "lucide-react";
import { Link } from "wouter";

interface ProjectCardProps {
  project: Project;
}

function StatusDot({ status }: { status: Project['status'] }) {
  if (status === 'Want to Try') return <span className="w-2 h-2 rounded-full bg-orange-400 mr-2 animate-pulse inline-block" />;
  if (status === 'Using') return <span className="w-2 h-2 rounded-full bg-primary mr-2 inline-block" />;
  return <span className="w-2 h-2 rounded-full bg-muted-foreground mr-2 inline-block" />;
}

function getStatusClass(status: Project['status']) {
  if (status === 'Want to Try') return 'status-want';
  if (status === 'Using') return 'status-using';
  return 'status-archived';
}

function formatNumber(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Card className="glass-panel group hover:border-primary/50 transition-all duration-300 relative overflow-hidden cursor-pointer h-full flex flex-col"
      data-testid={`card-project-${project.id}`}>
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <CardHeader className="pb-3 relative z-10">
        <div className="flex justify-between items-start mb-2">
          <Badge variant="outline" className={`${getStatusClass(project.status)} font-mono text-[10px] uppercase tracking-wider px-2 py-0.5`}>
            <StatusDot status={project.status} />
            {project.status}
          </Badge>
          {project.rating && (
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`w-3 h-3 ${i < project.rating! ? 'fill-primary text-primary' : 'text-muted'}`} />
              ))}
            </div>
          )}
        </div>

        <CardTitle className="text-lg font-bold font-heading text-foreground group-hover:text-primary transition-colors">
          <Link href={`/project/${project.id}`}>{project.name}</Link>
        </CardTitle>

        <CardDescription className="text-muted-foreground text-sm leading-relaxed line-clamp-2">
          {project.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="pb-4 relative z-10 flex-grow">
        {/* GitHub Stats */}
        {project.githubStars !== null && project.githubStars !== undefined && (
          <div className="flex items-center gap-3 mb-3 text-xs font-mono text-muted-foreground/70">
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3" />
              {formatNumber(project.githubStars)}
            </span>
            {project.githubForks !== null && project.githubForks !== undefined && (
              <span className="flex items-center gap-1">
                <GitFork className="w-3 h-3" />
                {formatNumber(project.githubForks)}
              </span>
            )}
            {project.githubLicense && (
              <span className="text-primary/50">{project.githubLicense}</span>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {project.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-[10px] font-mono text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded border border-white/5">
              #{tag}
            </span>
          ))}
          {project.tags.length > 3 && (
            <span className="text-[10px] font-mono text-muted-foreground/50 px-1">+{project.tags.length - 3}</span>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-0 flex justify-between items-center text-xs relative z-10 border-t border-white/5 mt-auto pt-3">
        <span className="font-mono text-muted-foreground/70">{project.category}</span>
        <div className="flex items-center gap-2">
          {project.githubUrl && (
            <a href={project.githubUrl} target="_blank" rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
              onClick={(e) => e.stopPropagation()}>
              <Github className="w-3.5 h-3.5" />
            </a>
          )}
          <a href={project.url} target="_blank" rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors p-1"
            onClick={(e) => e.stopPropagation()}>
            <LinkIcon className="w-3.5 h-3.5" />
          </a>
        </div>
      </CardFooter>
    </Card>
  );
}
