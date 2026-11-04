import os
from datetime import timedelta

from dotenv import load_dotenv

load_dotenv()  # before anything reads os.environ

import httpx
from flask import Flask, jsonify
from postgrest.exceptions import APIError

from routes import api
from utils import ApiError

app = Flask(__name__)
app.secret_key = os.environ["SECRET_KEY"]
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.environ.get("COOKIE_SECURE") == "1",  # set to 1 on HTTPS
    PERMANENT_SESSION_LIFETIME=timedelta(hours=8),
)

# Only needed when the frontend runs on another origin, e.g. http://localhost:5173
if os.environ.get("FRONTEND_ORIGIN"):
    from flask_cors import CORS
    CORS(app, supports_credentials=True, origins=[os.environ["FRONTEND_ORIGIN"]])

app.register_blueprint(api)


@app.errorhandler(ApiError)
def handle_api_error(e):
    return jsonify(error=e.message), e.status


@app.errorhandler(APIError)
def handle_db_error(e):
    code = str(getattr(e, "code", "") or "")
    if code == "23505":  # unique violation
        return jsonify(error="a record with that value already exists"), 409
    if code == "23503":  # foreign key violation
        return jsonify(error="invalid reference, or the record is still in use"), 409
    if code in ("23502", "23514"):  # not-null / check constraint
        return jsonify(error="invalid data"), 400
    if code.startswith("22"):  # bad enum value, date or number
        return jsonify(error="invalid data format"), 400
    app.logger.error("database error %s: %s", code, e)
    return jsonify(error="database error"), 500


@app.errorhandler(httpx.TransportError)
def handle_db_down(e):
    app.logger.error("cannot reach Supabase: %s", e)
    return jsonify(error="database unavailable"), 503


if __name__ == "__main__":
    app.run(debug=True)