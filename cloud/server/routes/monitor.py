import time

from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user

from extensions import db
from models import Project, ProjectEvent, now_iso
from github import fetch_repo_info, fetch_latest_release

monitor_bp = Blueprint("monitor", __name__, url_prefix="/api")


def _health_state(commit_date):
    if not commit_date:
        return "unknown"
    from datetime import datetime, timezone
    try:
        # GitHub dates are like "2026-07-15T10:49:34Z"
        dt = datetime.fromisoformat(commit_date.replace("Z", "+00:00"))
    except ValueError:
        return "unknown"
    age_days = (datetime.now(timezone.utc) - dt).days
    if age_days <= 30:
        return "active"
    if age_days > 365:
        return "stale"
    return "slow"


def sync_project(project: Project):
    """Refresh GitHub stats for one project and record any detected changes
    (star jump, health-state transition, new release) as feed events.
    Direct port of syncProject() in the local app's server/routes.ts."""
    info = fetch_repo_info(project.github_url)
    if not info:
        return None

    was_monitored = bool(project.last_monitored)
    latest_release = fetch_latest_release(project.github_url)

    events = []

    if was_monitored and project.github_stars is not None:
        diff = info["stars"] - project.github_stars
        if diff != 0:
            events.append(("star_jump", f"{'+' if diff > 0 else ''}{diff} stars"))

    if was_monitored:
        before = _health_state(project.github_last_commit)
        after = _health_state(info.get("lastCommit") or info.get("pushedAt"))
        if before != "unknown" and after != "unknown" and before != after:
            events.append(("health_change", f"Health changed: {before} → {after}"))

    if was_monitored and latest_release and project.github_latest_release \
            and latest_release["tagName"] != project.github_latest_release:
        events.append(("release", f"Released {latest_release['tagName']}"))

    project.previous_github_stars = project.github_stars if was_monitored else None
    project.previous_github_forks = project.github_forks if was_monitored else None
    project.previous_github_open_issues = project.github_open_issues if was_monitored else None
    project.github_stars = info["stars"]
    project.github_forks = info["forks"]
    project.github_open_issues = info["openIssues"]
    project.github_license = info.get("license") or project.github_license
    project.github_description = info.get("description") or project.github_description
    project.github_last_commit = info.get("lastCommit") or info.get("pushedAt") or project.github_last_commit
    project.github_latest_release = (latest_release or {}).get("tagName") or project.github_latest_release
    project.last_monitored = now_iso()

    for event_type, message in events:
        db.session.add(ProjectEvent(
            user_id=project.user_id, project_id=project.id, project_name=project.name,
            type=event_type, message=message,
        ))

    db.session.commit()
    return {"project": project.to_dict(), "githubInfo": info}


@monitor_bp.post("/projects/<project_id>/monitor")
@login_required
def monitor_project(project_id):
    project = Project.query.filter_by(id=project_id, user_id=current_user.id).first()
    if not project:
        return jsonify({"message": "Project not found"}), 404
    if not project.github_url:
        return jsonify({"message": "No GitHub URL configured"}), 400

    result = sync_project(project)
    if not result:
        return jsonify({"message": "Could not fetch GitHub data"}), 502
    return jsonify(result)


@monitor_bp.post("/monitor/all")
@login_required
def monitor_all():
    projects = Project.query.filter_by(user_id=current_user.id).all()
    with_github = [p for p in projects if p.github_url]

    results = []
    for project in with_github:
        try:
            result = sync_project(project)
            if result:
                results.append({"id": project.id, "name": project.name, "success": True})
            else:
                results.append({"id": project.id, "name": project.name, "success": False, "error": "No data returned"})
        except Exception as err:  # noqa: BLE001 — mirrors the local app's catch-all per-project error capture
            results.append({"id": project.id, "name": project.name, "success": False, "error": str(err)})
        time.sleep(0.3)  # respect GitHub rate limits, same delay as the local app

    return jsonify({"results": results, "total": len(with_github)})
