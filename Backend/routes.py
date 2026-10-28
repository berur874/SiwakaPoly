from flask import Blueprint, request, jsonify
from StudentService import StudentService
from TeachersService import TeachersService
from SessionManager import SessionManager

api = Blueprint("api", __name__)
students = StudentService()
teachers = TeachersService()


@api.route("/student/login", methods=["POST"])
def student_login():
    data = request.get_json(silent=True) or {}
    student_id, password = data.get("student_id"), data.get("password")

    if not student_id or not password:
        return jsonify(error="student_id and password required"), 400
    if not students.login(student_id, password):
        return jsonify(error="invalid credentials"), 401

    SessionManager.start(student_id, "student")
    return jsonify(message="logged in"), 200


@api.route("/teacher/login", methods=["POST"])
def teacher_login():
    data = request.get_json(silent=True) or {}
    teacher_id, password = data.get("Teacher_id"), data.get("password")

    if not teacher_id or not password:
        return jsonify(error="Teacher_id and password required"), 400
    if not teachers.login(teacher_id, password):
        return jsonify(error="invalid credentials"), 401

    SessionManager.start(teacher_id, "teacher")
    return jsonify(message="logged in"), 200


@api.route("/logout", methods=["POST"])
def logout():
    SessionManager.end()
    return jsonify(message="logged out"), 200


@api.route("/student/profile")
@SessionManager.require_role("student")
def student_profile():
    user_id, _ = SessionManager.current()
    return jsonify(student_id=user_id)