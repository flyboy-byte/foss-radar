import re

from flask import Blueprint, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user

from extensions import db
from models import User
from seed import seed_user_library

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

USERNAME_RE = re.compile(r"^[a-z0-9_]{3,32}$")


def _normalize(value: str) -> str:
    return value.strip().lower()


@auth_bp.post("/register")
def register():
    body = request.get_json(silent=True) or {}
    username = body.get("username") or None
    email = body.get("email") or None
    password = body.get("password")

    if not username and not email:
        return jsonify({"message": "Provide a username, an email, or both"}), 400
    if username is not None and (not isinstance(username, str) or not USERNAME_RE.match(_normalize(username))):
        return jsonify({"message": "Username must be 3-32 characters: lowercase letters, numbers, underscores"}), 400
    if email is not None and (not isinstance(email, str) or "@" not in email):
        return jsonify({"message": "That doesn't look like a valid email"}), 400
    if not password or not isinstance(password, str) or len(password) < 8:
        return jsonify({"message": "Password must be at least 8 characters"}), 400

    username = _normalize(username) if username else None
    email = _normalize(email) if email else None

    if username and User.query.filter_by(username=username).first():
        return jsonify({"message": "That username is already taken"}), 409
    if email and User.query.filter_by(email=email).first():
        return jsonify({"message": "An account with that email already exists"}), 409

    user = User(username=username, email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    seed_user_library(user.id)

    login_user(user)
    return jsonify(user.to_dict()), 201


@auth_bp.post("/login")
def login():
    body = request.get_json(silent=True) or {}
    identifier = body.get("identifier")
    password = body.get("password")

    if not identifier or not password:
        return jsonify({"message": "Username/email and password are required"}), 400

    identifier = _normalize(identifier)
    user = User.query.filter((User.username == identifier) | (User.email == identifier)).first()
    if not user or not user.check_password(password):
        return jsonify({"message": "Invalid credentials"}), 401

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
