import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { insertProjectSchema, updateProjectSchema } from "@shared/schema";
import { fetchRepoInfo, fetchLatestRelease, parseGitHubRepo, searchGitHub } from "./github";
import { z } from "zod";
import type { Project } from "@shared/schema";

type HealthState = "unknown" | "active" | "slow" | "stale";

function healthState(commitDate: string | null | undefined): HealthState {
  if (!commitDate) return "unknown";
  const commitTs = new Date(commitDate).getTime();
  if (Number.isNaN(commitTs)) return "unknown";
  const ageDays = Math.floor((Date.now() - commitTs) / 86_400_000);
  if (ageDays <= 30) return "active";
  if (ageDays > 365) return "stale";
  return "slow";
}

/**
 * Refresh GitHub stats for one project and record any detected changes
 * (star jump, health-state transition, new release) as feed events.
 * Shared by the single-project and batch monitor endpoints.
 */
async function syncProject(p: Project) {
  const info = await fetchRepoInfo(p.githubUrl!);
  if (!info) return null;

  const wasMonitored = !!p.lastMonitored;
  const latestRelease = await fetchLatestRelease(p.githubUrl!);

  const events: Array<{ type: "star_jump" | "health_change" | "release"; message: string }> = [];

  if (wasMonitored && p.githubStars != null) {
    const diff = info.stars - p.githubStars;
    if (diff !== 0) {
      events.push({ type: "star_jump", message: `${diff > 0 ? "+" : ""}${diff} stars` });
    }
  }

  if (wasMonitored) {
    const before = healthState(p.githubLastCommit);
    const after = healthState(info.lastCommit ?? info.pushedAt);
    if (before !== "unknown" && after !== "unknown" && before !== after) {
      events.push({ type: "health_change", message: `Health changed: ${before} → ${after}` });
    }
  }

  if (wasMonitored && latestRelease && p.githubLatestRelease && latestRelease.tagName !== p.githubLatestRelease) {
    events.push({ type: "release", message: `Released ${latestRelease.tagName}` });
  }

  const updated = await storage.updateProject(p.id, {
    previousGithubStars: wasMonitored ? p.githubStars ?? undefined : undefined,
    previousGithubForks: wasMonitored ? p.githubForks ?? undefined : undefined,
    previousGithubOpenIssues: wasMonitored ? p.githubOpenIssues ?? undefined : undefined,
    githubStars: info.stars,
    githubForks: info.forks,
    githubOpenIssues: info.openIssues,
    githubLicense: info.license ?? undefined,
    githubDescription: info.description ?? undefined,
    githubLastCommit: info.lastCommit ?? info.pushedAt ?? undefined,
    githubLatestRelease: latestRelease?.tagName ?? undefined,
    lastMonitored: new Date().toISOString(),
  });
  if (!updated) return null;

  for (const e of events) {
    await storage.createEvent(p.id, p.name, e.type, e.message);
  }

  return { project: updated, githubInfo: info };
}

function normalizeTextValue(value: string | null | undefined) {
  if (!value) return null;
  return value.trim().toLowerCase();
}

function normalizeGitHubUrl(url: string | null | undefined) {
  if (!url) return null;
  const parsed = parseGitHubRepo(url);
  if (!parsed) return null;
  return `https://github.com/${parsed.owner.toLowerCase()}/${parsed.repo.toLowerCase()}`;
}

function classifyMonitoringState(project: Project) {
  if (!project.githubUrl) return "none";
  if (!project.lastMonitored) return "never";
  if (!project.githubLastCommit) return "unknown";
  const commitTs = new Date(project.githubLastCommit).getTime();
  if (Number.isNaN(commitTs)) return "unknown";
  const ageDays = Math.floor((Date.now() - commitTs) / 86_400_000);
  if (ageDays <= 30) return "active";
  if (ageDays > 365) return "stale";
  return "slow";
}

async function findDuplicateProject(
  candidate: { idToIgnore?: string; name?: string; url?: string; githubUrl?: string },
): Promise<Project | null> {
  const all = await storage.getProjects();
  const targetGitHub = normalizeGitHubUrl(candidate.githubUrl ?? candidate.url);
  const targetUrl = normalizeTextValue(candidate.url);
  const targetName = normalizeTextValue(candidate.name);

  for (const project of all) {
    if (candidate.idToIgnore && project.id === candidate.idToIgnore) continue;
    const projectGitHub = normalizeGitHubUrl(project.githubUrl ?? project.url);
    if (targetGitHub && projectGitHub === targetGitHub) return project;
    if (!targetGitHub && targetUrl && targetName) {
      const existingUrl = normalizeTextValue(project.url);
      const existingName = normalizeTextValue(project.name);
      if (existingUrl === targetUrl && existingName === targetName) return project;
    }
  }
  return null;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ── Projects ──────────────────────────────────────────────────────────────

  // GET /api/projects — list all projects, with optional search/filter
  app.get("/api/projects", async (req, res) => {
    try {
      const { q, category, status, tag } = req.query as Record<string, string>;

      let all = await storage.getProjects();

      if (q) {
        const lower = q.toLowerCase();
        all = all.filter(p =>
          p.name.toLowerCase().includes(lower) ||
          p.description.toLowerCase().includes(lower) ||
          p.tags.some(t => t.toLowerCase().includes(lower))
        );
      }
      if (category && category !== "all") {
        all = all.filter(p => p.category === category);
      }
      if (status && status !== "all") {
        all = all.filter(p => p.status === status);
      }
      if (tag) {
        all = all.filter(p => p.tags.includes(tag));
      }

      res.json(all);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  // GET /api/projects/:id — single project
  app.get("/api/projects/:id", async (req, res) => {
    try {
      const p = await storage.getProject(req.params.id);
      if (!p) return res.status(404).json({ message: "Project not found" });
      res.json(p);
    } catch {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  // POST /api/projects — create a new project
  app.post("/api/projects", async (req, res) => {
    try {
      const body = insertProjectSchema.safeParse(req.body);
      if (!body.success) {
        return res.status(400).json({ message: "Invalid data", errors: body.error.errors });
      }
      const normalizedGitHub = normalizeGitHubUrl(body.data.githubUrl ?? body.data.url) ?? body.data.githubUrl ?? undefined;
      const duplicate = await findDuplicateProject({
        name: body.data.name,
        url: body.data.url,
        githubUrl: normalizedGitHub,
      });
      if (duplicate) {
        return res.status(409).json({
          message: `Project "${duplicate.name}" already exists in your library`,
          conflict: { id: duplicate.id, name: duplicate.name, githubUrl: duplicate.githubUrl, url: duplicate.url },
        });
      }

      const p = await storage.createProject({ ...body.data, githubUrl: normalizedGitHub });
      res.status(201).json(p);
    } catch {
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  // PATCH /api/projects/:id — update a project (notes, rating, status, etc.)
  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const body = updateProjectSchema.safeParse(req.body);
      if (!body.success) {
        return res.status(400).json({ message: "Invalid data", errors: body.error.errors });
      }
      const existing = await storage.getProject(req.params.id);
      if (!existing) return res.status(404).json({ message: "Project not found" });

      const nextUrl = body.data.url ?? existing.url;
      const nextGitHub = body.data.githubUrl ?? existing.githubUrl ?? undefined;
      const duplicate = await findDuplicateProject({
        idToIgnore: existing.id,
        name: body.data.name ?? existing.name,
        url: nextUrl,
        githubUrl: nextGitHub,
      });
      if (duplicate) {
        return res.status(409).json({
          message: `Update would duplicate "${duplicate.name}"`,
          conflict: { id: duplicate.id, name: duplicate.name, githubUrl: duplicate.githubUrl, url: duplicate.url },
        });
      }

      const normalizedGitHub = normalizeGitHubUrl(nextGitHub ?? nextUrl) ?? (body.data.githubUrl ?? existing.githubUrl);
      const p = await storage.updateProject(req.params.id, {
        ...body.data,
        githubUrl: normalizedGitHub ?? undefined,
      });
      if (!p) return res.status(404).json({ message: "Project not found" });
      res.json(p);
    } catch {
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  // DELETE /api/projects/:id
  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const ok = await storage.deleteProject(req.params.id);
      if (!ok) return res.status(404).json({ message: "Project not found" });
      res.json({ success: true });
    } catch {
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // ── GitHub Monitoring ─────────────────────────────────────────────────────

  // POST /api/projects/:id/monitor — refresh GitHub stats for one project
  app.post("/api/projects/:id/monitor", async (req, res) => {
    try {
      const p = await storage.getProject(req.params.id);
      if (!p) return res.status(404).json({ message: "Project not found" });
      if (!p.githubUrl) return res.status(400).json({ message: "No GitHub URL configured" });

      const result = await syncProject(p);
      if (!result) return res.status(502).json({ message: "Could not fetch GitHub data" });

      res.json(result);
    } catch {
      res.status(500).json({ message: "Monitoring failed" });
    }
  });

  // POST /api/monitor/all — refresh GitHub stats for ALL projects with a GitHub URL
  app.post("/api/monitor/all", async (req, res) => {
    try {
      const all = await storage.getProjects();
      const withGitHub = all.filter(p => p.githubUrl);

      const results: Array<{ id: string; name: string; success: boolean; error?: string }> = [];

      for (const p of withGitHub) {
        try {
          const result = await syncProject(p);
          if (result) {
            results.push({ id: p.id, name: p.name, success: true });
          } else {
            results.push({ id: p.id, name: p.name, success: false, error: "No data returned" });
          }
        } catch (err: any) {
          results.push({ id: p.id, name: p.name, success: false, error: err.message });
        }
        // Respect GitHub rate limits — small delay between requests
        await new Promise(r => setTimeout(r, 300));
      }

      res.json({ results, total: withGitHub.length });
    } catch {
      res.status(500).json({ message: "Batch monitoring failed" });
    }
  });

  // GET /api/events — recent signal feed (star jumps, health changes, releases)
  app.get("/api/events", async (_req, res) => {
    try {
      const events = await storage.getRecentEvents(50);
      res.json(events);
    } catch {
      res.status(500).json({ message: "Failed to load events" });
    }
  });

  // ── Discovery ─────────────────────────────────────────────────────────────

  // GET /api/discover — search GitHub for new FOSS projects to add
  app.get("/api/discover", async (req, res) => {
    try {
      const schema = z.object({
        query: z.string().min(1),
        language: z.string().optional(),
        minStars: z.coerce.number().optional(),
        topic: z.string().optional(),
        sort: z.enum(["stars", "updated", "help-wanted-issues"]).optional(),
      });

      const params = schema.safeParse(req.query);
      if (!params.success) {
        return res.status(400).json({ message: "Invalid search params", errors: params.error.errors });
      }

      const results = await searchGitHub({
        query: params.data.query,
        language: params.data.language,
        minStars: params.data.minStars,
        topic: params.data.topic,
        sort: params.data.sort,
        perPage: 24,
      });

      // Save search history
      try {
        await storage.createDiscoverySearch(
          {
            query: params.data.query,
            category: params.data.topic,
            language: params.data.language,
            minStars: params.data.minStars,
            tags: params.data.topic ? [params.data.topic] : [],
          },
          JSON.stringify(results)
        );
      } catch {
        // non-fatal
      }

      res.json({ results, count: results.length });
    } catch {
      res.status(502).json({ message: "Discovery search failed" });
    }
  });

  // GET /api/discover/history — recent searches
  app.get("/api/discover/history", async (_req, res) => {
    try {
      const history = await storage.getDiscoverySearches();
      res.json(history.slice(0, 20));
    } catch {
      res.status(500).json({ message: "Failed to load search history" });
    }
  });

  // POST /api/discover/import — import a discovered project from GitHub into the library
  app.post("/api/discover/import", async (req, res) => {
    try {
      const schema = z.object({
        name: z.string(),
        description: z.string().optional(),
        htmlUrl: z.string().url(),
        stars: z.number(),
        forks: z.number(),
        language: z.string().nullable().optional(),
        license: z.string().nullable().optional(),
        topics: z.array(z.string()).optional(),
        category: z.enum(["Linux Apps", "Self-Hosted", "Android Apps", "Ham Radio", "Utilities", "Customization"]),
      });

      const body = schema.safeParse(req.body);
      if (!body.success) {
        return res.status(400).json({ message: "Invalid data", errors: body.error.errors });
      }

      const { name, description, htmlUrl, stars, forks, language, license, topics, category } = body.data;
      const normalizedGitHub = normalizeGitHubUrl(htmlUrl) ?? htmlUrl;
      const duplicate = await findDuplicateProject({ name, url: htmlUrl, githubUrl: normalizedGitHub });
      if (duplicate) {
        return res.status(409).json({
          message: `Project "${duplicate.name}" already exists in your library`,
          conflict: { id: duplicate.id, name: duplicate.name, githubUrl: duplicate.githubUrl, url: duplicate.url },
        });
      }

      const tags = [
        ...(topics ?? []).slice(0, 5),
        ...(language ? [language.toLowerCase()] : []),
      ].filter((t, i, a) => a.indexOf(t) === i).slice(0, 6);

      const created = await storage.createProject({
        name,
        description: description ?? "",
        category,
        status: "Want to Try",
        url: normalizedGitHub,
        githubUrl: normalizedGitHub,
        tags,
        setupNotes: [],
        alternatives: [],
      });

      const p = await storage.updateProject(created.id, {
        githubStars: stars,
        githubForks: forks,
        githubLicense: license ?? undefined,
      });

      res.status(201).json(p);
    } catch {
      res.status(500).json({ message: "Failed to import project" });
    }
  });

  // ── Stats / Export ────────────────────────────────────────────────────────

  // GET /api/stats — dashboard statistics
  app.get("/api/stats", async (_req, res) => {
    try {
      const all = await storage.getProjects();
      const stats = {
        total: all.length,
        using: all.filter(p => p.status === "Using").length,
        wantToTry: all.filter(p => p.status === "Want to Try").length,
        archived: all.filter(p => p.status === "Archived").length,
        categories: {} as Record<string, number>,
        avgRating: 0,
        withGitHub: all.filter(p => p.githubUrl).length,
        monitored: all.filter(p => p.lastMonitored).length,
        totalStars: all.reduce((acc, p) => acc + (p.githubStars ?? 0), 0),
        neverMonitored: 0,
        staleRepos: 0,
        activeRepos: 0,
      };

      for (const p of all) {
        stats.categories[p.category] = (stats.categories[p.category] ?? 0) + 1;
      }

      const rated = all.filter(p => p.rating);
      if (rated.length > 0) {
        stats.avgRating = Math.round(
          rated.reduce((acc, p) => acc + (p.rating ?? 0), 0) / rated.length * 10
        ) / 10;
      }
      for (const p of all) {
        const state = classifyMonitoringState(p);
        if (state === "never") stats.neverMonitored += 1;
        if (state === "stale") stats.staleRepos += 1;
        if (state === "active") stats.activeRepos += 1;
      }

      res.json(stats);
    } catch {
      res.status(500).json({ message: "Failed to compute stats" });
    }
  });

  // GET /api/export — export all projects as JSON
  app.get("/api/export", async (_req, res) => {
    try {
      const all = await storage.getProjects();
      res.setHeader("Content-Disposition", 'attachment; filename="foss-radar-export.json"');
      res.setHeader("Content-Type", "application/json");
      res.json({ exportedAt: new Date().toISOString(), projects: all });
    } catch {
      res.status(500).json({ message: "Export failed" });
    }
  });

  return httpServer;
}
