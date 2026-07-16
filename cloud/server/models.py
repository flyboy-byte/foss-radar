import uuid
from datetime import datetime, timezone

from flask_login import UserMixin
from sqlalchemy.orm import validates
from werkzeug.security import generate_password_hash, check_password_hash

from extensions import db

CATEGORIES = ["Linux Apps", "Self-Hosted", "Android Apps", "Ham Radio", "Utilities", "Customization"]
STATUSES = ["Want to Try", "Using", "Archived"]
EVENT_TYPES = ["star_jump", "health_change", "release"]


def new_id() -> str:
    return str(uuid.uuid4())


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class User(db.Model, UserMixin):
    __tablename__ = "users"

    id = db.Column(db.Text, primary_key=True, default=new_id)
    email = db.Column(db.Text, unique=True, nullable=False)
    password_hash = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.Text, nullable=False, default=now_iso)

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {"id": self.id, "email": self.email, "createdAt": self.created_at}


class Project(db.Model):
    __tablename__ = "projects"

    id = db.Column(db.Text, primary_key=True, default=new_id)
    user_id = db.Column(db.Text, db.ForeignKey("users.id"), nullable=False, index=True)

    name = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text, nullable=False, default="")
    category = db.Column(db.Text, nullable=False)
    status = db.Column(db.Text, nullable=False, default="Want to Try")
    url = db.Column(db.Text, nullable=False, default="")
    github_url = db.Column(db.Text)
    tags = db.Column(db.JSON, nullable=False, default=list)
    rating = db.Column(db.Integer)
    notes = db.Column(db.Text)
    setup_notes = db.Column(db.JSON, nullable=False, default=list)
    alternatives = db.Column(db.JSON, nullable=False, default=list)

    github_stars = db.Column(db.Integer)
    github_forks = db.Column(db.Integer)
    github_last_commit = db.Column(db.Text)
    github_open_issues = db.Column(db.Integer)
    github_license = db.Column(db.Text)
    github_description = db.Column(db.Text)

    previous_github_stars = db.Column(db.Integer)
    previous_github_forks = db.Column(db.Integer)
    previous_github_open_issues = db.Column(db.Integer)
    github_latest_release = db.Column(db.Text)

    last_monitored = db.Column(db.Text)
    is_seeded = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.Text, nullable=False, default=now_iso)
    updated_at = db.Column(db.Text, nullable=False, default=now_iso)

    @validates("category")
    def validate_category(self, key, value):
        if value not in CATEGORIES:
            raise ValueError(f"Invalid category: {value}")
        return value

    @validates("status")
    def validate_status(self, key, value):
        if value not in STATUSES:
            raise ValueError(f"Invalid status: {value}")
        return value

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "status": self.status,
            "url": self.url,
            "githubUrl": self.github_url,
            "tags": self.tags or [],
            "rating": self.rating,
            "notes": self.notes,
            "setupNotes": self.setup_notes or [],
            "alternatives": self.alternatives or [],
            "githubStars": self.github_stars,
            "githubForks": self.github_forks,
            "githubLastCommit": self.github_last_commit,
            "githubOpenIssues": self.github_open_issues,
            "githubLicense": self.github_license,
            "githubDescription": self.github_description,
            "previousGithubStars": self.previous_github_stars,
            "previousGithubForks": self.previous_github_forks,
            "previousGithubOpenIssues": self.previous_github_open_issues,
            "githubLatestRelease": self.github_latest_release,
            "lastMonitored": self.last_monitored,
            "isSeeded": self.is_seeded,
            "createdAt": self.created_at,
            "updatedAt": self.updated_at,
        }


class DiscoverySearch(db.Model):
    __tablename__ = "discovery_searches"

    id = db.Column(db.Text, primary_key=True, default=new_id)
    user_id = db.Column(db.Text, db.ForeignKey("users.id"), nullable=False, index=True)

    query = db.Column(db.Text, nullable=False)
    category = db.Column(db.Text)
    tags = db.Column(db.JSON, nullable=False, default=list)
    min_stars = db.Column(db.Integer)
    language = db.Column(db.Text)
    results = db.Column(db.Text)
    created_at = db.Column(db.Text, nullable=False, default=now_iso)

    def to_dict(self):
        return {
            "id": self.id,
            "query": self.query,
            "category": self.category,
            "tags": self.tags or [],
            "minStars": self.min_stars,
            "language": self.language,
            "results": self.results,
            "createdAt": self.created_at,
        }


class ProjectEvent(db.Model):
    __tablename__ = "project_events"

    id = db.Column(db.Text, primary_key=True, default=new_id)
    user_id = db.Column(db.Text, db.ForeignKey("users.id"), nullable=False, index=True)
    project_id = db.Column(db.Text, nullable=False)
    project_name = db.Column(db.Text, nullable=False)
    type = db.Column(db.Text, nullable=False)
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.Text, nullable=False, default=now_iso)

    @validates("type")
    def validate_type(self, key, value):
        if value not in EVENT_TYPES:
            raise ValueError(f"Invalid event type: {value}")
        return value

    def to_dict(self):
        return {
            "id": self.id,
            "projectId": self.project_id,
            "projectName": self.project_name,
            "type": self.type,
            "message": self.message,
            "createdAt": self.created_at,
        }
