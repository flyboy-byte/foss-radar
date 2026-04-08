import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { projects } from "@shared/schema";
import { eq } from "drizzle-orm";
import { insertProjectSchema, updateProjectSchema, insertDiscoverySearchSchema } from "@shared/schema";
import { fetchRepoInfo, searchGitHub } from "./github";
import { z } from "zod";

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
      const p = await storage.createProject(body.data);
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
      const p = await storage.updateProject(req.params.id, body.data);
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

      const info = await fetchRepoInfo(p.githubUrl);
      if (!info) return res.status(502).json({ message: "Could not fetch GitHub data" });

      const updated = await storage.updateProject(req.params.id, {
        githubStars: info.stars,
        githubForks: info.forks,
        githubOpenIssues: info.openIssues,
        githubLicense: info.license ?? undefined,
        githubDescription: info.description ?? undefined,
        githubLastCommit: info.lastCommit ?? info.pushedAt ?? undefined,
        lastMonitored: new Date().toISOString(),
      });

      res.json({ project: updated, githubInfo: info });
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
          const info = await fetchRepoInfo(p.githubUrl!);
          if (info) {
            await storage.updateProject(p.id, {
              githubStars: info.stars,
              githubForks: info.forks,
              githubOpenIssues: info.openIssues,
              githubLicense: info.license ?? undefined,
              githubDescription: info.description ?? undefined,
              githubLastCommit: info.lastCommit ?? info.pushedAt ?? undefined,
              lastMonitored: new Date().toISOString(),
            });
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

      const tags = [
        ...(topics ?? []).slice(0, 5),
        ...(language ? [language.toLowerCase()] : []),
      ].filter((t, i, a) => a.indexOf(t) === i).slice(0, 6);

      const created = await storage.createProject({
        name,
        description: description ?? "",
        category,
        status: "Want to Try",
        url: htmlUrl,
        githubUrl: htmlUrl,
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
