import os
from dotenv import load_dotenv

load_dotenv()

from flask import Flask
from routes import api

app = Flask(__name__)

# Required for sessions. Set it as an environment variable, never hardcode it.
app.secret_key = os.environ["SECRET_KEY"]

# Safer session cookies
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,   # JavaScript can't read the cookie
    SESSION_COOKIE_SAMESITE="Lax",  # basic CSRF protection
    # SESSION_COOKIE_SECURE=True,   # enable once you serve over HTTPS
)

app.register_blueprint(api)

if __name__ == "__main__":
    app.run(debug=True)