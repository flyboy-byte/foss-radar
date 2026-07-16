import json

from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user

from extensions import db
from models import Project, DiscoverySearch, CATEGORIES
from github import search_github
from helpers import normalize_github_url, find_duplicate_project, duplicate_conflict

discover_bp = Blueprint("discover", __name__, url_prefix="/api/discover")


@discover_bp.get("")
@login_required
def discover():
    query = request.args.get("query")
    if not query:
        return jsonify({"message": "Invalid search params", "errors": ["query is required"]}), 400

    language = request.args.get("language")
    min_stars = request.args.get("minStars", type=int)
    topic = request.args.get("topic")
    sort = request.args.get("sort", "stars")
    if sort not in ("stars", "updated", "help-wanted-issues"):
        return jsonify({"message": "Invalid search params", "errors": ["invalid sort"]}), 400

    try:
        results = search_github(query, language=language, min_stars=min_stars, topic=topic, sort=sort, per_page=24)
    except Exception:
        return jsonify({"message": "Discovery search failed"}), 502

    try:
        db.session.add(DiscoverySearch(
            user_id=current_user.id, query=query, category=topic,
            language=language, min_stars=min_stars, tags=[topic] if topic else [],
            results=json.dumps(results),
        ))
        db.session.commit()
    except Exception:
        db.session.rollback()  # non-fatal, mirrors the local app's try/catch around history logging

    return jsonify({"results": results, "count": len(results)})


@discover_bp.get("/history")
@login_required
def discover_history():
    history = DiscoverySearch.query.filter_by(user_id=current_user.id) \
        .order_by(DiscoverySearch.created_at.desc()).limit(20).all()
    return jsonify([h.to_dict() for h in history])


@discover_bp.post("/import")
@login_required
def discover_import():
    body = request.get_json(silent=True) or {}
    errors = []
    if not body.get("name"):
        errors.append("name is required")
    if not body.get("htmlUrl"):
        errors.append("htmlUrl is required")
    if body.get("category") not in CATEGORIES:
        errors.append(f"category must be one of {CATEGORIES}")
    if errors:
        return jsonify({"message": "Invalid data", "errors": errors}), 400

    html_url = body["htmlUrl"]
    normalized_github = normalize_github_url(html_url) or html_url
    duplicate = find_duplicate_project(current_user.id, name=body["name"], url=html_url, github_url=normalized_github)
    if duplicate:
        return jsonify(duplicate_conflict(duplicate)), 409

    topics = (body.get("topics") or [])[:5]
    language = body.get("language")
    tags = list(dict.fromkeys(topics + ([language.lower()] if language else [])))[:6]

    project = Project(
        user_id=current_user.id,
        name=body["name"],
        description=body.get("description") or "",
        category=body["category"],
        status="Want to Try",
        url=normalized_github,
        github_url=normalized_github,
        tags=tags,
        setup_notes=[],
        alternatives=[],
        github_stars=body.get("stars"),
        github_forks=body.get("forks"),
        github_license=body.get("license"),
    )
    db.session.add(project)
    db.session.commit()
    return jsonify(project.to_dict()), 201
