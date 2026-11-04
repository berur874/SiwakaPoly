class ApiError(Exception):
    """Raised for expected failures; app.py turns it into a JSON response."""

    def __init__(self, message, status=400):
        super().__init__(message)
        self.message = message
        self.status = status


def require(data, *fields):
    missing = [f for f in fields if data.get(f) in (None, "")]
    if missing:
        raise ApiError("missing fields: " + ", ".join(missing), 400)


def grade_for(total):
    # Scale from the project outline; adjust to the polytechnic's grading policy.
    if total >= 70:
        return "A"
    if total >= 60:
        return "B"
    if total >= 50:
        return "C"
    if total >= 40:
        return "D"
    return "E"


def with_totals(row):
    """Adds total_mark and grade, computed here so we never depend on how the DB stores them."""
    cat, exam = row.get("cat_mark"), row.get("exam_mark")
    if cat is None or exam is None:
        row["total_mark"], row["grade"] = None, None
    else:
        row["total_mark"] = round(cat + exam, 2)
        row["grade"] = grade_for(row["total_mark"])
    return row