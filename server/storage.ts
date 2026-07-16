import { db } from "./db";
import { projects, discoverySearches, projectEvents } from "@shared/schema";
import type { Project, InsertProject, UpdateProject, DiscoverySearch, InsertDiscoverySearch, ProjectEvent, ProjectEventType } from "@shared/schema";
import { eq, like, or, inArray, desc } from "drizzle-orm";

export interface IStorage {
  // Projects
  getProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(data: InsertProject): Promise<Project>;
  updateProject(id: string, data: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;
  searchProjects(query: string): Promise<Project[]>;

  // Discovery
  getDiscoverySearches(): Promise<DiscoverySearch[]>;
  createDiscoverySearch(data: InsertDiscoverySearch, results: string): Promise<DiscoverySearch>;

  // Signal feed
  createEvent(projectId: string, projectName: string, type: ProjectEventType, message: string): Promise<ProjectEvent>;
  getRecentEvents(limit: number): Promise<ProjectEvent[]>;
}

export class DatabaseStorage implements IStorage {
  async getProjects(): Promise<Project[]> {
    return db.select().from(projects).orderBy(desc(projects.updatedAt));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [p] = await db.select().from(projects).where(eq(projects.id, id));
    return p;
  }

  async createProject(data: InsertProject): Promise<Project> {
    const [p] = await db.insert(projects).values(data).returning();
    return p;
  }

  async updateProject(id: string, data: Partial<Project>): Promise<Project | undefined> {
    const [p] = await db
      .update(projects)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(projects.id, id))
      .returning();
    return p;
  }

  async deleteProject(id: string): Promise<boolean> {
    await db.delete(projectEvents).where(eq(projectEvents.projectId, id));
    const result = await db.delete(projects).where(eq(projects.id, id)).returning();
    return result.length > 0;
  }

  async searchProjects(query: string): Promise<Project[]> {
    return db
      .select()
      .from(projects)
      .where(
        or(
          like(projects.name, `%${query}%`),
          like(projects.description, `%${query}%`),
        )
      )
      .orderBy(desc(projects.updatedAt));
  }

  async getDiscoverySearches(): Promise<DiscoverySearch[]> {
    return db.select().from(discoverySearches).orderBy(desc(discoverySearches.createdAt));
  }

  async createDiscoverySearch(data: InsertDiscoverySearch, results: string): Promise<DiscoverySearch> {
    const [s] = await db.insert(discoverySearches).values({ ...data, results }).returning();
    return s;
  }

  async createEvent(projectId: string, projectName: string, type: ProjectEventType, message: string): Promise<ProjectEvent> {
    const [e] = await db.insert(projectEvents).values({ projectId, projectName, type, message }).returning();
    return e;
  }

  async getRecentEvents(limit: number): Promise<ProjectEvent[]> {
    return db.select().from(projectEvents).orderBy(desc(projectEvents.createdAt)).limit(limit);
  }
}

export const storage = new DatabaseStorage();
