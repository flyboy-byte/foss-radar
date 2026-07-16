from flask import Blueprint, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user

from extensions import db
from models import User
from seed import seed_user_library

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def _normalize_email(email: str) -> str:
    return email.strip().lower()


@auth_bp.post("/register")
def register():
    body = request.get_json(silent=True) or {}
    email = body.get("email")
    password = body.get("password")

    if not email or not isinstance(email, str) or "@" not in email:
        return jsonify({"message": "A valid email is required"}), 400
    if not password or not isinstance(password, str) or len(password) < 8:
        return jsonify({"message": "Password must be at least 8 characters"}), 400

    email = _normalize_email(email)
    if User.query.filter_by(email=email).first():
        return jsonify({"message": "An account with that email already exists"}), 409

    user = User(email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    seed_user_library(user.id)

    login_user(user)
    return jsonify(user.to_dict()), 201


@auth_bp.post("/login")
def login():
    body = request.get_json(silent=True) or {}
    email = body.get("email")
    password = body.get("password")

    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400

    user = User.query.filter_by(email=_normalize_email(email)).first()
    if not user or not user.check_password(password):
        return jsonify({"message": "Invalid email or password"}), 401

    login_user(user)
    return jsonify(user.to_dict())


@auth_bp.post("/logout")
@login_required
def logout():
    logout_user()
    return jsonify({"success": True})


@auth_bp.get("/me")
@login_required
def me():
    return jsonify(current_user.to_dict())
