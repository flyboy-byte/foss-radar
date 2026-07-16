"""Shared helpers used across route blueprints — port of the top-of-file
helpers in the local app's server/routes.ts (normalize_*, find_duplicate_project)."""
from github import parse_github_repo
from models import Project


def normalize_text_value(value):
    if not value:
        return None
    return value.strip().lower()


def normalize_github_url(url):
    if not url:
        return None
    parsed = parse_github_repo(url)
    if not parsed:
        return None
    return f"https://github.com/{parsed['owner'].lower()}/{parsed['repo'].lower()}"


def find_duplicate_project(user_id, name=None, url=None, github_url=None, id_to_ignore=None):
    """Duplicate check scoped to one user — a cross-user check would both be
    wrong (each user has their own library) and a data leak (would reveal
    another user's library contents via a 409 conflict message)."""
    target_github = normalize_github_url(github_url or url)
    target_url = normalize_text_value(url)
    target_name = normalize_text_value(name)

    query = Project.query.filter_by(user_id=user_id)
    for project in query.all():
        if id_to_ignore and project.id == id_to_ignore:
            continue
        project_github = normalize_github_url(project.github_url or project.url)
        if target_github and project_github == target_github:
            return project
        if not target_github and target_url and target_name:
            if normalize_text_value(project.url) == target_url and normalize_text_value(project.name) == target_name:
                return project
    return None


def duplicate_conflict(project):
    return {
        "message": f'Project "{project.name}" already exists in your library',
        "conflict": {"id": project.id, "name": project.name, "githubUrl": project.github_url, "url": project.url},
    }
