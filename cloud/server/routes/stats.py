from datetime import datetime, timezone

from flask import Blueprint, jsonify
from flask_login import login_required, current_user

from models import Project

stats_bp = Blueprint("stats", __name__, url_prefix="/api/stats")


def _classify_monitoring_state(project: Project):
    if not project.github_url:
        return "none"
    if not project.last_monitored:
        return "never"
    if not project.github_last_commit:
        return "unknown"
    try:
        dt = datetime.fromisoformat(project.github_last_commit.replace("Z", "+00:00"))
    except ValueError:
        return "unknown"
    age_days = (datetime.now(timezone.utc) - dt).days
    if age_days <= 30:
        return "active"
    if age_days > 365:
        return "stale"
    return "slow"


@stats_bp.get("")
@login_required
def stats():
    projects = Project.query.filter_by(user_id=current_user.id).all()

    categories = {}
    for p in projects:
        categories[p.category] = categories.get(p.category, 0) + 1

    rated = [p for p in projects if p.rating]
    avg_rating = round(sum(p.rating for p in rated) / len(rated), 1) if rated else 0

    never_monitored = stale_repos = active_repos = 0
    for p in projects:
        state = _classify_monitoring_state(p)
        if state == "never":
            never_monitored += 1
        elif state == "stale":
            stale_repos += 1
        elif state == "active":
            active_repos += 1

    return jsonify({
        "total": len(projects),
        "using": sum(1 for p in projects if p.status == "Using"),
        "wantToTry": sum(1 for p in projects if p.status == "Want to Try"),
        "archived": sum(1 for p in projects if p.status == "Archived"),
        "categories": categories,
        "avgRating": avg_rating,
        "withGitHub": sum(1 for p in projects if p.github_url),
        "monitored": sum(1 for p in projects if p.last_monitored),
        "totalStars": sum(p.github_stars or 0 for p in projects),
        "neverMonitored": never_monitored,
        "staleRepos": stale_repos,
        "activeRepos": active_repos,
    })
