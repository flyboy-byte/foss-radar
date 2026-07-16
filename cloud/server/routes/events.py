from flask import Blueprint, jsonify
from flask_login import login_required, current_user

from models import ProjectEvent

events_bp = Blueprint("events", __name__, url_prefix="/api/events")


@events_bp.get("")
@login_required
def list_events():
    events = ProjectEvent.query.filter_by(user_id=current_user.id) \
        .order_by(ProjectEvent.created_at.desc()).limit(50).all()
    return jsonify([e.to_dict() for e in events])
