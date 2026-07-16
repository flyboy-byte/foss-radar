import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Projects table — the core of FOSS Radar
export const projects = sqliteTable("projects", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  category: text("category", { enum: ["Linux Apps", "Self-Hosted", "Android Apps", "Ham Radio", "Utilities", "Customization"] }).notNull(),
  status: text("status", { enum: ["Want to Try", "Using", "Archived"] }).notNull().default("Want to Try"),
  url: text("url").notNull().default(""),
  githubUrl: text("github_url"),
  tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default([]),
  rating: integer("rating"),                         // 1-5
  notes: text("notes"),                              // personal notes
  setupNotes: text("setup_notes", { mode: "json" }).$type<string[]>().notNull().default([]),
  alternatives: text("alternatives", { mode: "json" }).$type<string[]>().notNull().default([]), // IDs
  // GitHub monitoring fields
  githubStars: integer("github_stars"),
  githubForks: integer("github_forks"),
  githubLastCommit: text("github_last_commit"),
  githubOpenIssues: integer("github_open_issues"),
  githubLicense: text("github_license"),
  githubDescription: text("github_description"),
  // snapshot of stats as of the previous sync, so the UI can show deltas ("+12 stars")
  previousGithubStars: integer("previous_github_stars"),
  previousGithubForks: integer("previous_github_forks"),
  previousGithubOpenIssues: integer("previous_github_open_issues"),
  githubLatestRelease: text("github_latest_release"), // last known release tag, to detect new releases
  lastMonitored: text("last_monitored"), // sqlite uses text for ISO timestamps
  isSeeded: integer("is_seeded", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Discovery search parameters table
export const discoverySearches = sqliteTable("discovery_searches", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  query: text("query").notNull(),
  category: text("category"),
  tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default([]),
  minStars: integer("min_stars"),
  language: text("language"),
  results: text("results"),    // JSON string of discovered project data
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Keep User type for storage interface compat
export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Schemas for insert
export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastMonitored: true,
  githubStars: true,
  githubForks: true,
  githubLastCommit: true,
  githubOpenIssues: true,
  githubLicense: true,
  githubDescription: true,
  previousGithubStars: true,
  previousGithubForks: true,
  previousGithubOpenIssues: true,
  githubLatestRelease: true,
});

// Signal feed — one row per detected change during a sync (star jump, health-state
// transition, new release), so the dashboard can show "what changed" not just current state.
export const projectEvents = sqliteTable("project_events", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id").notNull(),
  projectName: text("project_name").notNull(),
  type: text("type", { enum: ["star_jump", "health_change", "release"] }).notNull(),
  message: text("message").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export type ProjectEvent = typeof projectEvents.$inferSelect;
export type ProjectEventType = ProjectEvent["type"];

export const updateProjectSchema = insertProjectSchema.partial();

export const insertDiscoverySearchSchema = createInsertSchema(discoverySearches).omit({
  id: true,
  results: true,
  createdAt: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type UpdateProject = z.infer<typeof updateProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertDiscoverySearch = z.infer<typeof insertDiscoverySearchSchema>;
export type DiscoverySearch = typeof discoverySearches.$inferSelect;

export const insertUserSchema = createInsertSchema(users).pick({ username: true, password: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
