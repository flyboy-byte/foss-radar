import { type Project, type InsertProject, type UpdateProject } from "@shared/schema";
import { queryClient } from "./queryClient";

async function apiRequest<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `API error: ${res.status}`);
  }
  return res.json();
}

// Projects
export const getProjects = (params?: {
  q?: string;
  category?: string;
  status?: string;
  tag?: string;
}) => {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.category && params.category !== "all") search.set("category", params.category);
  if (params?.status && params.status !== "all") search.set("status", params.status);
  if (params?.tag) search.set("tag", params.tag);
  const qs = search.toString();
  return apiRequest<Project[]>(`/projects${qs ? `?${qs}` : ""}`);
};

export const getProject = (id: string) =>
  apiRequest<Project>(`/projects/${id}`);

export const createProject = (data: InsertProject) =>
  apiRequest<Project>("/projects", { method: "POST", body: JSON.stringify(data) });

export const updateProject = (id: string, data: UpdateProject) =>
  apiRequest<Project>(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(data) });

export const deleteProject = (id: string) =>
  apiRequest<{ success: boolean }>(`/projects/${id}`, { method: "DELETE" });

// Monitoring
export const monitorProject = (id: string) =>
  apiRequest<{ project: Project; githubInfo: any }>(`/projects/${id}/monitor`, { method: "POST" });

export const monitorAll = () =>
  apiRequest<{ results: any[]; total: number }>("/monitor/all", { method: "POST" });

// Discovery
export const discoverProjects = (params: {
  query: string;
  language?: string;
  minStars?: number;
  topic?: string;
  sort?: string;
}) => {
  const search = new URLSearchParams({ query: params.query });
  if (params.language) search.set("language", params.language);
  if (params.minStars) search.set("minStars", String(params.minStars));
  if (params.topic) search.set("topic", params.topic);
  if (params.sort) search.set("sort", params.sort);
  return apiRequest<{ results: any[]; count: number }>(`/discover?${search}`);
};

export const importProject = (data: {
  name: string;
  description?: string;
  htmlUrl: string;
  stars: number;
  forks: number;
  language?: string | null;
  license?: string | null;
  topics?: string[];
  category: string;
}) => apiRequest<Project>("/discover/import", { method: "POST", body: JSON.stringify(data) });

// Stats & Export
export const getStats = () =>
  apiRequest<{
    total: number;
    using: number;
    wantToTry: number;
    archived: number;
    categories: Record<string, number>;
    avgRating: number;
    withGitHub: number;
    monitored: number;
    totalStars: number;
  }>("/stats");

export const CATEGORIES = [
  "Linux Apps", "Self-Hosted", "Android Apps", "Ham Radio", "Utilities", "Customization"
] as const;
