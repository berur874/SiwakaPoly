from db import current_semester_id, db, first, one, semester_or_current
from utils import ApiError, with_totals


class StudentService:
    def _student(self, user_id):
        s = first(db().table("students")
                  .select("student_id, course_id, year_of_study, status").eq("user_id", user_id))
        if s is None:
            raise ApiError("student record not found", 404)
        return s

    def profile(self, user_id):
        row = first(db().table("students").select(
            "student_id, admission_no, first_name, last_name, gender, email, phone, year_of_study, "
            "status, courses(course_name, departments(department_name))"
        ).eq("user_id", user_id))
        if row is None:
            raise ApiError("student record not found", 404)
        course = row.pop("courses") or {}
        row["course_name"] = course.get("course_name")
        row["department_name"] = (course.get("departments") or {}).get("department_name")
        return row

    def _eligible(self, student, semester_id):
        """Units in the student's course and year whose semester number matches the semester
        ("Semester 2" -> 2), each flagged with whether the student already registered."""
        sem = first(db().table("semesters").select("semester_name").eq("semester_id", semester_id))
        semester_no = int(sem["semester_name"][-1])
        units = (db().table("units").select("unit_id, unit_code, unit_name, credit_hours")
                 .eq("course_id", student["course_id"]).eq("year_of_study", student["year_of_study"])
                 .eq("semester_no", semester_no).order("unit_code").execute().data)
        done = {r["unit_id"] for r in db().table("registrations").select("unit_id")
                .eq("student_id", student["student_id"]).eq("semester_id", semester_id).execute().data}
        for u in units:
            u["registered"] = u["unit_id"] in done
        return units

    def available_units(self, user_id):
        return self._eligible(self._student(user_id), current_semester_id())

    def register_units(self, user_id, unit_ids):
        try:
            unit_ids = {int(i) for i in (unit_ids or [])}
        except (TypeError, ValueError):
            raise ApiError("unit_ids must be a list of numbers")
        if not unit_ids:
            raise ApiError("unit_ids is required")

        student = self._student(user_id)
        if student["status"] != "active":
            raise ApiError("only active students can register for units", 403)
        sem = current_semester_id()
        allowed = {u["unit_id"] for u in self._eligible(student, sem)}
        invalid = sorted(unit_ids - allowed)
        if invalid:
            raise ApiError(f"units not available to you this semester: {invalid}")

        rows = [{"student_id": student["student_id"], "unit_id": u, "semester_id": sem} for u in unit_ids]
        db().table("registrations").upsert(
            rows, on_conflict="student_id,unit_id,semester_id", ignore_duplicates=True
        ).execute()
        return {"message": "registered", "units": sorted(unit_ids)}

    def registrations(self, user_id, semester_id=None):
        student = self._student(user_id)
        sem = semester_or_current(semester_id)
        regs = (db().table("registrations")
                .select("registration_id, unit_id, units(unit_code, unit_name, credit_hours)")
                .eq("student_id", student["student_id"]).eq("semester_id", sem).execute().data)
        unit_ids = [r["unit_id"] for r in regs]
        lecturers = {}
        if unit_ids:
            for a in (db().table("unit_allocations")
                      .select("unit_id, lecturers(first_name, last_name)")
                      .eq("semester_id", sem).in_("unit_id", unit_ids).execute().data):
                lec = one(a["lecturers"])
                lecturers[a["unit_id"]] = f"{lec['first_name']} {lec['last_name']}" if lec else None

        out = []
        for r in regs:
            out.append({"registration_id": r["registration_id"], "unit_id": r["unit_id"],
                        **one(r["units"]), "lecturer": lecturers.get(r["unit_id"])})
        return sorted(out, key=lambda r: r["unit_code"])

    def attendance(self, user_id, semester_id=None):
        student = self._student(user_id)
        sem = semester_or_current(semester_id)
        regs = (db().table("registrations")
                .select("registration_id, units(unit_code, unit_name), attendance(attendance_date, status)")
                .eq("student_id", student["student_id"]).eq("semester_id", sem).execute().data)
        records = []
        for r in regs:
            unit = one(r["units"])
            for a in r["attendance"] or []:
                records.append({"unit_code": unit["unit_code"], "unit_name": unit["unit_name"],
                                "attendance_date": a["attendance_date"], "status": a["status"]})
        return sorted(records, key=lambda x: x["attendance_date"], reverse=True)

    def results(self, user_id, semester_id=None):
        """With no semester_id this is the full transcript."""
        student = self._student(user_id)
        q = (db().table("registrations")
             .select("registration_id, units(unit_code, unit_name, credit_hours), "
                     "semesters(academic_year, semester_name, start_date), marks(cat_mark, exam_mark)")
             .eq("student_id", student["student_id"]))
        if semester_id:
            q = q.eq("semester_id", semester_id)

        out = []
        for r in q.execute().data:
            sem, marks = one(r["semesters"]), one(r["marks"]) or {}
            out.append(with_totals({
                "start_date": sem["start_date"], "academic_year": sem["academic_year"],
                "semester_name": sem["semester_name"], **one(r["units"]),
                "cat_mark": marks.get("cat_mark"), "exam_mark": marks.get("exam_mark"),
            }))
        out.sort(key=lambda r: (r["start_date"], r["unit_code"]))
        for r in out:
            del r["start_date"]
        return out

    def fees(self, user_id):
        student = self._student(user_id)
        structures = (db().table("fee_structures")
                      .select("semester_id, amount_due, semesters(academic_year, semester_name, start_date)")
                      .eq("course_id", student["course_id"]).execute().data)
        payments = (db().table("fee_payments")
                    .select("payment_id, semester_id, amount_paid, payment_date, payment_method, reference_no")
                    .eq("student_id", student["student_id"])
                    .order("payment_date", desc=True).order("payment_id", desc=True).execute().data)
        paid = {}
        for p in payments:
            paid[p["semester_id"]] = paid.get(p["semester_id"], 0) + p["amount_paid"]

        semesters = []
        for fs in sorted(structures, key=lambda f: one(f["semesters"])["start_date"]):
            sem = one(fs["semesters"])
            amount_paid = round(paid.get(fs["semester_id"], 0), 2)
            semesters.append({"semester_id": fs["semester_id"], "academic_year": sem["academic_year"],
                              "semester_name": sem["semester_name"], "amount_due": fs["amount_due"],
                              "amount_paid": amount_paid,
                              "balance": round(fs["amount_due"] - amount_paid, 2)})
        return {"semesters": semesters,
                "total_balance": round(sum(s["balance"] for s in semesters), 2),
                "receipts": payments}