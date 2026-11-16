from functools import wraps

from flask import jsonify, session


class SessionManager:
    @staticmethod
    def start(user_id, role):
        session.clear()
        session.permanent = True  # lifetime set in app.py
        session["user_id"] = user_id
        session["role"] = role

    @staticmethod
    def end():
        session.clear()

    @staticmethod
    def current():
        return session.get("user_id"), session.get("role")

    @staticmethod
    def require_role(*roles):
        def decorator(fn):
            @wraps(fn)
            def wrapper(*args, **kwargs):
                if "user_id" not in session:
                    return jsonify(error="login required"), 401
                if session.get("role") not in roles:
                    return jsonify(error="forbidden"), 403
                return fn(*args, **kwargs)
            return wrapper
        return decorator