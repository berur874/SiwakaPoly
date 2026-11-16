from werkzeug.security import check_password_hash, generate_password_hash

from db import db, first, now_iso
from utils import ApiError

MAX_ATTEMPTS = 3
MIN_PASSWORD_LENGTH = 8


def _check_strength(password):
    if not isinstance(password, str) or len(password) < MIN_PASSWORD_LENGTH:
        raise ApiError(f"password must be at least {MIN_PASSWORD_LENGTH} characters")


class AuthService:
    def create_user(self, username, password, role):
        _check_strength(password)
        res = db().table("users").insert({
            "username": username,
            "password_hash": generate_password_hash(password),
            "role": role,
        }).execute()
        return res.data[0]["user_id"]

    def delete_user(self, user_id):
        """Only used to undo a half-finished registration."""
        db().table("users").delete().eq("user_id", user_id).execute()

    def login(self, username, password):
        """Returns (user_id, role, None) on success or (None, None, reason)."""
        user = first(
            db().table("users")
            .select("user_id, password_hash, role, status, failed_attempts")
            .eq("username", username)
        )
        if user is None:
            return None, None, "invalid"
        if user["status"] == "locked":
            return None, None, "locked"
        if user["status"] == "inactive":
            return None, None, "inactive"

        if not check_password_hash(user["password_hash"], password):
            attempts = user["failed_attempts"] + 1
            patch = {"failed_attempts": attempts}
            if attempts >= MAX_ATTEMPTS:
                patch["status"] = "locked"
            db().table("users").update(patch).eq("user_id", user["user_id"]).execute()
            return None, None, "invalid"

        db().table("users").update(
            {"failed_attempts": 0, "last_login": now_iso()}
        ).eq("user_id", user["user_id"]).execute()
        return user["user_id"], user["role"], None

    def change_password(self, user_id, old_password, new_password):
        _check_strength(new_password)
        user = first(db().table("users").select("password_hash").eq("user_id", user_id))
        if user is None or not check_password_hash(user["password_hash"], old_password):
            raise ApiError("current password is incorrect", 401)
        db().table("users").update(
            {"password_hash": generate_password_hash(new_password)}
        ).eq("user_id", user_id).execute()

    def reset_password(self, user_id, new_password):
        """Admin action. Also unlocks the account."""
        _check_strength(new_password)
        res = db().table("users").update({
            "password_hash": generate_password_hash(new_password),
            "failed_attempts": 0,
            "status": "active",
        }).eq("user_id", user_id).execute()
        if not res.data:
            raise ApiError("user not found", 404)