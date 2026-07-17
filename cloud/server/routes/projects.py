from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user

from extensions import db
from models import Project, ProjectEvent, CATEGORIES, STATUSES, now_iso
from helpers import normalize_github_url, find_duplicate_project, duplicate_conflict

projects_bp = Blueprint("projects", __name__, url_prefix="/api/projects")


def _validate_insert(body: dict, partial: bool):
    """Manual validation mirroring the local app's insertProjectSchema/updateProjectSchema
    (Zod-derived from the Drizzle table) — no schema library needed for shapes this small."""
    errors = []
    if not partial or "name" in body:
        if not isinstance(body.get("name"), str) or not body.get("name").strip():
            errors.append("name is required")
    if not partial or "category" in body:
        if body.get("category") not in CATEGORIES:
            errors.append(f"category must be one of {CATEGORIES}")
    if "status" in body and body["status"] not in STATUSES:
        errors.append(f"status must be one of {STATUSES}")
    if "rating" in body and body["rating"] is not None and not isinstance(body["rating"], int):
        errors.append("rating must be an integer")
    if "tags" in body and not isinstance(body["tags"], list):
        errors.append("tags must be a list")
    return errors


# ── Shared logic, parameterized by user_id ──────────────────────────────────
# Reused by both the personal blueprint below (scoped to current_user.id) and
# routes/public.py (scoped to the shared public account's id) — one tested
# implementation instead of two copies drifting apart.

def list_projects_for(user_id, q=None, category=None, status=None, tag=None):
    projects = Project.query.filter_by(user_id=user_id).order_by(Project.updated_at.desc()).all()

    if q:
        lower = q.lower()
        projects = [p for p in projects if lower in p.name.lower() or lower in p.description.lower()
                    or any(lower in t.lower() for t in (p.tags or []))]
    if category and category != "all":
        projects = [p for p in projects if p.category == category]
    if status and status != "all":
        projects = [p for p in projects if p.status == status]
    if tag:
        projects = [p for p in projects if tag in (p.tags or [])]

    return [p.to_dict() for p in projects]


def get_project_for(user_id, project_id):
    project = Project.query.filter_by(id=project_id, user_id=user_id).first()
    return project.to_dict() if project else None


def create_project_for(user_id, body: dict):
    """Returns (result_dict, status_code). result_dict has either the created
    project or a {message, [conflict]} error payload."""
    errors = _validate_insert(body, partial=False)
    if errors:
        return {"message": "Invalid data", "errors": errors}, 400

    normalized_github = normalize_github_url(body.get("githubUrl") or body.get("url")) or body.get("githubUrl")
    duplicate = find_duplicate_project(user_id, name=body.get("name"), url=body.get("url"),
                                        github_url=normalized_github)
    if duplicate:
        return duplicate_conflict(duplicate), 409

    project = Project(
        user_id=user_id,
        name=body["name"],
        description=body.get("description", ""),
        category=body["category"],
        status=body.get("status", "Want to Try"),
        url=body.get("url", ""),
        github_url=normalized_github,
        tags=body.get("tags", []),
        rating=body.get("rating"),
        notes=body.get("notes"),
        setup_notes=body.get("setupNotes", []),
        alternatives=body.get("alternatives", []),
    )
    db.session.add(project)
    db.session.commit()
    return project.to_dict(), 201


def update_project_for(user_id, project_id, body: dict):
    project = Project.query.filter_by(id=project_id, user_id=user_id).first()
    if not project:
        return {"message": "Project not found"}, 404

    errors = _validate_insert(body, partial=True)
    if errors:
        return {"message": "Invalid data", "errors": errors}, 400

    next_url = body.get("url", project.url)
    next_github = body.get("githubUrl", project.github_url)
    duplicate = find_duplicate_project(user_id, name=body.get("name", project.name), url=next_url,
                                        github_url=next_github, id_to_ignore=project.id)
    if duplicate:
        conflict = duplicate_conflict(duplicate)
        conflict["message"] = f'Update would duplicate "{duplicate.name}"'
        return conflict, 409

    normalized_github = normalize_github_url(next_github) or next_github

    field_map = {
        "name": "name", "description": "description", "category": "category", "status": "status",
        "url": "url", "tags": "tags", "rating": "rating", "notes": "notes",
        "setupNotes": "setup_notes", "alternatives": "alternatives",
    }
    for json_key, attr in field_map.items():
        if json_key in body:
            setattr(project, attr, body[json_key])
    if "githubUrl" in body:
        project.github_url = normalized_github

    project.updated_at = now_iso()
    db.session.commit()
    return project.to_dict(), 200


def delete_project_for(user_id, project_id):
    project = Project.query.filter_by(id=project_id, user_id=user_id).first()
    if not project:
        return {"message": "Project not found"}, 404

    ProjectEvent.query.filter_by(project_id=project_id, user_id=user_id).delete()
    db.session.delete(project)
    db.session.commit()
    return {"success": True}, 200


# ── Personal routes (auth-scoped to current_user) ───────────────────────────

@projects_bp.get("")
@login_required
def list_projects():
    return jsonify(list_projects_for(
        current_user.id,
        q=request.args.get("q"),
        category=request.args.get("category"),
        status=request.args.get("status"),
        tag=request.args.get("tag"),
    ))


@projects_bp.get("/<project_id>")
@login_required
def get_project(project_id):
    result = get_project_for(current_user.id, project_id)
    if not result:
        return jsonify({"message": "Project not found"}), 404
    return jsonify(result)


@projects_bp.post("")
@login_required
def create_project():
    body = request.get_json(silent=True) or {}
    result, status = create_project_for(current_user.id, body)
    return jsonify(result), status


@projects_bp.patch("/<project_id>")
@login_required
def update_project(project_id):
    body = request.get_json(silent=True) or {}
    result, status = update_project_for(current_user.id, project_id, body)
    return jsonify(result), status


@projects_bp.delete("/<project_id>")
@login_required
def delete_project(project_id):
    result, status = delete_project_for(current_user.id, project_id)
    return jsonify(result), status
