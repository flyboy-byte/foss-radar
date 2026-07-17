import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

from flask import Flask, jsonify, send_from_directory
from sqlalchemy import event

from extensions import db, login_manager
from models import User

DIST_DIR = Path(__file__).resolve().parent.parent / "dist" / "public"


def _enable_sqlite_pragmas(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA busy_timeout=5000")
    cursor.close()


def create_app():
    app = Flask(__name__)

    base_dir = Path(__file__).resolve().parent
    db_path = os.environ.get("DATABASE_PATH", str(base_dir / "foss-radar-cloud.db"))

    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-secret-change-me")
    app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{db_path}"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SESSION_COOKIE_HTTPONLY"] = True
    app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
    # Off by default for local http dev; set SESSION_COOKIE_SECURE=true behind HTTPS in production.
    app.config["SESSION_COOKIE_SECURE"] = os.environ.get("SESSION_COOKIE_SECURE", "false").lower() == "true"

    db.init_app(app)
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(user_id):
        return db.session.get(User, user_id)

    @login_manager.unauthorized_handler
    def unauthorized():
        return jsonify({"message": "Authentication required"}), 401

    with app.app_context():
        event.listen(db.engine, "connect", _enable_sqlite_pragmas)
        db.create_all()

        from auth import auth_bp
        from routes.projects import projects_bp
        from routes.monitor import monitor_bp
        from routes.discover import discover_bp
        from routes.events import events_bp
        from routes.stats import stats_bp
        from routes.export import export_bp

        app.register_blueprint(auth_bp)
        app.register_blueprint(projects_bp)
        app.register_blueprint(monitor_bp)
        app.register_blueprint(discover_bp)
        app.register_blueprint(events_bp)
        app.register_blueprint(stats_bp)
        app.register_blueprint(export_bp)

    # Serve the built React SPA — nginx proxies everything to gunicorn on this box
    # (matches the other apps' convention here), so unlike a dev setup with a
    # separate static file server, Flask itself needs to serve the built assets.
    # Registered after the API blueprints; Werkzeug's routing already prioritizes
    # the blueprints' literal /api/... rules over this path:path catch-all, so
    # order here doesn't change matching, only readability.
    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_frontend(path):
        target = DIST_DIR / path if path else None
        if target and target.is_file():
            return send_from_directory(DIST_DIR, path)
        return send_from_directory(DIST_DIR, "index.html")

    return app
