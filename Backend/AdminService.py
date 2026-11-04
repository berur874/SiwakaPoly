from db import db, fetch_all, first, pick, semester_or_current, update_row
from utils import ApiError, require

# table -> (primary key, columns). Names are constants, so they are safe to use as table names.
LOOKUPS = {
    "departments": ("department_id", ["department_code", "department_name"]),
    "courses": ("course_id", ["department_id", "course_code", "course_name", "level", "duration_semesters"]),
    "units": ("unit_id", ["course_id", "unit_code", "unit_name", "year_of_study", "semester_no", "credit_hours"]),
    "semesters": ("semester_id", ["academic_year", "semester_name", "start_date", "end_date"]),
}

STUDENT_COLS = ["admission_no", "first_name", "last_name", "gender", "date_of_birth", "phone",
                "email", "course_id", "year_of_study", "admission_date", "status"]
LECTURER_COLS = ["staff_no", "first_name", "last_name", "phone", "email", "department_id"]


class AdminService:
    def __init__(self, auth):
        self.auth = auth

    # ---- departments, courses, units, semesters ----
    def _lookup(self, table):
        if table not in LOOKUPS:
            raise ApiError("not found", 404)
        return LOOKUPS[table]

    def create_lookup(self, table, data):
        _, cols = self._lookup(table)
        require(data, *cols)
        return db().table(table).insert(pick(data, cols)).execute().data[0]

    def list_lookup(self, table):
        pk, _ = self._lookup(table)
        return fetch_all(lambda: db().table(table).select("*").order(pk))

    def update_lookup(self, table, item_id, data):
        pk, cols = self._lookup(table)
        update_row(table, pk, item_id, data, cols)
        return {"message": "updated"}

    def set_current_semester(self, semester_id):
        if first(db().table("semesters").select("semester_id").eq("semester_id", semester_id)) is None:
            raise ApiError("semester not found", 404)
        db().table("semesters").update({"is_current": False}).eq("is_current", True).execute()
        db().table("semesters").update({"is_current": True}).eq("semester_id", semester_id).execute()
        return {"message": "current semester updated"}

    # ---- students and lecturers ----
    def _register(self, role, table, columns, username_field, data):
        """Creates the login (users row) and the profile row. The Supabase client has no
        multi-table transaction, so if the profile insert fails the login is removed again."""
        user_id = self.auth.create_user(data[username_field], data["password"], role)
        try:
            return db().table(table).insert(dict(pick(data, columns), user_id=user_id)).execute().data[0]
        except Exception:
            self.auth.delete_user(user_id)
            raise

    def register_student(self, data):
        require(data, "admission_no", "first_name", "last_name", "gender", "date_of_birth",
                "course_id", "admission_date", "password")
        return self._register("student", "students", STUDENT_COLS, "admission_no", data)

    def register_lecturer(self, data):
        require(data, "staff_no", "first_name", "last_name", "department_id", "password")
        return self._register("lecturer", "lecturers", LECTURER_COLS, "staff_no", data)

    def list_students(self, course_id=None):
        def query():
            q = db().table("students").select(
                "student_id, user_id, admission_no, first_name, last_name, gender, phone, email, "
                "course_id, year_of_study, status, courses(course_name), users(status)"
            )
            if course_id:
                q = q.eq("course_id", course_id)
            return q.order("admission_no")

        rows = fetch_all(query)
        for r in rows:
            r["course_name"] = (r.pop("courses") or {}).get("course_name")
            r["account_status"] = (r.pop("users") or {}).get("status")
            r["student_status"] = r.pop("status")
        return rows

    def list_lecturers(self):
        rows = fetch_all(lambda: db().table("lecturers").select(
            "lecturer_id, user_id, staff_no, first_name, last_name, phone, email, department_id, "
            "departments(department_name), users(status)"
        ).order("staff_no"))
        for r in rows:
            r["department_name"] = (r.pop("departments") or {}).get("department_name")
            r["account_status"] = (r.pop("users") or {}).get("status")
        return rows

    def update_student(self, student_id, data):
        update_row("students", "student_id", student_id, data, STUDENT_COLS)
        return {"message": "updated"}

    def update_lecturer(self, lecturer_id, data):
        update_row("lecturers", "lecturer_id", lecturer_id, data, LECTURER_COLS)
        return {"message": "updated"}

    # ---- accounts ----
    def set_account_status(self, user_id, status, acting_admin_id):
        if status not in ("active", "inactive"):
            raise ApiError("status must be 'active' or 'inactive'")
        if user_id == acting_admin_id:
            raise ApiError("you cannot change your own account status", 409)
        # Setting active also clears a lock
        res = db().table("users").update(
            {"status": status, "failed_attempts": 0}
        ).eq("user_id", user_id).execute()
        if not res.data:
            raise ApiError("user not found", 404)
        return {"message": f"account set to {status}"}

    # ---- allocations and fees ----
    def allocate_unit(self, data):
        require(data, "unit_id", "lecturer_id", "semester_id")
        row = pick(data, ["unit_id", "lecturer_id", "semester_id"])
        # One lecturer per unit per semester; allocating again reassigns
        return db().table("unit_allocations").upsert(row, on_conflict="unit_id,semester_id").execute().data[0]

    def set_fee_structure(self, data):
        require(data, "course_id", "semester_id", "amount_due")
        row = pick(data, ["course_id", "semester_id", "amount_due"])
        return db().table("fee_structures").upsert(row, on_conflict="course_id,semester_id").execute().data[0]

    def record_payment(self, data, received_by):
        cols = ["student_id", "semester_id", "amount_paid", "payment_date", "payment_method", "reference_no"]
        require(data, *cols)
        row = dict(pick(data, cols), received_by=received_by)
        return db().table("fee_payments").insert(row).execute().data[0]

    def outstanding_fees(self, semester_id=None):
        sem = semester_or_current(semester_id)
        due = {r["course_id"]: r["amount_due"] for r in
               db().table("fee_structures").select("course_id, amount_due").eq("semester_id", sem).execute().data}
        students = fetch_all(lambda: db().table("students")
                             .select("student_id, admission_no, first_name, last_name, course_id")
                             .eq("status", "active").order("student_id"))
        paid = {}
        for p in fetch_all(lambda: db().table("fee_payments").select("payment_id, student_id, amount_paid")
                           .eq("semester_id", sem).order("payment_id")):
            paid[p["student_id"]] = paid.get(p["student_id"], 0) + p["amount_paid"]

        report = []
        for s in students:
            if s["course_id"] not in due:
                continue
            amount_paid = round(paid.get(s["student_id"], 0), 2)
            balance = round(due[s["course_id"]] - amount_paid, 2)
            if balance > 0:
                report.append({"student_id": s["student_id"], "admission_no": s["admission_no"],
                               "first_name": s["first_name"], "last_name": s["last_name"],
                               "amount_due": due[s["course_id"]], "amount_paid": amount_paid,
                               "balance": balance})
        return sorted(report, key=lambda r: r["admission_no"])