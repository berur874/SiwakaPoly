import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import api from './api';

// -------------------------------------------------------------
// Toast Notification Context
// -------------------------------------------------------------
const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, type }]);
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 4000);
  };

  return (
    <ToastContext.Provider value={{ showToast: addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-3 rounded-lg shadow-lg text-sm text-white font-medium flex items-center justify-between transition-all ${
              toast.type === 'error'
                ? 'bg-red-600'
                : toast.type === 'success'
                ? 'bg-green-600'
                : 'bg-blue-900'
            }`}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => setToasts((c) => c.filter((t) => t.id !== toast.id))}
              className="ml-3 text-white/80 hover:text-white"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

// -------------------------------------------------------------
// Auth Context
// -------------------------------------------------------------
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchSession = async () => {
    try {
      const data = await api.getMe();
      if (data && data.user_id) {
        let profile = null;
        if (data.role === 'student') {
          try {
            profile = await api.getStudentProfile();
          } catch (e) {}
        }
        setCurrentUser({ ...data, profile });
      } else {
        setCurrentUser(null);
      }
    } catch (err) {
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const login = async (username, password, isAdmin = false) => {
    const res = isAdmin
      ? await api.adminLogin(username, password)
      : await api.login(username, password);

    showToast(res.message || 'Logged in successfully', 'success');
    await fetchSession();
    return res.role;
  };

  const logout = async () => {
    try {
      await api.logout();
      showToast('Logged out', 'info');
    } catch (e) {
      // ignore
    } finally {
      setCurrentUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading, login, logout, refreshSession: fetchSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

// -------------------------------------------------------------
// UI Primitives & Layout
// -------------------------------------------------------------
function Logo({ small = false }) {
  return (
    <div className={`logo-mark ${small ? 'logo-small' : ''}`} aria-label="Siwaka Polytechnic logo">
      <span>SP</span>
    </div>
  );
}

function Page({ title, children, eyebrow, actions }) {
  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
        <div>
          {eyebrow && <div className="breadcrumb">{eyebrow}</div>}
          <h1 className="page-title">{title}</h1>
        </div>
        {actions && <div className="flex items-center gap-2 mb-3 sm:mb-0">{actions}</div>}
      </div>
      <div className="title-divider" />
      {children}
    </>
  );
}

function StatCards({ cards }) {
  return (
    <div className="stats-grid">
      {cards.map((card) => (
        <div className={`stat-card border-${card.color}`} key={card.title}>
          <span>{card.title}</span>
          <strong className={card.textColor || ''}>{card.value}</strong>
        </div>
      ))}
    </div>
  );
}

function ChangePasswordModal({ isOpen, onClose }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }
    if (newPassword.length < 8) {
      showToast('Password must be at least 8 characters long', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await api.changePassword(oldPassword, newPassword);
      showToast(res.message || 'Password changed successfully', 'success');
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to change password', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-2xl border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Change Password</h2>
        <p className="text-xs text-slate-500 mb-4">Minimum 8 characters required by security policy.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Current Password</label>
            <input
              type="password"
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">New Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Confirm New Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PortalLayout({ children, role }) {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [pwdModalOpen, setPwdModalOpen] = useState(false);

  const displayName = useMemo(() => {
    if (!currentUser) return role;
    if (currentUser.profile) {
      return `${currentUser.profile.first_name} ${currentUser.profile.last_name}`;
    }
    return currentUser.role === 'admin' ? 'System Administrator' : currentUser.role;
  }, [currentUser, role]);

  const links =
    role === 'Admin'
      ? [
          ['Dashboard', '/admin/dashboard'],
          ['Register Student', '/admin/students/new'],
          ['Students List', '/admin/students'],
          ['Lecturers List', '/admin/lecturers'],
          ['Fee Payments', '/admin/fees'],
          ['User Accounts', '/admin/users'],
          ['Lookups & Catalog', '/admin/lookups'],
          ['Fee Reports', '/admin/reports'],
        ]
      : role === 'Lecturer'
      ? [
          ['Record Attendance', '/lecturer/attendance'],
          ['Enter Marks', '/lecturer/marks'],
          ['My Units', '/lecturer/units'],
        ]
      : [
          ['Dashboard', '/student/dashboard'],
          ['Unit Registration', '/student/register-units'],
          ['My Results', '/student/results'],
          ['Fee Statement', '/student/fees'],
          ['Attendance Log', '/student/attendance'],
        ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="portal">
      <header className="topbar">
        <div className="brand">
          <Logo small />
          <strong>Siwaka Polytechnic</strong>
        </div>
        <div className="welcome flex items-center gap-4">
          <span className="text-sm font-semibold">Welcome, {displayName}</span>
          <button
            onClick={() => setPwdModalOpen(true)}
            className="text-xs bg-blue-800 text-blue-100 px-2 py-1 rounded hover:bg-blue-700 transition"
            title="Change Account Password"
          >
            Change Pwd
          </button>
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>
      <aside className="sidebar">
        {links.map(([label, path]) => (
          <NavLink key={path} to={path} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            {label}
          </NavLink>
        ))}
      </aside>
      <main className="content">{children}</main>

      <ChangePasswordModal isOpen={pwdModalOpen} onClose={() => setPwdModalOpen(false)} />
    </div>
  );
}

// -------------------------------------------------------------
// 1. & 7. LOGIN (Student/Lecturer vs Admin)
// -------------------------------------------------------------
function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { showToast } = useToast();

  const isAdminPortal = location.pathname.startsWith('/admin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const role = await login(username.trim(), password, isAdminPortal);
      if (role === 'admin') {
        navigate('/admin/dashboard');
      } else if (role === 'lecturer') {
        navigate('/lecturer/attendance');
      } else {
        navigate('/student/dashboard');
      }
    } catch (err) {
      showToast(err.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <div className="w-full max-w-md flex justify-end mb-2">
        {isAdminPortal ? (
          <button
            onClick={() => navigate('/login')}
            className="text-xs font-semibold text-blue-900 hover:underline"
          >
            &larr; Student / Lecturer Portal
          </button>
        ) : (
          <button
            onClick={() => navigate('/admin/login')}
            className="text-xs font-semibold text-slate-600 hover:text-blue-900 hover:underline"
          >
            Admin Portal &rarr;
          </button>
        )}
      </div>

      <form className="login-card" onSubmit={handleSubmit}>
        <Logo />
        <h1>Siwaka Polytechnic</h1>
        <p>{isAdminPortal ? 'Administrator Panel' : 'Management Information System'}</p>
        <label htmlFor="username">{isAdminPortal ? 'Admin Username' : 'Username (Admission No / Staff ID)'}</label>
        <input
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder={isAdminPortal ? 'admin' : 'e.g. SP/26/0145'}
          required
        />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          required
        />
        <label className="show-password">
          <input
            type="checkbox"
            checked={showPassword}
            onChange={(e) => setShowPassword(e.target.checked)}
          />
          Show password
        </label>
        <button className="btn btn-primary login-button" type="submit" disabled={loading}>
          {loading ? 'LOGGING IN...' : 'LOGIN'}
        </button>
        <button
          className="help-link"
          type="button"
          onClick={() => alert('Please contact administrator to reset password or unlock your account.')}
        >
          Forgot your password? Get help
        </button>
      </form>
    </main>
  );
}

// -------------------------------------------------------------
// 2. STUDENT DASHBOARD
// -------------------------------------------------------------
function StudentDashboard() {
  const [profile, setProfile] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [feeData, setFeeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [prof, regs, att, fees] = await Promise.all([
          api.getStudentProfile().catch(() => null),
          api.getStudentRegistrations().catch(() => []),
          api.getStudentAttendance().catch(() => []),
          api.getStudentFees().catch(() => null),
        ]);
        setProfile(prof);
        setRegistrations(regs || []);
        setAttendanceRecords(att || []);
        setFeeData(fees);
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const attendancePercentage = useMemo(() => {
    if (!attendanceRecords || attendanceRecords.length === 0) return 100;
    const attended = attendanceRecords.filter((a) => a.status === 'Present' || a.status === 'Late').length;
    return Math.round((attended / attendanceRecords.length) * 100);
  }, [attendanceRecords]);

  const feeBalance = feeData ? feeData.total_balance : 0;

  return (
    <PortalLayout role="Student">
      <Page title="Student Dashboard">
        {loading ? (
          <div className="py-8 text-center text-slate-500">Loading student data...</div>
        ) : (
          <>
            <p className="subheader">
              {profile?.course_name || 'Diploma in Information Technology'} | Year {profile?.year_of_study || 1} |{' '}
              {profile?.admission_no}
            </p>
            <StatCards
              cards={[
                { title: 'Registered Units', value: registrations.length, color: 'navy' },
                { title: 'Attendance', value: `${attendancePercentage}%`, color: 'green' },
                {
                  title: 'Fee Balance',
                  value: `KES ${feeBalance.toLocaleString()}`,
                  color: feeBalance > 0 ? 'red' : 'green',
                  textColor: feeBalance > 0 ? 'red-text' : '',
                },
              ]}
            />
            <h2 className="section-heading">My Units - Current Semester</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Unit Code</th>
                    <th>Unit Name</th>
                    <th>Credits</th>
                    <th>Lecturer</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-6 text-slate-500">
                        No units registered for this semester. Click "Unit Registration" to register.
                      </td>
                    </tr>
                  ) : (
                    registrations.map((unit) => (
                      <tr key={unit.unit_id}>
                        <td>{unit.unit_code}</td>
                        <td>{unit.unit_name}</td>
                        <td>{unit.credit_hours}</td>
                        <td>{unit.lecturer || 'Not Assigned'}</td>
                        <td>
                          <span className="status-green">Registered</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Page>
    </PortalLayout>
  );
}

// -------------------------------------------------------------
// 3. STUDENT UNIT REGISTRATION
// -------------------------------------------------------------
function UnitRegistration() {
  const [availableUnits, setAvailableUnits] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const loadUnits = async () => {
    setLoading(true);
    try {
      const units = await api.getAvailableUnits();
      setAvailableUnits(units || []);
      const preSelected = (units || []).filter((u) => u.registered).map((u) => u.unit_id);
      setSelectedIds(preSelected);
    } catch (err) {
      showToast(err.message || 'Failed to load eligible units', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUnits();
  }, []);

  const toggleUnit = (unitId) => {
    setSelectedIds((current) =>
      current.includes(unitId) ? current.filter((id) => id !== unitId) : [...current, unitId]
    );
  };

  const handleSubmit = async () => {
    if (selectedIds.length === 0) {
      showToast('Please select at least one unit', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.registerUnits(selectedIds);
      showToast(res.message || 'Units registered successfully', 'success');
      await loadUnits();
    } catch (err) {
      showToast(err.message || 'Failed to register units', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PortalLayout role="Student">
      <Page title="Unit Registration">
        {loading ? (
          <div className="py-8 text-center text-slate-500">Loading available units...</div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th className="check-cell"></th>
                    <th>Unit Code</th>
                    <th>Unit Name</th>
                    <th>Credits</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {availableUnits.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-6 text-slate-500">
                        No units currently available for registration this semester.
                      </td>
                    </tr>
                  ) : (
                    availableUnits.map((unit) => (
                      <tr key={unit.unit_id}>
                        <td className="check-cell">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(unit.unit_id)}
                            onChange={() => toggleUnit(unit.unit_id)}
                            aria-label={`Select ${unit.unit_code}`}
                          />
                        </td>
                        <td>{unit.unit_code}</td>
                        <td>{unit.unit_name}</td>
                        <td>{unit.credit_hours}</td>
                        <td>
                          {unit.registered ? (
                            <span className="status-green">Registered</span>
                          ) : (
                            <span className="text-blue-900 font-semibold">Available</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
              <div className="footer-actions">
                <button
                  className="btn btn-primary"
                  onClick={handleSubmit}
                  disabled={submitting || availableUnits.length === 0}
                >
                  {submitting ? 'Registering...' : 'Register Selected Units'}
                </button>
                <button className="btn btn-secondary" onClick={loadUnits}>
                  Cancel / Refresh
                </button>
              </div>
              <strong>{selectedIds.length} unit(s) selected</strong>
            </div>
          </>
        )}
      </Page>
    </PortalLayout>
  );
}

// -------------------------------------------------------------
// 4. STUDENT RESULTS & TRANSCRIPT
// -------------------------------------------------------------
function Results() {
  const [results, setResults] = useState([]);
  const [semesterFilter, setSemesterFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const loadResults = async (semId = null) => {
    setLoading(true);
    try {
      const data = await api.getStudentResults(semId);
      setResults(data || []);
    } catch (err) {
      showToast(err.message || 'Failed to load results', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResults(semesterFilter || null);
  }, [semesterFilter]);

  const semestersList = useMemo(() => {
    const map = new Map();
    results.forEach((r) => {
      const key = `${r.academic_year} - ${r.semester_name}`;
      if (!map.has(key)) map.set(key, r);
    });
    return Array.from(map.keys());
  }, [results]);

  const gradedResults = results.filter((r) => r.total_mark !== null && r.total_mark !== undefined);
  const average =
    gradedResults.length > 0
      ? gradedResults.reduce((sum, r) => sum + Number(r.total_mark), 0) / gradedResults.length
      : 0;

  const getMeanGrade = (score) => {
    if (score >= 70) return 'A';
    if (score >= 60) return 'B';
    if (score >= 50) return 'C';
    if (score >= 40) return 'D';
    return 'E';
  };

  return (
    <PortalLayout role="Student">
      <Page title="My Results & Transcripts">
        <div className="filter-row">
          <select
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
            aria-label="Filter by Semester"
          >
            <option value="">All Semesters (Full Transcript)</option>
            {semestersList.map((sem) => (
              <option key={sem} value={sem}>
                {sem}
              </option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={() => loadResults(semesterFilter || null)}>
            View
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-500">Loading results...</div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Academic Session</th>
                    <th>Unit Code</th>
                    <th>Unit Name</th>
                    <th>Credits</th>
                    <th>CAT (/30)</th>
                    <th>Exam (/70)</th>
                    <th>Total (/100)</th>
                    <th>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {results.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-6 text-slate-500">
                        No results found.
                      </td>
                    </tr>
                  ) : (
                    results.map((r, i) => (
                      <tr key={i}>
                        <td className="text-xs text-slate-500">
                          {r.academic_year} {r.semester_name}
                        </td>
                        <td className="font-bold text-blue-950">{r.unit_code}</td>
                        <td>{r.unit_name}</td>
                        <td>{r.credit_hours}</td>
                        <td>{r.cat_mark !== null ? r.cat_mark : '-'}</td>
                        <td>{r.exam_mark !== null ? r.exam_mark : '-'}</td>
                        <td className="font-bold">{r.total_mark !== null ? r.total_mark : '-'}</td>
                        <td>
                          <strong className="status-green">{r.grade || '-'}</strong>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="summary-banner">
              <strong>
                Average: {average.toFixed(1)} | Mean grade: {getMeanGrade(average)}
              </strong>
              <button className="btn btn-secondary" onClick={() => window.print()}>
                Download / Print Transcript
              </button>
            </div>
          </>
        )}
      </Page>
    </PortalLayout>
  );
}

// -------------------------------------------------------------
// STUDENT FEES
// -------------------------------------------------------------
function StudentFees() {
  const [feeData, setFeeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    async function fetchFees() {
      setLoading(true);
      try {
        const data = await api.getStudentFees();
        setFeeData(data);
      } catch (err) {
        showToast(err.message || 'Failed to load fee statement', 'error');
      } finally {
        setLoading(false);
      }
    }
    fetchFees();
  }, []);

  return (
    <PortalLayout role="Student">
      <Page title="Fee Statement & Receipts">
        {loading ? (
          <div className="py-8 text-center text-slate-500">Loading fee statement...</div>
        ) : (
          <div className="space-y-6">
            <div className="balance-box">
              <span>Total Outstanding Balance</span>
              <strong>KES {(feeData?.total_balance || 0).toLocaleString()}</strong>
            </div>

            <h3 className="section-heading">Semester Fee Structures</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Academic Year</th>
                    <th>Semester</th>
                    <th>Amount Due</th>
                    <th>Amount Paid</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {(feeData?.semesters || []).map((sem) => (
                    <tr key={sem.semester_id}>
                      <td>{sem.academic_year}</td>
                      <td>{sem.semester_name}</td>
                      <td>KES {Number(sem.amount_due).toLocaleString()}</td>
                      <td className="text-green-700 font-semibold">KES {Number(sem.amount_paid).toLocaleString()}</td>
                      <td className={sem.balance > 0 ? 'status-red' : 'status-green'}>
                        KES {Number(sem.balance).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="section-heading">Payment Receipts History</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Reference No</th>
                    <th>Date</th>
                    <th>Method</th>
                    <th>Amount Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {(feeData?.receipts || []).length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center py-4 text-slate-500">
                        No payment receipts found.
                      </td>
                    </tr>
                  ) : (
                    feeData.receipts.map((rec) => (
                      <tr key={rec.payment_id}>
                        <td className="font-bold text-blue-900">{rec.reference_no}</td>
                        <td>{rec.payment_date}</td>
                        <td>{rec.payment_method}</td>
                        <td className="font-bold text-green-700">KES {Number(rec.amount_paid).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Page>
    </PortalLayout>
  );
}

// -------------------------------------------------------------
// STUDENT ATTENDANCE LOGS
// -------------------------------------------------------------
function StudentAttendance() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    async function loadAttendance() {
      setLoading(true);
      try {
        const data = await api.getStudentAttendance();
        setRecords(data || []);
      } catch (err) {
        showToast(err.message || 'Failed to load attendance logs', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadAttendance();
  }, []);

  return (
    <PortalLayout role="Student">
      <Page title="My Attendance Log">
        {loading ? (
          <div className="py-8 text-center text-slate-500">Loading attendance...</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Unit Code</th>
                  <th>Unit Name</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-6 text-slate-500">
                      No attendance records logged yet.
                    </td>
                  </tr>
                ) : (
                  records.map((r, i) => (
                    <tr key={i}>
                      <td>{r.attendance_date}</td>
                      <td className="font-bold text-blue-950">{r.unit_code}</td>
                      <td>{r.unit_name}</td>
                      <td>
                        <span
                          className={
                            r.status === 'Present'
                              ? 'status-green'
                              : r.status === 'Late'
                              ? 'text-amber-600 font-bold'
                              : 'status-red'
                          }
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Page>
    </PortalLayout>
  );
}

// -------------------------------------------------------------
// 5. LECTURER ATTENDANCE ENTRY
// -------------------------------------------------------------
function Attendance() {
  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [classList, setClassList] = useState([]);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [statuses, setStatuses] = useState({});
  const [loadingUnits, setLoadingUnits] = useState(true);
  const [loadingClass, setLoadingClass] = useState(false);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    async function loadUnits() {
      setLoadingUnits(true);
      try {
        const data = await api.getLecturerUnits();
        setUnits(data || []);
        if (data && data.length > 0) {
          setSelectedUnit(data[0].unit_id);
        }
      } catch (err) {
        showToast(err.message || 'Failed to load assigned units', 'error');
      } finally {
        setLoadingUnits(false);
      }
    }
    loadUnits();
  }, []);

  const loadStudents = async (unitId) => {
    if (!unitId) return;
    setLoadingClass(true);
    try {
      const students = await api.getClassList(unitId);
      setClassList(students || []);
      const initial = {};
      (students || []).forEach((s) => {
        initial[s.registration_id] = 'Present';
      });
      setStatuses(initial);
    } catch (err) {
      showToast(err.message || 'Failed to load class list', 'error');
    } finally {
      setLoadingClass(false);
    }
  };

  useEffect(() => {
    if (selectedUnit) {
      loadStudents(selectedUnit);
    }
  }, [selectedUnit]);

  const handleSave = async () => {
    if (!selectedUnit || classList.length === 0) return;
    setSaving(true);
    try {
      const records = classList.map((s) => ({
        registration_id: s.registration_id,
        status: statuses[s.registration_id] || 'Present',
      }));

      const res = await api.recordAttendance(selectedUnit, { date, records });
      showToast(res.message || 'Attendance saved successfully', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to save attendance', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PortalLayout role="Lecturer">
      <Page title="Record Attendance">
        <div className="filter-row">
          <select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            disabled={loadingUnits}
            aria-label="Select Unit"
          >
            {units.map((item) => (
              <option key={item.unit_id} value={item.unit_id}>
                {item.unit_code} - {item.unit_name} ({item.students_registered} students)
              </option>
            ))}
          </select>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Attendance Date"
          />
          <button className="btn btn-primary" onClick={() => loadStudents(selectedUnit)}>
            Reload Roster
          </button>
        </div>

        {loadingClass ? (
          <div className="py-8 text-center text-slate-500">Loading student roster...</div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Admission No.</th>
                    <th>Student Name</th>
                    <th>Present</th>
                    <th>Absent</th>
                    <th>Late</th>
                    <th>Excused</th>
                  </tr>
                </thead>
                <tbody>
                  {classList.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-6 text-slate-500">
                        No students enrolled in this unit for the current semester.
                      </td>
                    </tr>
                  ) : (
                    classList.map((student) => (
                      <tr key={student.registration_id}>
                        <td className="font-bold text-blue-950">{student.admission_no}</td>
                        <td>
                          {student.first_name} {student.last_name}
                        </td>
                        {['Present', 'Absent', 'Late', 'Excused'].map((status) => (
                          <td className="radio-cell" key={status}>
                            <input
                              type="radio"
                              name={`att-${student.registration_id}`}
                              checked={statuses[student.registration_id] === status}
                              onChange={() =>
                                setStatuses((current) => ({
                                  ...current,
                                  [student.registration_id]: status,
                                }))
                              }
                              aria-label={`${status}: ${student.first_name}`}
                            />
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving || classList.length === 0}
              >
                {saving ? 'Saving...' : 'Save Attendance'}
              </button>
            </div>
          </>
        )}
      </Page>
    </PortalLayout>
  );
}

// -------------------------------------------------------------
// 6. LECTURER MARKS ENTRY
// -------------------------------------------------------------
function Marks() {
  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [classList, setClassList] = useState([]);
  const [markEntries, setMarkEntries] = useState({});
  const [loadingUnits, setLoadingUnits] = useState(true);
  const [loadingClass, setLoadingClass] = useState(false);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    async function loadUnits() {
      setLoadingUnits(true);
      try {
        const data = await api.getLecturerUnits();
        setUnits(data || []);
        if (data && data.length > 0) {
          setSelectedUnit(data[0].unit_id);
        }
      } catch (err) {
        showToast(err.message || 'Failed to load assigned units', 'error');
      } finally {
        setLoadingUnits(false);
      }
    }
    loadUnits();
  }, []);

  const loadClassMarks = async (unitId) => {
    if (!unitId) return;
    setLoadingClass(true);
    try {
      const students = await api.getClassList(unitId);
      setClassList(students || []);
      const entries = {};
      (students || []).forEach((s) => {
        entries[s.registration_id] = {
          cat_mark: s.cat_mark !== null && s.cat_mark !== undefined ? s.cat_mark : '',
          exam_mark: s.exam_mark !== null && s.exam_mark !== undefined ? s.exam_mark : '',
        };
      });
      setMarkEntries(entries);
    } catch (err) {
      showToast(err.message || 'Failed to load marks roster', 'error');
    } finally {
      setLoadingClass(false);
    }
  };

  useEffect(() => {
    if (selectedUnit) {
      loadClassMarks(selectedUnit);
    }
  }, [selectedUnit]);

  const updateEntry = (regId, field, val) => {
    setMarkEntries((current) => ({
      ...current,
      [regId]: {
        ...(current[regId] || {}),
        [field]: val === '' ? '' : Math.max(0, Number(val) || 0),
      },
    }));
  };

  const getGrade = (total) => {
    if (total >= 70) return 'A';
    if (total >= 60) return 'B';
    if (total >= 50) return 'C';
    if (total >= 40) return 'D';
    return 'E';
  };

  const handleSaveMarks = async () => {
    if (!selectedUnit || classList.length === 0) return;

    // Validate inputs (CAT <= 30, Exam <= 70)
    for (const s of classList) {
      const entry = markEntries[s.registration_id] || {};
      if (entry.cat_mark !== '' && Number(entry.cat_mark) > 30) {
        showToast(`CAT mark for ${s.admission_no} cannot exceed 30`, 'error');
        return;
      }
      if (entry.exam_mark !== '' && Number(entry.exam_mark) > 70) {
        showToast(`Exam mark for ${s.admission_no} cannot exceed 70`, 'error');
        return;
      }
    }

    setSaving(true);
    try {
      const entries = classList.map((s) => ({
        registration_id: s.registration_id,
        cat_mark: markEntries[s.registration_id]?.cat_mark !== '' ? Number(markEntries[s.registration_id]?.cat_mark) : null,
        exam_mark: markEntries[s.registration_id]?.exam_mark !== '' ? Number(markEntries[s.registration_id]?.exam_mark) : null,
      }));

      const res = await api.enterMarks(selectedUnit, { entries });
      showToast(res.message || 'Marks saved successfully', 'success');
      await loadClassMarks(selectedUnit);
    } catch (err) {
      showToast(err.message || 'Failed to save marks', 'error');
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    let csv = 'Admission No,Student Name,CAT (/30),Exam (/70),Total (/100),Grade\r\n';
    classList.forEach((s) => {
      const entry = markEntries[s.registration_id] || {};
      const cat = entry.cat_mark !== '' ? Number(entry.cat_mark) : 0;
      const exam = entry.exam_mark !== '' ? Number(entry.exam_mark) : 0;
      const total = cat + exam;
      const grade = getGrade(total);
      csv += `"${s.admission_no}","${s.first_name} ${s.last_name}",${cat},${exam},${total},"${grade}"\r\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Class_Marks_${selectedUnit}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PortalLayout role="Lecturer">
      <Page title="Enter Marks">
        <div className="filter-row">
          <select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            disabled={loadingUnits}
            aria-label="Select Unit"
          >
            {units.map((item) => (
              <option key={item.unit_id} value={item.unit_id}>
                {item.unit_code} - {item.unit_name}
              </option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={() => loadClassMarks(selectedUnit)}>
            Reload Class
          </button>
        </div>

        {loadingClass ? (
          <div className="py-8 text-center text-slate-500">Loading student marks...</div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Admission No.</th>
                    <th>Student Name</th>
                    <th>CAT (/30)</th>
                    <th>Exam (/70)</th>
                    <th>Total (/100)</th>
                    <th>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {classList.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-6 text-slate-500">
                        No students enrolled in this unit.
                      </td>
                    </tr>
                  ) : (
                    classList.map((student) => {
                      const entry = markEntries[student.registration_id] || {};
                      const cat = entry.cat_mark !== '' ? Number(entry.cat_mark) : 0;
                      const exam = entry.exam_mark !== '' ? Number(entry.exam_mark) : 0;
                      const hasMarks = entry.cat_mark !== '' || entry.exam_mark !== '';
                      const total = hasMarks ? cat + exam : '-';
                      const grade = hasMarks ? getGrade(cat + exam) : '-';

                      return (
                        <tr key={student.registration_id}>
                          <td className="font-bold text-blue-950">{student.admission_no}</td>
                          <td>
                            {student.first_name} {student.last_name}
                          </td>
                          <td>
                            <input
                              className="mark-input"
                              type="number"
                              min="0"
                              max="30"
                              value={entry.cat_mark}
                              onChange={(e) =>
                                updateEntry(student.registration_id, 'cat_mark', e.target.value)
                              }
                              placeholder="0-30"
                            />
                          </td>
                          <td>
                            <input
                              className="mark-input"
                              type="number"
                              min="0"
                              max="70"
                              value={entry.exam_mark}
                              onChange={(e) =>
                                updateEntry(student.registration_id, 'exam_mark', e.target.value)
                              }
                              placeholder="0-70"
                            />
                          </td>
                          <td className="font-bold">{total}</td>
                          <td>
                            <strong className="status-green">{grade}</strong>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
              <button
                className="btn btn-primary"
                onClick={handleSaveMarks}
                disabled={saving || classList.length === 0}
              >
                {saving ? 'Saving...' : 'Save Marks'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={exportCsv}
                disabled={classList.length === 0}
              >
                Export Class Sheet
              </button>
            </div>
          </>
        )}
      </Page>
    </PortalLayout>
  );
}

// -------------------------------------------------------------
// 8. ADMIN DASHBOARD
// -------------------------------------------------------------
function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    students: 0,
    lecturers: 0,
    courses: 0,
    outstandingFees: 0,
  });
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      try {
        const [students, lecturers, courses, feesReport] = await Promise.all([
          api.listStudents().catch(() => []),
          api.listLecturers().catch(() => []),
          api.listLookup('courses').catch(() => []),
          api.getOutstandingFees().catch(() => []),
        ]);

        const totalDeficit = (feesReport || []).reduce((sum, item) => sum + Number(item.balance || 0), 0);

        setStats({
          students: (students || []).length,
          lecturers: (lecturers || []).length,
          courses: (courses || []).length,
          outstandingFees: totalDeficit,
        });
      } catch (err) {
        showToast(err.message || 'Failed to load dashboard metrics', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <PortalLayout role="Admin">
      <Page title="Administrator Dashboard">
        {loading ? (
          <div className="py-8 text-center text-slate-500">Loading metrics...</div>
        ) : (
          <>
            <StatCards
              cards={[
                { title: 'Total Students', value: stats.students, color: 'navy' },
                { title: 'Total Lecturers', value: stats.lecturers, color: 'green' },
                { title: 'Active Courses', value: stats.courses, color: 'orange' },
                {
                  title: 'Outstanding Fees',
                  value: `KES ${stats.outstandingFees.toLocaleString()}`,
                  color: 'red',
                  textColor: 'red-text',
                },
              ]}
            />
            <div className="action-row">
              <button className="btn btn-primary" onClick={() => navigate('/admin/students/new')}>
                + Add Student
              </button>
              <button className="btn btn-primary" onClick={() => navigate('/admin/fees')}>
                + Record Payment
              </button>
              <button className="btn btn-primary" onClick={() => navigate('/admin/users')}>
                + Manage Users
              </button>
            </div>
          </>
        )}
      </Page>
    </PortalLayout>
  );
}

// -------------------------------------------------------------
// 9. ADMIN REGISTER NEW STUDENT
// -------------------------------------------------------------
function RegisterStudent() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    async function loadCourses() {
      try {
        const data = await api.listLookup('courses');
        setCourses(data || []);
      } catch (err) {
        showToast('Failed to load courses', 'error');
      }
    }
    loadCourses();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setSaved(false);
    const data = new FormData(event.currentTarget);

    const payload = {
      admission_no: String(data.get('admissionNo')).trim(),
      first_name: String(data.get('firstName')).trim(),
      last_name: String(data.get('lastName')).trim(),
      gender: String(data.get('gender')),
      date_of_birth: String(data.get('dob')),
      phone: String(data.get('phone') || '').trim(),
      email: String(data.get('email') || '').trim(),
      course_id: Number(data.get('course_id')),
      year_of_study: Number(data.get('yearOfStudy') || 1),
      admission_date: String(data.get('admissionDate') || new Date().toISOString().split('T')[0]),
      password: String(data.get('password') || 'Siwaka@2026'),
      status: 'active',
    };

    try {
      await api.createStudent(payload);
      setSaved(true);
      showToast(`Student ${payload.admission_no} registered successfully`, 'success');
      event.target.reset();
    } catch (err) {
      showToast(err.message || 'Failed to register student', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PortalLayout role="Admin">
      <Page title="Students > Register New Student" eyebrow="Students">
        {saved && <div className="success-banner">Student and login account created successfully.</div>}
        <form className="student-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              Admission Number *
              <input name="admissionNo" required placeholder="SP/26/0148" />
            </label>
            <label>
              Course *
              <select name="course_id" required>
                {courses.map((c) => (
                  <option key={c.course_id} value={c.course_id}>
                    {c.course_name} ({c.course_code})
                  </option>
                ))}
              </select>
            </label>
            <label>
              First Name *<input name="firstName" required placeholder="e.g. Victor" />
            </label>
            <label>
              Last Name *<input name="lastName" required placeholder="e.g. Kiprono" />
            </label>
            <label>
              Date of Birth *<input type="date" name="dob" defaultValue="2005-01-01" required />
            </label>
            <label>
              Admission Date *<input type="date" name="admissionDate" defaultValue={new Date().toISOString().split('T')[0]} required />
            </label>
            <label>
              Email Address<input type="email" name="email" placeholder="student@siwaka.ac.ke" />
            </label>
            <label>
              Phone Number<input name="phone" placeholder="+254 712 345 678" />
            </label>
            <label>
              Year of Study
              <select name="yearOfStudy">
                <option value="1">Year 1</option>
                <option value="2">Year 2</option>
                <option value="3">Year 3</option>
              </select>
            </label>
            <label>
              Gender *
              <select name="gender" required>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label>
              Initial Password * (min 8 chars)
              <input name="password" defaultValue="Siwaka@2026" minLength={8} required />
            </label>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Registering...' : 'Register Student'}
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => navigate('/admin/dashboard')}>
              Cancel
            </button>
          </div>
        </form>
      </Page>
    </PortalLayout>
  );
}

// -------------------------------------------------------------
// 10. ADMIN FEE PAYMENTS & RECORDING
// -------------------------------------------------------------
function FeePayments() {
  const [students, setStudents] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [query, setQuery] = useState('');
  const [searchedStudent, setSearchedStudent] = useState(null);
  const [studentBalance, setStudentBalance] = useState(null);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('M-Pesa');
  const [reference, setReference] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    async function loadData() {
      try {
        const [stdList, semList] = await Promise.all([
          api.listStudents().catch(() => []),
          api.listLookup('semesters').catch(() => []),
        ]);
        setStudents(stdList || []);
        setSemesters(semList || []);
        if (stdList && stdList.length > 0) {
          setSearchedStudent(stdList[0]);
        }
        if (semList && semList.length > 0) {
          const current = semList.find((s) => s.is_current) || semList[0];
          setSelectedSemester(current.semester_id);
        }
      } catch (err) {
        showToast('Failed to load students or semesters', 'error');
      }
    }
    loadData();
  }, []);

  // Calculate or fetch balance for searched student
  useEffect(() => {
    async function fetchBalance() {
      if (!searchedStudent) return;
      try {
        const reports = await api.getOutstandingFees(selectedSemester || null);
        const match = (reports || []).find((r) => r.student_id === searchedStudent.student_id);
        setStudentBalance(match ? match.balance : 0);
      } catch (e) {
        setStudentBalance(0);
      }
    }
    fetchBalance();
  }, [searchedStudent, selectedSemester]);

  const handleSearch = () => {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const found = students.find(
      (s) =>
        s.admission_no.toLowerCase().includes(q) ||
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(q)
    );
    if (found) {
      setSearchedStudent(found);
    } else {
      showToast(`No student found matching "${query}"`, 'error');
    }
  };

  const handlePay = async (event) => {
    event.preventDefault();
    if (!searchedStudent || !amount) return;

    setSubmitting(true);
    try {
      const payload = {
        student_id: searchedStudent.student_id,
        semester_id: Number(selectedSemester),
        amount_paid: Number(amount),
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: paymentMethod,
        reference_no: reference.trim() || `PAY-${Date.now()}`,
      };

      await api.recordPayment(payload);
      showToast(`Payment of KES ${Number(amount).toLocaleString()} recorded successfully`, 'success');
      setAmount('');
      setReference('');

      // Refresh balance
      const reports = await api.getOutstandingFees(selectedSemester || null);
      const match = (reports || []).find((r) => r.student_id === searchedStudent.student_id);
      setStudentBalance(match ? match.balance : 0);
    } catch (err) {
      showToast(err.message || 'Failed to record payment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PortalLayout role="Admin">
      <Page title="Fee Management & Payment Recording">
        <div className="search-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by admission number or student name..."
          />
          <button className="btn btn-primary" type="button" onClick={handleSearch}>
            Search
          </button>
        </div>

        <div className="fee-layout">
          <section className="student-summary">
            <span>Student Summary</span>
            <h2>
              {searchedStudent ? `${searchedStudent.first_name} ${searchedStudent.last_name}` : 'Select a student'}
            </h2>
            <p className="font-bold text-blue-950">{searchedStudent?.admission_no}</p>
            <p>{searchedStudent?.course_name || 'No course'}</p>
            <div className="balance-box">
              <span>Outstanding Fee Balance</span>
              <strong>KES {(studentBalance !== null ? studentBalance : 0).toLocaleString()}</strong>
            </div>
          </section>

          <form className="payment-card" onSubmit={handlePay}>
            <h2>Record Payment</h2>
            <label>
              Semester
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                required
              >
                {semesters.map((s) => (
                  <option key={s.semester_id} value={s.semester_id}>
                    {s.academic_year} - {s.semester_name} {s.is_current ? '(Current)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Amount (KES) *
              <input
                type="number"
                min="1"
                step="100"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 10000"
                required
              />
            </label>
            <label>
              Payment Method *
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="M-Pesa">M-Pesa</option>
                <option value="Bank">Bank Deposit</option>
                <option value="Cash">Cash</option>
              </select>
            </label>
            <label>
              Reference Number *
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. QKD992817A"
                required
              />
            </label>
            <button className="btn btn-primary" type="submit" disabled={submitting || !searchedStudent}>
              {submitting ? 'Recording...' : 'Record Payment'}
            </button>
          </form>
        </div>
      </Page>
    </PortalLayout>
  );
}

// -------------------------------------------------------------
// 11. ADMIN USER ACCOUNTS & PASSWORD RESET
// -------------------------------------------------------------
function UserAccounts() {
  const [students, setStudents] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const [stdList, lecList] = await Promise.all([
        api.listStudents().catch(() => []),
        api.listLecturers().catch(() => []),
      ]);
      setStudents(stdList || []);
      setLecturers(lecList || []);
    } catch (err) {
      showToast('Failed to load user accounts', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const allUsers = useMemo(() => {
    const list = [];
    students.forEach((s) => {
      list.push({
        user_id: s.user_id,
        name: `${s.first_name} ${s.last_name}`,
        username: s.admission_no,
        role: 'Student',
        status: s.account_status || 'active',
      });
    });
    lecturers.forEach((l) => {
      list.push({
        user_id: l.user_id,
        name: `${l.first_name} ${l.last_name}`,
        username: l.staff_no,
        role: 'Lecturer',
        status: l.account_status || 'active',
      });
    });
    return list;
  }, [students, lecturers]);

  const visibleUsers = allUsers.filter((u) => {
    const matchesRole = roleFilter === 'All Roles' || u.role === roleFilter;
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const handleResetPassword = async (userId, username) => {
    const tempPassword = prompt(`Enter new password for ${username} (min 8 characters):`, 'Siwaka@2026');
    if (!tempPassword) return;

    if (tempPassword.length < 8) {
      showToast('Password must be at least 8 characters long', 'error');
      return;
    }

    try {
      const res = await api.resetPassword(userId, tempPassword);
      showToast(res.message || `Password reset successfully for ${username}`, 'success');
      await loadAccounts();
    } catch (err) {
      showToast(err.message || 'Failed to reset password', 'error');
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      const res = await api.setUserStatus(userId, newStatus);
      showToast(res.message || `Account status updated to ${newStatus}`, 'success');
      await loadAccounts();
    } catch (err) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  return (
    <PortalLayout role="Admin">
      <Page title="User Accounts & Security">
        <div className="filter-row">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or username..."
          />
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option>All Roles</option>
            <option>Student</option>
            <option>Lecturer</option>
          </select>
          <button className="btn btn-secondary" onClick={loadAccounts}>
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-500">Loading user accounts...</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Account Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-6 text-slate-500">
                      No accounts found matching criteria.
                    </td>
                  </tr>
                ) : (
                  visibleUsers.map((user) => (
                    <tr key={user.user_id || user.username}>
                      <td className="font-semibold text-slate-800">{user.name}</td>
                      <td className="font-bold text-blue-950">{user.username}</td>
                      <td>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100">
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <span className={user.status === 'active' ? 'status-green' : 'status-red'}>
                          {user.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="flex gap-2">
                        <button
                          className="btn-reset"
                          onClick={() => handleResetPassword(user.user_id, user.username)}
                        >
                          Reset Pwd
                        </button>
                        <button
                          className="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-100 font-semibold"
                          onClick={() => handleToggleStatus(user.user_id, user.status)}
                        >
                          {user.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Page>
    </PortalLayout>
  );
}

// -------------------------------------------------------------
// 12. ADMIN STUDENTS DIRECTORY
// -------------------------------------------------------------
function AdminStudentsList() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [courseFilter, setCourseFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const loadData = async (cId = null) => {
    setLoading(true);
    try {
      const [stdList, crsList] = await Promise.all([
        api.listStudents(cId),
        api.listLookup('courses').catch(() => []),
      ]);
      setStudents(stdList || []);
      setCourses(crsList || []);
    } catch (err) {
      showToast(err.message || 'Failed to load students', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(courseFilter || null);
  }, [courseFilter]);

  return (
    <PortalLayout role="Admin">
      <Page
        title="Students Directory"
        actions={
          <button className="btn btn-primary" onClick={() => navigate('/admin/students/new')}>
            + Add New Student
          </button>
        }
      >
        <div className="filter-row">
          <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
            <option value="">All Courses</option>
            {courses.map((c) => (
              <option key={c.course_id} value={c.course_id}>
                {c.course_name}
              </option>
            ))}
          </select>
          <button className="btn btn-secondary" onClick={() => loadData(courseFilter || null)}>
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-500">Loading students directory...</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Adm No.</th>
                  <th>Student Name</th>
                  <th>Course</th>
                  <th>Year</th>
                  <th>Gender</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-6 text-slate-500">
                      No students found.
                    </td>
                  </tr>
                ) : (
                  students.map((s) => (
                    <tr key={s.student_id}>
                      <td className="font-bold text-blue-950">{s.admission_no}</td>
                      <td>
                        {s.first_name} {s.last_name}
                      </td>
                      <td>{s.course_name}</td>
                      <td>Year {s.year_of_study}</td>
                      <td>{s.gender}</td>
                      <td>
                        <span className="status-green">{s.student_status}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Page>
    </PortalLayout>
  );
}

// -------------------------------------------------------------
// 13. ADMIN LECTURERS DIRECTORY
// -------------------------------------------------------------
function AdminLecturersList() {
  const [lecturers, setLecturers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const loadLecturers = async () => {
    setLoading(true);
    try {
      const [lecList, depList] = await Promise.all([
        api.listLecturers(),
        api.listLookup('departments').catch(() => []),
      ]);
      setLecturers(lecList || []);
      setDepartments(depList || []);
    } catch (err) {
      showToast(err.message || 'Failed to load lecturers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLecturers();
  }, []);

  const handleAddLecturer = async (e) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const payload = {
      staff_no: String(data.get('staff_no')).trim(),
      first_name: String(data.get('first_name')).trim(),
      last_name: String(data.get('last_name')).trim(),
      department_id: Number(data.get('department_id')),
      email: String(data.get('email') || '').trim(),
      phone: String(data.get('phone') || '').trim(),
      password: String(data.get('password') || 'Siwaka@2026'),
    };

    try {
      await api.createLecturer(payload);
      showToast(`Lecturer ${payload.staff_no} added successfully`, 'success');
      setModalOpen(false);
      await loadLecturers();
    } catch (err) {
      showToast(err.message || 'Failed to add lecturer', 'error');
    }
  };

  return (
    <PortalLayout role="Admin">
      <Page
        title="Faculty & Lecturers"
        actions={
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
            + Add Lecturer
          </button>
        }
      >
        {loading ? (
          <div className="py-8 text-center text-slate-500">Loading faculty...</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Staff No</th>
                  <th>Full Name</th>
                  <th>Department</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {lecturers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-6 text-slate-500">
                      No lecturers found.
                    </td>
                  </tr>
                ) : (
                  lecturers.map((l) => (
                    <tr key={l.lecturer_id}>
                      <td className="font-bold text-blue-950">{l.staff_no}</td>
                      <td>
                        {l.first_name} {l.last_name}
                      </td>
                      <td>{l.department_name}</td>
                      <td>{l.phone || '-'}</td>
                      <td>{l.email || '-'}</td>
                      <td>
                        <span className="status-green">{l.account_status || 'active'}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full shadow-2xl border border-slate-200">
              <h2 className="text-lg font-bold text-slate-800 mb-4">Add New Lecturer</h2>
              <form onSubmit={handleAddLecturer} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs font-bold text-slate-700 uppercase">
                    Staff No *
                    <input name="staff_no" required placeholder="LEC-004" className="w-full px-3 py-2 border rounded text-sm" />
                  </label>
                  <label className="text-xs font-bold text-slate-700 uppercase">
                    Department *
                    <select name="department_id" required className="w-full px-3 py-2 border rounded text-sm">
                      {departments.map((d) => (
                        <option key={d.department_id} value={d.department_id}>
                          {d.department_name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs font-bold text-slate-700 uppercase">
                    First Name *
                    <input name="first_name" required className="w-full px-3 py-2 border rounded text-sm" />
                  </label>
                  <label className="text-xs font-bold text-slate-700 uppercase">
                    Last Name *
                    <input name="last_name" required className="w-full px-3 py-2 border rounded text-sm" />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs font-bold text-slate-700 uppercase">
                    Email
                    <input name="email" type="email" placeholder="lecturer@siwaka.ac.ke" className="w-full px-3 py-2 border rounded text-sm" />
                  </label>
                  <label className="text-xs font-bold text-slate-700 uppercase">
                    Phone
                    <input name="phone" placeholder="+254 712 345 678" className="w-full px-3 py-2 border rounded text-sm" />
                  </label>
                </div>
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Password * (min 8 chars)
                  <input name="password" defaultValue="Siwaka@2026" minLength={8} required className="w-full px-3 py-2 border rounded text-sm" />
                </label>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save Lecturer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </Page>
    </PortalLayout>
  );
}

// -------------------------------------------------------------
// 14. ADMIN LOOKUP TABLES & ALLOCATIONS
// -------------------------------------------------------------
function AdminLookups() {
  const [activeTab, setActiveTab] = useState('semesters');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const loadTable = async (table) => {
    setLoading(true);
    try {
      const items = await api.listLookup(table);
      setData(items || []);
    } catch (err) {
      showToast(err.message || `Failed to load ${table}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTable(activeTab);
  }, [activeTab]);

  const handleSetCurrentSemester = async (semesterId) => {
    try {
      const res = await api.setCurrentSemester(semesterId);
      showToast(res.message || 'Current semester updated', 'success');
      await loadTable('semesters');
    } catch (err) {
      showToast(err.message || 'Failed to set current semester', 'error');
    }
  };

  return (
    <PortalLayout role="Admin">
      <Page title="Academic Catalog & Lookup Management">
        <div className="flex gap-2 border-b border-slate-200 mb-6">
          {['semesters', 'departments', 'courses', 'units'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-bold text-xs uppercase tracking-wider border-b-2 transition ${
                activeTab === tab
                  ? 'border-blue-900 text-blue-900 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-500">Loading catalog data...</div>
        ) : (
          <div className="table-wrap">
            {activeTab === 'semesters' && (
              <table>
                <thead>
                  <tr>
                    <th>Academic Year</th>
                    <th>Semester Name</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((s) => (
                    <tr key={s.semester_id}>
                      <td className="font-bold text-blue-950">{s.academic_year}</td>
                      <td>{s.semester_name}</td>
                      <td>{s.start_date}</td>
                      <td>{s.end_date}</td>
                      <td>
                        <span className={s.is_current ? 'status-green' : 'text-slate-400'}>
                          {s.is_current ? 'CURRENT' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        {!s.is_current && (
                          <button
                            className="btn-reset"
                            onClick={() => handleSetCurrentSemester(s.semester_id)}
                          >
                            Set As Current
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'departments' && (
              <table>
                <thead>
                  <tr>
                    <th>Department Code</th>
                    <th>Department Name</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((d) => (
                    <tr key={d.department_id}>
                      <td className="font-bold text-blue-950">{d.department_code}</td>
                      <td>{d.department_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'courses' && (
              <table>
                <thead>
                  <tr>
                    <th>Course Code</th>
                    <th>Course Name</th>
                    <th>Level</th>
                    <th>Duration (Semesters)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((c) => (
                    <tr key={c.course_id}>
                      <td className="font-bold text-blue-950">{c.course_code}</td>
                      <td>{c.course_name}</td>
                      <td>{c.level}</td>
                      <td>{c.duration_semesters}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'units' && (
              <table>
                <thead>
                  <tr>
                    <th>Unit Code</th>
                    <th>Unit Name</th>
                    <th>Year of Study</th>
                    <th>Semester No</th>
                    <th>Credit Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((u) => (
                    <tr key={u.unit_id}>
                      <td className="font-bold text-blue-950">{u.unit_code}</td>
                      <td>{u.unit_name}</td>
                      <td>Year {u.year_of_study}</td>
                      <td>Sem {u.semester_no}</td>
                      <td>{u.credit_hours} CH</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </Page>
    </PortalLayout>
  );
}

// -------------------------------------------------------------
// 15. ADMIN REPORTS (Outstanding Fees Report)
// -------------------------------------------------------------
function AdminReports() {
  const [report, setReport] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const loadReport = async (semId = null) => {
    setLoading(true);
    try {
      const [feeData, semList] = await Promise.all([
        api.getOutstandingFees(semId),
        api.listLookup('semesters').catch(() => []),
      ]);
      setReport(feeData || []);
      setSemesters(semList || []);
    } catch (err) {
      showToast(err.message || 'Failed to load outstanding fees report', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport(selectedSemester || null);
  }, [selectedSemester]);

  const totalOutstanding = useMemo(() => {
    return report.reduce((sum, item) => sum + Number(item.balance || 0), 0);
  }, [report]);

  return (
    <PortalLayout role="Admin">
      <Page title="Outstanding Fees Report">
        <div className="filter-row">
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            aria-label="Filter by Semester"
          >
            <option value="">Current Semester</option>
            {semesters.map((s) => (
              <option key={s.semester_id} value={s.semester_id}>
                {s.academic_year} - {s.semester_name}
              </option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={() => loadReport(selectedSemester || null)}>
            Generate Report
          </button>
          <button className="btn btn-secondary" onClick={() => window.print()}>
            Print Report
          </button>
        </div>

        <div className="balance-box mb-6">
          <span>Total Outstanding Deficit</span>
          <strong>KES {totalOutstanding.toLocaleString()}</strong>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-500">Generating report...</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Admission No.</th>
                  <th>Student Name</th>
                  <th>Amount Due</th>
                  <th>Amount Paid</th>
                  <th>Outstanding Balance</th>
                </tr>
              </thead>
              <tbody>
                {report.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-6 text-slate-500">
                      No outstanding fee balances found for this semester.
                    </td>
                  </tr>
                ) : (
                  report.map((item) => (
                    <tr key={item.student_id}>
                      <td className="font-bold text-blue-950">{item.admission_no}</td>
                      <td>
                        {item.first_name} {item.last_name}
                      </td>
                      <td>KES {Number(item.amount_due).toLocaleString()}</td>
                      <td className="text-green-700 font-semibold">
                        KES {Number(item.amount_paid).toLocaleString()}
                      </td>
                      <td className="font-bold status-red">
                        KES {Number(item.balance).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Page>
    </PortalLayout>
  );
}

// -------------------------------------------------------------
// APP ROUTER
// -------------------------------------------------------------
export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<Login />} />

          {/* Student Routes */}
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/register-units" element={<UnitRegistration />} />
          <Route path="/student/results" element={<Results />} />
          <Route path="/student/fees" element={<StudentFees />} />
          <Route path="/student/attendance" element={<StudentAttendance />} />

          {/* Lecturer Routes */}
          <Route path="/lecturer/attendance" element={<Attendance />} />
          <Route path="/lecturer/marks" element={<Marks />} />
          <Route path="/lecturer/units" element={<Attendance />} />

          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/students" element={<AdminStudentsList />} />
          <Route path="/admin/students/new" element={<RegisterStudent />} />
          <Route path="/admin/lecturers" element={<AdminLecturersList />} />
          <Route path="/admin/fees" element={<FeePayments />} />
          <Route path="/admin/users" element={<UserAccounts />} />
          <Route path="/admin/lookups" element={<AdminLookups />} />
          <Route path="/admin/reports" element={<AdminReports />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}
