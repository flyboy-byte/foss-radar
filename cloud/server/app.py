import os
from pathlib import Path

from flask import Flask, jsonify
from sqlalchemy import event

from extensions import db, login_manager
from models import User


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

    return app
