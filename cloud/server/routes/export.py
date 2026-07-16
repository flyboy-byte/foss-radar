from flask import Blueprint, jsonify
from flask_login import login_required, current_user

from models import Project, now_iso

export_bp = Blueprint("export", __name__, url_prefix="/api/export")


@export_bp.get("")
@login_required
def export_projects():
    projects = Project.query.filter_by(user_id=current_user.id).all()
    response = jsonify({"exportedAt": now_iso(), "projects": [p.to_dict() for p in projects]})
    response.headers["Content-Disposition"] = 'attachment; filename="foss-radar-export.json"'
    return response
