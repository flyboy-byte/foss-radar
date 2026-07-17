import time

from flask import Blueprint, request, jsonify

from public_user import get_or_create_public_user
from routes.projects import (
    list_projects_for, get_project_for, create_project_for,
    update_project_for, delete_project_for,
)
from routes.stats import compute_stats_for
from routes.monitor import sync_project
from models import Project

# The public community board: a regular project library, scoped to the shared
# "public" system account (see public_user.py), with NO auth on any route here.
# Every handler resolves the same public user_id and calls the exact same _*_for()
# helpers the personal /api/projects routes use — the only thing that differs is
# the absence of @login_required and current_user. Never touch a Project by id here
# without going through these helpers, which filter by user_id=public_user.id — that
# scoping is what stops a public request from reaching into a personal library.

public_bp = Blueprint("public", __name__, url_prefix="/api/public")


@public_bp.get("/projects")
def list_public_projects():
    public_user = get_or_create_public_user()
    return jsonify(list_projects_for(
        public_user.id,
        q=request.args.get("q"),
        category=request.args.get("category"),
        status=request.args.get("status"),
        tag=request.args.get("tag"),
    ))


@public_bp.get("/projects/<project_id>")
def get_public_project(project_id):
    public_user = get_or_create_public_user()
    result = get_project_for(public_user.id, project_id)
    if not result:
        return jsonify({"message": "Project not found"}), 404
    return jsonify(result)


@public_bp.post("/projects")
def create_public_project():
    public_user = get_or_create_public_user()
    body = request.get_json(silent=True) or {}
    result, status = create_project_for(public_user.id, body)
    return jsonify(result), status


@public_bp.patch("/projects/<project_id>")
def update_public_project(project_id):
    public_user = get_or_create_public_user()
    body = request.get_json(silent=True) or {}
    result, status = update_project_for(public_user.id, project_id, body)
    return jsonify(result), status


@public_bp.delete("/projects/<project_id>")
def delete_public_project(project_id):
    public_user = get_or_create_public_user()
    result, status = delete_project_for(public_user.id, project_id)
    return jsonify(result), status


@public_bp.post("/projects/<project_id>/monitor")
def monitor_public_project(project_id):
    public_user = get_or_create_public_user()
    project = Project.query.filter_by(id=project_id, user_id=public_user.id).first()
    if not project:
        return jsonify({"message": "Project not found"}), 404
    if not project.github_url:
        return jsonify({"message": "No GitHub URL configured"}), 400

    result = sync_project(project)
    if not result:
        return jsonify({"message": "Could not fetch GitHub data"}), 502
    return jsonify(result)


@public_bp.post("/monitor/all")
def monitor_public_all():
    public_user = get_or_create_public_user()
    projects = Project.query.filter_by(user_id=public_user.id).all()
    with_github = [p for p in projects if p.github_url]

    results = []
    for project in with_github:
        try:
            result = sync_project(project)
            if result:
                results.append({"id": project.id, "name": project.name, "success": True})
            else:
                results.append({"id": project.id, "name": project.name, "success": False, "error": "No data returned"})
        except Exception as err:  # noqa: BLE001
            results.append({"id": project.id, "name": project.name, "success": False, "error": str(err)})
        time.sleep(0.3)

    return jsonify({"results": results, "total": len(with_github)})


@public_bp.get("/stats")
def public_stats():
    public_user = get_or_create_public_user()
    return jsonify(compute_stats_for(public_user.id))
