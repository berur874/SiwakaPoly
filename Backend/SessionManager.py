from functools import wraps
from flask import session, jsonify


class SessionManager:
    @staticmethod
    def start(user_id, role):
        session.clear()
        session["user_id"] = user_id
        session["role"] = role  # "student" or "teacher"

    @staticmethod
    def end():
        session.clear()

    @staticmethod
    def current():
        return session.get("user_id"), session.get("role")

    @staticmethod
    def require_role(role):
        def decorator(fn):
            @wraps(fn)
            def wrapper(*args, **kwargs):
                if session.get("role") != role:
                    return jsonify(error="unauthorized"), 401
                return fn(*args, **kwargs)
            return wrapper
        return decorator