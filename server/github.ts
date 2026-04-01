/**
 * GitHub API client for monitoring and discovering open-source projects.
 * Uses the public GitHub REST API (no token required, but rate-limited to 60 req/hr without token).
 * If GITHUB_TOKEN is set, rate limit increases to 5000 req/hr.
 */

const GITHUB_API = "https://api.github.com";

function getHeaders() {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "FOSS-Radar/1.0",
  };
  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

export interface GitHubRepoInfo {
  stars: number;
  forks: number;
  openIssues: number;
  license: string | null;
  description: string | null;
  lastCommit: string | null;
  pushedAt: string | null;
  language: string | null;
}

export interface GitHubSearchResult {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  htmlUrl: string;
  stars: number;
  forks: number;
  language: string | null;
  license: string | null;
  topics: string[];
  pushedAt: string;
  openIssues: number;
}

/**
 * Parse a GitHub URL to extract owner/repo.
 */
export function parseGitHubRepo(url: string): { owner: string; repo: string } | null {
  try {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/);
    if (!match) return null;
    return { owner: match[1], repo: match[2] };
  } catch {
    return null;
  }
}

/**
 * Fetch current stats for a single GitHub repository.
 */
export async function fetchRepoInfo(githubUrl: string): Promise<GitHubRepoInfo | null> {
  const parsed = parseGitHubRepo(githubUrl);
  if (!parsed) return null;

  try {
    const res = await fetch(
      `${GITHUB_API}/repos/${parsed.owner}/${parsed.repo}`,
      { headers: getHeaders() }
    );

    if (!res.ok) {
      console.warn(`GitHub API error for ${githubUrl}: ${res.status} ${res.statusText}`);
      return null;
    }

    const data = await res.json() as any;

    // Get the latest commit date from the default branch
    let lastCommit: string | null = null;
    try {
      const commitsRes = await fetch(
        `${GITHUB_API}/repos/${parsed.owner}/${parsed.repo}/commits?per_page=1`,
        { headers: getHeaders() }
      );
      if (commitsRes.ok) {
        const commits = await commitsRes.json() as any[];
        if (commits.length > 0) {
          lastCommit = commits[0].commit?.committer?.date ?? commits[0].commit?.author?.date ?? null;
        }
      }
    } catch {
      // Non-fatal
    }

    return {
      stars: data.stargazers_count ?? 0,
      forks: data.forks_count ?? 0,
      openIssues: data.open_issues_count ?? 0,
      license: data.license?.spdx_id ?? data.license?.name ?? null,
      description: data.description ?? null,
      lastCommit,
      pushedAt: data.pushed_at ?? null,
      language: data.language ?? null,
    };
  } catch (err) {
    console.error(`Failed to fetch repo info for ${githubUrl}:`, err);
    return null;
  }
}

/**
 * Search GitHub for open-source projects matching the given parameters.
 */
export async function searchGitHub(params: {
  query: string;
  language?: string;
  minStars?: number;
  topic?: string;
  sort?: "stars" | "updated" | "help-wanted-issues";
  perPage?: number;
}): Promise<GitHubSearchResult[]> {
  const { query, language, minStars, topic, sort = "stars", perPage = 20 } = params;

  let q = query;
  if (language) q += ` language:${language}`;
  if (minStars) q += ` stars:>=${minStars}`;
  if (topic) q += ` topic:${topic}`;
  q += ` is:public`;

  const searchParams = new URLSearchParams({
    q,
    sort,
    order: "desc",
    per_page: String(perPage),
  });

  try {
    const res = await fetch(
      `${GITHUB_API}/search/repositories?${searchParams}`,
      { headers: getHeaders() }
    );

    if (!res.ok) {
      const msg = await res.text();
      throw new Error(`GitHub search failed: ${res.status} - ${msg}`);
    }

    const data = await res.json() as any;

    return (data.items ?? []).map((item: any): GitHubSearchResult => ({
      id: item.id,
      name: item.name,
      fullName: item.full_name,
      description: item.description ?? null,
      htmlUrl: item.html_url,
      stars: item.stargazers_count ?? 0,
      forks: item.forks_count ?? 0,
      language: item.language ?? null,
      license: item.license?.spdx_id ?? item.license?.name ?? null,
      topics: item.topics ?? [],
      pushedAt: item.pushed_at ?? "",
      openIssues: item.open_issues_count ?? 0,
    }));
  } catch (err) {
    console.error("GitHub search error:", err);
    throw err;
  }
}
