/**
 * Siwaka Polytechnic MIS - API Client
 * Aligned with Backend/API_ENDPOINTS.md (34 routes)
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

class ApiError extends Error {
  constructor(message, status = 400, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    ...options,
    credentials: 'include', // Ensures Flask session cookies are sent/received
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers || {}),
    },
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, config);
  let data = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = (data && data.error) || (data && data.message) || response.statusText || 'Request failed';
    throw new ApiError(errorMsg, response.status, data);
  }

  return data;
}

// -------------------------------------------------------------
// Authentication (FR1)
// -------------------------------------------------------------
export const api = {
  // POST /login - Student/Lecturer Login
  login: (username, password) =>
    request('/login', { method: 'POST', body: { username, password } }),

  // POST /admin/login - Admin Login
  adminLogin: (username, password) =>
    request('/admin/login', { method: 'POST', body: { username, password } }),

  // POST /logout - Log out
  logout: () =>
    request('/logout', { method: 'POST' }),

  // GET /me - Get current user id & role
  getMe: () =>
    request('/me', { method: 'GET' }),

  // POST /change-password - Change own password
  changePassword: (old_password, new_password) =>
    request('/change-password', { method: 'POST', body: { old_password, new_password } }),

  // -------------------------------------------------------------
  // Admin (FR2, FR5)
  // -------------------------------------------------------------
  // POST /admin/students - Create student
  createStudent: (studentData) =>
    request('/admin/students', { method: 'POST', body: studentData }),

  // GET /admin/students - List students (optional course_id filter)
  listStudents: (courseId = null) => {
    const query = courseId ? `?course_id=${encodeURIComponent(courseId)}` : '';
    return request(`/admin/students${query}`, { method: 'GET' });
  },

  // PUT /admin/students/<student_id> - Update student
  updateStudent: (studentId, studentData) =>
    request(`/admin/students/${studentId}`, { method: 'PUT', body: studentData }),

  // POST /admin/lecturers - Create lecturer
  createLecturer: (lecturerData) =>
    request('/admin/lecturers', { method: 'POST', body: lecturerData }),

  // GET /admin/lecturers - List lecturers
  listLecturers: () =>
    request('/admin/lecturers', { method: 'GET' }),

  // PUT /admin/lecturers/<lecturer_id> - Update lecturer
  updateLecturer: (lecturerId, lecturerData) =>
    request(`/admin/lecturers/${lecturerId}`, { method: 'PUT', body: lecturerData }),

  // POST /admin/users/<user_id>/reset-password - Reset password & unlock account
  resetPassword: (userId, new_password) =>
    request(`/admin/users/${userId}/reset-password`, { method: 'POST', body: { new_password } }),

  // POST /admin/users/<user_id>/status - Set account status
  setUserStatus: (userId, status) =>
    request(`/admin/users/${userId}/status`, { method: 'POST', body: { status } }),

  // Dynamic Lookup Routes (departments, courses, units, semesters)
  // GET /admin/<table> - List lookup
  listLookup: (table) =>
    request(`/admin/${table}`, { method: 'GET' }),

  // POST /admin/<table> - Create lookup entry
  createLookup: (table, data) =>
    request(`/admin/${table}`, { method: 'POST', body: data }),

  // PUT /admin/<table>/<item_id> - Update lookup entry
  updateLookup: (table, itemId, data) =>
    request(`/admin/${table}/${itemId}`, { method: 'PUT', body: data }),

  // POST /admin/semesters/<semester_id>/current - Set current semester
  setCurrentSemester: (semesterId) =>
    request(`/admin/semesters/${semesterId}/current`, { method: 'POST' }),

  // POST /admin/allocations - Allocate unit to lecturer
  allocateUnit: (data) =>
    request('/admin/allocations', { method: 'POST', body: data }),

  // POST /admin/fee-structures - Set fee structure
  setFeeStructure: (data) =>
    request('/admin/fee-structures', { method: 'POST', body: data }),

  // POST /admin/payments - Record payment
  recordPayment: (paymentData) =>
    request('/admin/payments', { method: 'POST', body: paymentData }),

  // GET /admin/reports/outstanding-fees - Outstanding fees report (optional semester_id)
  getOutstandingFees: (semesterId = null) => {
    const query = semesterId ? `?semester_id=${encodeURIComponent(semesterId)}` : '';
    return request(`/admin/reports/outstanding-fees${query}`, { method: 'GET' });
  },

  // -------------------------------------------------------------
  // Student (FR3, FR4, FR5)
  // -------------------------------------------------------------
  // GET /student/profile - Get profile
  getStudentProfile: () =>
    request('/student/profile', { method: 'GET' }),

  // GET /student/units/available - List available units
  getAvailableUnits: () =>
    request('/student/units/available', { method: 'GET' }),

  // POST /student/registrations - Register units
  registerUnits: (unit_ids) =>
    request('/student/registrations', { method: 'POST', body: { unit_ids } }),

  // GET /student/registrations - View registrations (optional semester_id)
  getStudentRegistrations: (semesterId = null) => {
    const query = semesterId ? `?semester_id=${encodeURIComponent(semesterId)}` : '';
    return request(`/student/registrations${query}`, { method: 'GET' });
  },

  // GET /student/attendance - View attendance (optional semester_id)
  getStudentAttendance: (semesterId = null) => {
    const query = semesterId ? `?semester_id=${encodeURIComponent(semesterId)}` : '';
    return request(`/student/attendance${query}`, { method: 'GET' });
  },

  // GET /student/results - View results (optional semester_id)
  getStudentResults: (semesterId = null) => {
    const query = semesterId ? `?semester_id=${encodeURIComponent(semesterId)}` : '';
    return request(`/student/results${query}`, { method: 'GET' });
  },

  // GET /student/fees - View fees
  getStudentFees: () =>
    request('/student/fees', { method: 'GET' }),

  // -------------------------------------------------------------
  // Lecturer (FR3, FR4)
  // -------------------------------------------------------------
  // GET /lecturer/units - List own units (optional semester_id)
  getLecturerUnits: (semesterId = null) => {
    const query = semesterId ? `?semester_id=${encodeURIComponent(semesterId)}` : '';
    return request(`/lecturer/units${query}`, { method: 'GET' });
  },

  // GET /lecturer/units/<unit_id>/students - Class list (optional semester_id)
  getClassList: (unitId, semesterId = null) => {
    const query = semesterId ? `?semester_id=${encodeURIComponent(semesterId)}` : '';
    return request(`/lecturer/units/${unitId}/students${query}`, { method: 'GET' });
  },

  // POST /lecturer/units/<unit_id>/attendance - Record attendance (optional semester_id)
  recordAttendance: (unitId, data, semesterId = null) => {
    const query = semesterId ? `?semester_id=${encodeURIComponent(semesterId)}` : '';
    return request(`/lecturer/units/${unitId}/attendance${query}`, { method: 'POST', body: data });
  },

  // POST /lecturer/units/<unit_id>/marks - Enter marks (optional semester_id)
  enterMarks: (unitId, data, semesterId = null) => {
    const query = semesterId ? `?semester_id=${encodeURIComponent(semesterId)}` : '';
    return request(`/lecturer/units/${unitId}/marks${query}`, { method: 'POST', body: data });
  },
};

export default api;
