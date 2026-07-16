import { useQuery } from "@tanstack/react-query";
import { getEvents, type ProjectEvent } from "@/lib/api";
import { Link } from "wouter";
import { TrendingUp, TrendingDown, HeartPulse, Tag, Satellite } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function EventIcon({ event }: { event: ProjectEvent }) {
  if (event.type === "star_jump") {
    const up = event.message.startsWith("+");
    const Icon = up ? TrendingUp : TrendingDown;
    return <Icon className={`w-4 h-4 ${up ? "text-green-400" : "text-red-400"}`} />;
  }
  if (event.type === "release") return <Tag className="w-4 h-4 text-primary" />;
  return <HeartPulse className="w-4 h-4 text-orange-400" />;
}

export function SignalsFeed() {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: getEvents,
    staleTime: 30_000,
  });

  if (isLoading || events.length === 0) return null;

  return (
    <div className="glass-panel rounded-lg border-white/5 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5">
        <Satellite className="w-4 h-4 text-primary" />
        <span className="font-heading font-semibold text-sm">Signals</span>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wider">
          Recent activity
        </span>
      </div>
      <div className="max-h-72 overflow-y-auto divide-y divide-white/5">
        {events.map((event) => (
          <Link key={event.id} href={`/project/${event.projectId}`}>
            <div className="flex items-center gap-3 px-5 py-2.5 hover:bg-secondary/30 transition-colors cursor-pointer">
              <EventIcon event={event} />
              <div className="flex-1 min-w-0">
                <span className="font-mono text-sm text-foreground">{event.projectName}</span>
                <span className="text-muted-foreground text-sm ml-2">{event.message}</span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground/50 whitespace-nowrap">
                {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
