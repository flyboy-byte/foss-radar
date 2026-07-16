"""
GitHub API client for monitoring and discovering open-source projects.
Uses the public GitHub REST API (no token required, but rate-limited to 60 req/hr without token).
If GITHUB_TOKEN is set, rate limit increases to 5,000 req/hr — shared across all users of this deployment.

Direct port of server/github.ts from the local single-user app; same functions, same shapes.
"""
import os
import re

import requests

GITHUB_API = "https://api.github.com"


def _headers():
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "FOSS-Radar-Cloud/1.0",
    }
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def parse_github_repo(url: str):
    if not url:
        return None
    match = re.search(r"github\.com/([^/]+)/([^/]+?)(?:\.git)?(?:/.*)?$", url)
    if not match:
        return None
    return {"owner": match.group(1), "repo": match.group(2)}


def fetch_repo_info(github_url: str):
    parsed = parse_github_repo(github_url)
    if not parsed:
        return None

    try:
        res = requests.get(
            f"{GITHUB_API}/repos/{parsed['owner']}/{parsed['repo']}",
            headers=_headers(), timeout=10,
        )
        if not res.ok:
            return None
        data = res.json()

        last_commit = None
        try:
            commits_res = requests.get(
                f"{GITHUB_API}/repos/{parsed['owner']}/{parsed['repo']}/commits",
                params={"per_page": 1}, headers=_headers(), timeout=10,
            )
            if commits_res.ok:
                commits = commits_res.json()
                if commits:
                    commit = commits[0].get("commit", {})
                    last_commit = (commit.get("committer") or {}).get("date") \
                        or (commit.get("author") or {}).get("date")
        except requests.RequestException:
            pass  # non-fatal

        license_info = data.get("license") or {}
        return {
            "stars": data.get("stargazers_count", 0),
            "forks": data.get("forks_count", 0),
            "openIssues": data.get("open_issues_count", 0),
            "license": license_info.get("spdx_id") or license_info.get("name"),
            "description": data.get("description"),
            "lastCommit": last_commit,
            "pushedAt": data.get("pushed_at"),
            "language": data.get("language"),
        }
    except requests.RequestException:
        return None


def fetch_latest_release(github_url: str):
    """Latest published release, if any. A 404 (no releases) is expected, not an error."""
    parsed = parse_github_repo(github_url)
    if not parsed:
        return None

    try:
        res = requests.get(
            f"{GITHUB_API}/repos/{parsed['owner']}/{parsed['repo']}/releases/latest",
            headers=_headers(), timeout=10,
        )
        if not res.ok:
            return None
        data = res.json()
        return {
            "tagName": data.get("tag_name"),
            "name": data.get("name"),
            "htmlUrl": data.get("html_url"),
            "publishedAt": data.get("published_at"),
        }
    except requests.RequestException:
        return None


def search_github(query: str, language=None, min_stars=None, topic=None, sort="stars", per_page=20):
    q = query
    if language:
        q += f" language:{language}"
    if min_stars:
        q += f" stars:>={min_stars}"
    if topic:
        q += f" topic:{topic}"
    q += " is:public"

    res = requests.get(
        f"{GITHUB_API}/search/repositories",
        params={"q": q, "sort": sort, "order": "desc", "per_page": per_page},
        headers=_headers(), timeout=10,
    )
    if not res.ok:
        raise RuntimeError(f"GitHub search failed: {res.status_code} - {res.text}")

    data = res.json()
    results = []
    for item in data.get("items", []):
        license_info = item.get("license") or {}
        results.append({
            "id": item.get("id"),
            "name": item.get("name"),
            "fullName": item.get("full_name"),
            "description": item.get("description"),
            "htmlUrl": item.get("html_url"),
            "stars": item.get("stargazers_count", 0),
            "forks": item.get("forks_count", 0),
            "language": item.get("language"),
            "license": license_info.get("spdx_id") or license_info.get("name"),
            "topics": item.get("topics", []),
            "pushedAt": item.get("pushed_at", ""),
            "openIssues": item.get("open_issues_count", 0),
        })
    return results
