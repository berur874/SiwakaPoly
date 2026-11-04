import math
from collections import Counter

from db import db, fetch_all, first, now_iso, one, semester_or_current
from utils import ApiError, require, with_totals

ATTENDANCE_STATUSES = {"Present", "Absent", "Late", "Excused"}


def _mark(value, high, name):
    if value in (None, ""):
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        raise ApiError(f"{name} must be a number")
    if not math.isfinite(number) or not 0 <= number <= high:
        raise ApiError(f"{name} must be between 0 and {high}")
    return number


def _reg_id(item):
    try:
        return int(item["registration_id"])
    except (KeyError, TypeError, ValueError):
        raise ApiError("each item needs a numeric registration_id")


class LecturerService:
    def _lecturer_id(self, user_id):
        row = first(db().table("lecturers").select("lecturer_id").eq("user_id", user_id))
        if row is None:
            raise ApiError("lecturer record not found", 404)
        return row["lecturer_id"]

    def _check_allocation(self, lecturer_id, unit_id, semester_id):
        row = first(db().table("unit_allocations").select("allocation_id")
                    .eq("lecturer_id", lecturer_id).eq("unit_id", unit_id).eq("semester_id", semester_id))
        if row is None:
            raise ApiError("you are not allocated to this unit this semester", 403)

    def _class(self, unit_id, semester_id):
        """All registrations for the unit, with student details and any marks."""
        return fetch_all(lambda: db().table("registrations").select(
            "registration_id, students(student_id, admission_no, first_name, last_name), "
            "marks(cat_mark, exam_mark)"
        ).eq("unit_id", unit_id).eq("semester_id", semester_id).order("registration_id"))

    def my_units(self, user_id, semester_id=None):
        lecturer_id = self._lecturer_id(user_id)
        sem = semester_or_current(semester_id)
        allocations = (db().table("unit_allocations")
                       .select("unit_id, semester_id, units(unit_code, unit_name, courses(course_name))")
                       .eq("lecturer_id", lecturer_id).eq("semester_id", sem).execute().data)
        unit_ids = [a["unit_id"] for a in allocations]
        counts = Counter()
        if unit_ids:
            counts.update(r["unit_id"] for r in fetch_all(
                lambda: db().table("registrations").select("registration_id, unit_id")
                .in_("unit_id", unit_ids).eq("semester_id", sem).order("registration_id")))
        out = []
        for a in allocations:
            unit = one(a["units"])
            out.append({"unit_id": a["unit_id"], "semester_id": a["semester_id"],
                        "unit_code": unit["unit_code"], "unit_name": unit["unit_name"],
                        "course_name": (one(unit["courses"]) or {}).get("course_name"),
                        "students_registered": counts[a["unit_id"]]})
        return sorted(out, key=lambda u: u["unit_code"])

    def class_list(self, user_id, unit_id, semester_id=None):
        lecturer_id = self._lecturer_id(user_id)
        sem = semester_or_current(semester_id)
        self._check_allocation(lecturer_id, unit_id, sem)
        out = []
        for r in self._class(unit_id, sem):
            student, marks = one(r["students"]), one(r["marks"]) or {}
            out.append(with_totals({
                "registration_id": r["registration_id"], **student,
                "cat_mark": marks.get("cat_mark"), "exam_mark": marks.get("exam_mark"),
            }))
        return sorted(out, key=lambda r: r["admission_no"])

    def record_attendance(self, user_id, unit_id, data, semester_id=None):
        require(data, "date", "records")
        records = data["records"]
        if not isinstance(records, list) or not records:
            raise ApiError("records must be a non-empty list")
        for rec in records:
            if rec.get("status") not in ATTENDANCE_STATUSES:
                raise ApiError(f"status must be one of {sorted(ATTENDANCE_STATUSES)}")

        lecturer_id = self._lecturer_id(user_id)
        sem = semester_or_current(semester_id)
        self._check_allocation(lecturer_id, unit_id, sem)
        valid = {r["registration_id"] for r in self._class(unit_id, sem)}
        rows = []
        for rec in records:
            reg_id = _reg_id(rec)
            if reg_id not in valid:
                raise ApiError(f"registration {reg_id} is not in this unit")
            rows.append({"registration_id": reg_id, "attendance_date": data["date"],
                         "status": rec["status"], "recorded_by": lecturer_id})
        db().table("attendance").upsert(rows, on_conflict="registration_id,attendance_date").execute()
        return {"message": "attendance saved", "count": len(rows)}

    def enter_marks(self, user_id, unit_id, data, semester_id=None):
        require(data, "entries")
        entries = data["entries"]
        if not isinstance(entries, list) or not entries:
            raise ApiError("entries must be a non-empty list")

        cleaned = []
        for e in entries:
            cat, exam = _mark(e.get("cat_mark"), 30, "cat_mark"), _mark(e.get("exam_mark"), 70, "exam_mark")
            if cat is None and exam is None:
                raise ApiError("each entry needs cat_mark and/or exam_mark")
            cleaned.append((_reg_id(e), cat, exam))

        lecturer_id = self._lecturer_id(user_id)
        sem = semester_or_current(semester_id)
        self._check_allocation(lecturer_id, unit_id, sem)
        existing = {r["registration_id"]: one(r["marks"]) or {} for r in self._class(unit_id, sem)}

        rows = []
        for reg_id, cat, exam in cleaned:
            if reg_id not in existing:
                raise ApiError(f"registration {reg_id} is not in this unit")
            old = existing[reg_id]
            # A missing value keeps what is stored already (CAT now, exam later)
            rows.append({
                "registration_id": reg_id,
                "cat_mark": cat if cat is not None else (old.get("cat_mark") or 0),
                "exam_mark": exam if exam is not None else (old.get("exam_mark") or 0),
                "entered_by": lecturer_id,
                "updated_at": now_iso(),
            })
        db().table("marks").upsert(rows, on_conflict="registration_id").execute()
        return {"message": "marks saved", "count": len(rows)}