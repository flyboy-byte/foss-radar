// Mirrors cloud/server/models.py — kept as plain TS types since the cloud app's
// backend is Python, not Drizzle, so there's no shared schema module to import from.

export type Category = "Linux Apps" | "Self-Hosted" | "Android Apps" | "Ham Radio" | "Utilities" | "Customization";
export type Status = "Want to Try" | "Using" | "Archived";

export interface Project {
  id: string;
  name: string;
  description: string;
  category: Category;
  status: Status;
  url: string;
  githubUrl: string | null;
  tags: string[];
  rating: number | null;
  notes: string | null;
  setupNotes: string[];
  alternatives: string[];
  githubStars: number | null;
  githubForks: number | null;
  githubLastCommit: string | null;
  githubOpenIssues: number | null;
  githubLicense: string | null;
  githubDescription: string | null;
  previousGithubStars: number | null;
  previousGithubForks: number | null;
  previousGithubOpenIssues: number | null;
  githubLatestRelease: string | null;
  lastMonitored: string | null;
  isSeeded: boolean;
  createdAt: string;
  updatedAt: string;
}

export type InsertProject = Pick<Project, "name" | "category"> &
  Partial<Pick<Project, "description" | "status" | "url" | "githubUrl" | "tags" | "rating" | "notes" | "setupNotes" | "alternatives" | "isSeeded">>;

export type UpdateProject = Partial<InsertProject>;

export interface User {
  id: string;
  email: string;
  username: string | null;
  createdAt: string;
}
