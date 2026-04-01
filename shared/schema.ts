import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const categoryEnum = pgEnum("category", [
  "Linux Apps", "Self-Hosted", "Android Apps", "Ham Radio", "Utilities", "Customization"
]);

export const statusEnum = pgEnum("status", [
  "Want to Try", "Using", "Archived"
]);

// Projects table — the core of FOSS Radar
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  category: categoryEnum("category").notNull(),
  status: statusEnum("status").notNull().default("Want to Try"),
  url: text("url").notNull().default(""),
  githubUrl: text("github_url"),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  rating: integer("rating"),                         // 1-5
  notes: text("notes"),                              // personal notes
  setupNotes: text("setup_notes").array().notNull().default(sql`'{}'::text[]`),
  alternatives: text("alternatives").array().notNull().default(sql`'{}'::text[]`), // IDs
  // GitHub monitoring fields
  githubStars: integer("github_stars"),
  githubForks: integer("github_forks"),
  githubLastCommit: text("github_last_commit"),
  githubOpenIssues: integer("github_open_issues"),
  githubLicense: text("github_license"),
  githubDescription: text("github_description"),
  lastMonitored: timestamp("last_monitored"),
  isSeeded: boolean("is_seeded").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Discovery search parameters table
export const discoverySearches = pgTable("discovery_searches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  query: text("query").notNull(),
  category: text("category"),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  minStars: integer("min_stars"),
  language: text("language"),
  results: text("results"),    // JSON string of discovered project data
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
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
});

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

// Keep User type for storage interface compat
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});
export const insertUserSchema = createInsertSchema(users).pick({ username: true, password: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
