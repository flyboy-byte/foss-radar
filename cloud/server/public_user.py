import secrets

from extensions import db
from models import User

# The shared community board is just a regular user's project library, owned by this
# well-known system account. Resolved by email (not a hardcoded ID) so it survives a
# fresh db.create_all(). Its password is a random, unguessable token — nobody is meant
# to log into this account directly, only reach its library through the /api/public/*
# routes, which don't require auth at all.
PUBLIC_USER_EMAIL = "public@radar.local"
PUBLIC_USERNAME = "public"


def get_or_create_public_user() -> User:
    user = User.query.filter_by(email=PUBLIC_USER_EMAIL).first()
    if user:
        return user

    user = User(email=PUBLIC_USER_EMAIL, username=PUBLIC_USERNAME)
    user.set_password(secrets.token_hex(32))
    db.session.add(user)
    db.session.commit()
    return user
