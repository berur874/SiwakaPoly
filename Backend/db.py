import os
from datetime import datetime, timezone
from functools import lru_cache

from supabase import create_client

from utils import ApiError

PAGE = 1000  # Supabase returns at most 1000 rows per request


@lru_cache(maxsize=1)
def get_client():
    # The service key bypasses RLS: keep it in the backend .env only, never in the frontend
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])


def db():
    return get_client()


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def first(query):
    data = query.limit(1).execute().data
    return data[0] if data else None


def fetch_all(make_query):
    """Pages through results. make_query must build a fresh, ordered query on every call."""
    rows, start = [], 0
    while True:
        batch = make_query().range(start, start + PAGE - 1).execute().data
        rows.extend(batch)
        if len(batch) < PAGE:
            return rows
        start += PAGE


def one(value):
    """Embedded rows come back as a dict, a list or None depending on the relationship; normalise."""
    if isinstance(value, list):
        return value[0] if value else None
    return value


def pick(data, columns):
    """Keeps only whitelisted columns, and turns "" into NULL."""
    return {c: (None if data[c] == "" else data[c]) for c in columns if c in data}


def update_row(table, pk, pk_value, data, columns):
    values = pick(data, columns)
    if not values:
        raise ApiError("nothing to update")
    res = db().table(table).update(values).eq(pk, pk_value).execute()
    if not res.data:
        raise ApiError("record not found", 404)


def current_semester_id():
    row = first(db().table("semesters").select("semester_id").eq("is_current", True))
    if row is None:
        raise ApiError("no current semester has been set", 409)
    return row["semester_id"]


def semester_or_current(semester_id):
    return semester_id if semester_id else current_semester_id()