# API Routes in the Code

## Authentication (FR1)
| Method | Route | Description | Access |
|--------|-------|-------------|--------|
| POST | `/login` | Log in (student/lecturer) | Public |
| POST | `/admin/login` | Log in (admin only) | Public |
| POST | `/logout` | Log out | Public |
| GET | `/me` | Get current user id & role | Any user |
| POST | `/change-password` | Change own password | Any user |

## Admin (FR2, FR5)
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/admin/students` | Create student |
| GET | `/admin/students` | List students (optional `course_id` filter) |
| PUT | `/admin/students/<student_id>` | Update student |
| POST | `/admin/lecturers` | Create lecturer |
| GET | `/admin/lecturers` | List lecturers |
| PUT | `/admin/lecturers/<lecturer_id>` | Update lecturer |
| POST | `/admin/users/<user_id>/reset-password` | Reset password & unlock account |
| POST | `/admin/users/<user_id>/status` | Set account status |
| GET | `/admin/<table>` | List lookup (`departments`/`courses`/`units`/`semesters`) |
| POST | `/admin/<table>` | Create lookup entry |
| PUT | `/admin/<table>/<item_id>` | Update lookup entry |
| POST | `/admin/semesters/<semester_id>/current` | Set current semester |
| POST | `/admin/allocations` | Allocate unit to lecturer |
| POST | `/admin/fee-structures` | Set fee structure |
| POST | `/admin/payments` | Record payment |
| GET | `/admin/reports/outstanding-fees` | Outstanding fees report (optional `semester_id`) |

## Student (FR3, FR4, FR5)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/student/profile` | Get profile |
| GET | `/student/units/available` | List available units |
| POST | `/student/registrations` | Register units |
| GET | `/student/registrations` | View registrations (optional `semester_id`) |
| GET | `/student/attendance` | View attendance (optional `semester_id`) |
| GET | `/student/results` | View results (optional `semester_id`) |
| GET | `/student/fees` | View fees |

## Lecturer (FR3, FR4)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/lecturer/units` | List own units (optional `semester_id`) |
| GET | `/lecturer/units/<unit_id>/students` | Class list (optional `semester_id`) |
| POST | `/lecturer/units/<unit_id>/attendance` | Record attendance (optional `semester_id`) |
| POST | `/lecturer/units/<unit_id>/marks` | Enter marks (optional `semester_id`) |

**Total: 34 routes**

Note: `<table>` routes are dynamic and expand into 12 concrete endpoints (3 methods × 4 tables).