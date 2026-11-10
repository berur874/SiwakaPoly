from flask import Blueprint, jsonify, request

from AdminService import AdminService
from AuthService import AuthService
from TeachersService import LecturerService
from SessionManager import SessionManager
from StudentService import StudentService
from utils import ApiError, require

api = Blueprint("api", __name__)

auth = AuthService()
admin = AdminService(auth)
students = StudentService()
lecturers = LecturerService()

any_user = SessionManager.require_role("admin", "lecturer", "student")
admin_only = SessionManager.require_role("admin")
student_only = SessionManager.require_role("student")
lecturer_only = SessionManager.require_role("lecturer")


def body():
    return request.get_json(silent=True) or {}


def uid():
    return SessionManager.current()[0]


def semester_arg():
    return request.args.get("semester_id", type=int)


# ---------------- Authentication (FR1) ----------------
def _do_login(allowed_roles):
    data = body()
    require(data, "username", "password")
    user_id, role, reason = auth.login(data["username"], data["password"])
    if reason == "locked":
        return jsonify(error="account locked, contact the administrator"), 403
    if reason == "inactive":
        return jsonify(error="account deactivated, contact the administrator"), 403
    if reason or role not in allowed_roles:
        return jsonify(error="invalid credentials"), 401
    SessionManager.start(user_id, role)
    return jsonify(message="logged in", role=role)


@api.post("/login")
def login():
    return _do_login({"student", "lecturer"})


@api.post("/admin/login")
def admin_login():
    return _do_login({"admin"})


@api.post("/logout")
def logout():
    SessionManager.end()
    return jsonify(message="logged out")


@api.get("/me")
@any_user
def me():
    user_id, role = SessionManager.current()
    return jsonify(user_id=user_id, role=role)


@api.post("/change-password")
@any_user
def change_password():
    data = body()
    require(data, "old_password", "new_password")
    auth.change_password(uid(), data["old_password"], data["new_password"])
    return jsonify(message="password changed")


# ---------------- Admin (FR2, FR5) ----------------
@api.post("/admin/students")
@admin_only
def admin_create_student():
    return jsonify(admin.register_student(body())), 201


@api.get("/admin/students")
@admin_only
def admin_list_students():
    return jsonify(admin.list_students(request.args.get("course_id", type=int)))


@api.put("/admin/students/<int:student_id>")
@admin_only
def admin_update_student(student_id):
    return jsonify(admin.update_student(student_id, body()))


@api.post("/admin/lecturers")
@admin_only
def admin_create_lecturer():
    return jsonify(admin.register_lecturer(body())), 201


@api.get("/admin/lecturers")
@admin_only
def admin_list_lecturers():
    return jsonify(admin.list_lecturers())


@api.put("/admin/lecturers/<int:lecturer_id>")
@admin_only
def admin_update_lecturer(lecturer_id):
    return jsonify(admin.update_lecturer(lecturer_id, body()))


@api.post("/admin/users/<int:user_id>/reset-password")
@admin_only
def admin_reset_password(user_id):
    data = body()
    require(data, "new_password")
    auth.reset_password(user_id, data["new_password"])
    return jsonify(message="password reset, account unlocked")


@api.post("/admin/users/<int:user_id>/status")
@admin_only
def admin_set_status(user_id):
    data = body()
    require(data, "status")
    return jsonify(admin.set_account_status(user_id, data["status"], uid()))


# departments, courses, units, semesters share one set of routes:
#   GET/POST /admin/departments|courses|units|semesters, PUT /admin/<table>/<id>
@api.get("/admin/<table>")
@admin_only
def admin_list_lookup(table):
    return jsonify(admin.list_lookup(table))


@api.post("/admin/<table>")
@admin_only
def admin_create_lookup(table):
    return jsonify(admin.create_lookup(table, body())), 201


@api.put("/admin/<table>/<int:item_id>")
@admin_only
def admin_update_lookup(table, item_id):
    return jsonify(admin.update_lookup(table, item_id, body()))


@api.post("/admin/semesters/<int:semester_id>/current")
@admin_only
def admin_set_current_semester(semester_id):
    return jsonify(admin.set_current_semester(semester_id))


@api.post("/admin/allocations")
@admin_only
def admin_allocate():
    return jsonify(admin.allocate_unit(body())), 201


@api.post("/admin/fee-structures")
@admin_only
def admin_fee_structure():
    return jsonify(admin.set_fee_structure(body())), 201


@api.post("/admin/payments")
@admin_only
def admin_record_payment():
    return jsonify(admin.record_payment(body(), uid())), 201


@api.get("/admin/reports/outstanding-fees")
@admin_only
def admin_outstanding_fees():
    return jsonify(admin.outstanding_fees(semester_arg()))


# ---------------- Student (FR3, FR4, FR5) ----------------
@api.get("/student/profile")
@student_only
def student_profile():
    return jsonify(students.profile(uid()))


@api.get("/student/units/available")
@student_only
def student_available_units():
    return jsonify(students.available_units(uid()))


@api.post("/student/registrations")
@student_only
def student_register_units():
    return jsonify(students.register_units(uid(), body().get("unit_ids"))), 201


@api.get("/student/registrations")
@student_only
def student_registrations():
    return jsonify(students.registrations(uid(), semester_arg()))


@api.get("/student/attendance")
@student_only
def student_attendance():
    return jsonify(students.attendance(uid(), semester_arg()))


@api.get("/student/results")
@student_only
def student_results():
    return jsonify(students.results(uid(), semester_arg()))


@api.get("/student/fees")
@student_only
def student_fees():
    return jsonify(students.fees(uid()))


# ---------------- Lecturer (FR3, FR4) ----------------
@api.get("/lecturer/units")
@lecturer_only
def lecturer_units():
    return jsonify(lecturers.my_units(uid(), semester_arg()))


@api.get("/lecturer/units/<int:unit_id>/students")
@lecturer_only
def lecturer_class_list(unit_id):
    return jsonify(lecturers.class_list(uid(), unit_id, semester_arg()))


@api.post("/lecturer/units/<int:unit_id>/attendance")
@lecturer_only
def lecturer_attendance(unit_id):
    return jsonify(lecturers.record_attendance(uid(), unit_id, body(), semester_arg()))


@api.post("/lecturer/units/<int:unit_id>/marks")
@lecturer_only
def lecturer_marks(unit_id):
    return jsonify(lecturers.enter_marks(uid(), unit_id, body(), semester_arg()))