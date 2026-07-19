import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { StudentAuthProvider, useStudentAuth } from '../context/StudentAuthContext';
import { AdminProvider, useAdmin } from '../context/AdminContext';
import CommonLogin from './CommonLogin';
import App from '../App';
import AdminDashboard from '../admin/AdminDashboard';
import '../admin/admin.css';
import './auth.css';

// The single, common entry point for the whole app. Both students and staff
// land here first — whichever session (if any) is already valid decides
// what renders next:
//   - a valid student session -> the student SPA (App.jsx)
//   - a valid staff session   -> the staff console (AdminDashboard.jsx)
//   - neither                 -> the shared login/signup page (CommonLogin)
//
// Both auth contexts are mounted at all times so either session can be
// checked/restored from localStorage on page load, regardless of which
// role last used this browser.
function Gate({ initialRole }) {
  const { student, authChecked: studentAuthChecked } = useStudentAuth();
  const { staff, authChecked: staffAuthChecked } = useAdmin();

  if (!studentAuthChecked || !staffAuthChecked) {
    return (
      <div className="auth-loading-screen">
        <Sparkles size={26} />
        <Loader2 size={18} className="auth-spin" />
        <span>Checking your session...</span>
      </div>
    );
  }

  // Which session takes priority depends on which entry point was used
  // (root '/' vs '/admin'), so e.g. a student who clicks "Staff Console"
  // lands on the staff login form rather than being kept in the student
  // app just because a student session also happens to be active.
  if (initialRole === 'staff') {
    if (staff) {
      return (
        <div className="admin-root">
          <AdminDashboard />
        </div>
      );
    }
    return <CommonLogin initialRole={initialRole} />;
  }

  if (student) {
    return <App />;
  }

  if (staff) {
    return (
      <div className="admin-root">
        <AdminDashboard />
      </div>
    );
  }

  return <CommonLogin initialRole={initialRole} />;
}

export default function AuthGate({ initialRole = 'student' }) {
  return (
    <StudentAuthProvider>
      <AdminProvider>
        <Gate initialRole={initialRole} />
      </AdminProvider>
    </StudentAuthProvider>
  );
}
