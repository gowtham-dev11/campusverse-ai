import React, { useState } from 'react';
import {
  GraduationCap, ShieldCheck, Mail, Lock, User, Building2,
  Hash, Loader2, AlertCircle, Sparkles
} from 'lucide-react';
import { useStudentAuth } from '../context/StudentAuthContext';
import { useAdmin } from '../context/AdminContext';
import './auth.css';

const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Information Technology',
  'Electronics & Communication',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering'
];

// ---------- Student: Login ----------
function StudentLoginForm({ onSwitchToSignup }) {
  const { login } = useStudentAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      {error && (
        <div className="auth-alert">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      <label className="auth-field-label">Email</label>
      <div className="auth-input-wrap">
        <Mail size={14} className="auth-input-icon" />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@campus.edu"
          autoComplete="username"
          className="auth-input"
          required
        />
      </div>

      <label className="auth-field-label">Password</label>
      <div className="auth-input-wrap">
        <Lock size={14} className="auth-input-icon" />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          className="auth-input"
          required
        />
      </div>

      <button type="submit" disabled={loading} className="auth-btn-primary">
        {loading ? (
          <>
            <Loader2 size={15} className="auth-spin" />
            <span>Signing in...</span>
          </>
        ) : (
          <span>Sign in to CampusVerse</span>
        )}
      </button>

      <p className="auth-switch-line">
        New here?{' '}
        <button type="button" className="auth-link-btn" onClick={onSwitchToSignup}>
          Create a student account
        </button>
      </p>

      <div className="auth-footnote">
        Seeded demo account: <code>aarav.sharma@campus.edu</code> / <code>Student@123</code>
      </div>
    </form>
  );
}

// ---------- Student: Signup ----------
function StudentSignupForm({ onSwitchToLogin }) {
  const { signup } = useStudentAuth();
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    department: DEPARTMENTS[0], year: '3', cgpa: '', interests: '', skills: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await signup({
        name: form.name,
        email: form.email,
        password: form.password,
        department: form.department,
        year: form.year,
        cgpa: form.cgpa,
        interests: form.interests,
        skills: form.skills
      });
    } catch (err) {
      setError(err.message || 'Signup failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      {error && (
        <div className="auth-alert">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      <label className="auth-field-label">Full Name</label>
      <div className="auth-input-wrap">
        <User size={14} className="auth-input-icon" />
        <input
          type="text"
          value={form.name}
          onChange={update('name')}
          placeholder="Aarav Sharma"
          autoComplete="name"
          className="auth-input"
          required
        />
      </div>

      <label className="auth-field-label">Email</label>
      <div className="auth-input-wrap">
        <Mail size={14} className="auth-input-icon" />
        <input
          type="email"
          value={form.email}
          onChange={update('email')}
          placeholder="you@campus.edu"
          autoComplete="username"
          className="auth-input"
          required
        />
      </div>

      <div className="auth-field-row">
        <div style={{ flex: 1.4 }}>
          <label className="auth-field-label">Department</label>
          <div className="auth-input-wrap">
            <Building2 size={14} className="auth-input-icon" />
            <select value={form.department} onChange={update('department')} className="auth-input auth-select" required>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <label className="auth-field-label">Year</label>
          <div className="auth-input-wrap">
            <Hash size={14} className="auth-input-icon" />
            <select value={form.year} onChange={update('year')} className="auth-input auth-select" required>
              {[1, 2, 3, 4].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      <label className="auth-field-label">Password</label>
      <div className="auth-input-wrap">
        <Lock size={14} className="auth-input-icon" />
        <input
          type="password"
          value={form.password}
          onChange={update('password')}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          className="auth-input"
          required
        />
      </div>

      <label className="auth-field-label">Confirm Password</label>
      <div className="auth-input-wrap">
        <Lock size={14} className="auth-input-icon" />
        <input
          type="password"
          value={form.confirmPassword}
          onChange={update('confirmPassword')}
          placeholder="Re-enter password"
          autoComplete="new-password"
          className="auth-input"
          required
        />
      </div>

      <button type="submit" disabled={loading} className="auth-btn-primary">
        {loading ? (
          <>
            <Loader2 size={15} className="auth-spin" />
            <span>Creating account...</span>
          </>
        ) : (
          <span>Create student account</span>
        )}
      </button>

      <p className="auth-switch-line">
        Already have an account?{' '}
        <button type="button" className="auth-link-btn" onClick={onSwitchToLogin}>
          Sign in instead
        </button>
      </p>
    </form>
  );
}

// ---------- Staff: Login ----------
function StaffLoginForm() {
  const { login } = useAdmin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      {error && (
        <div className="auth-alert">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      <label className="auth-field-label">Staff Email</label>
      <div className="auth-input-wrap">
        <Mail size={14} className="auth-input-icon" />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@campusverse.edu"
          autoComplete="username"
          className="auth-input"
          required
        />
      </div>

      <label className="auth-field-label">Password</label>
      <div className="auth-input-wrap">
        <Lock size={14} className="auth-input-icon" />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          className="auth-input"
          required
        />
      </div>

      <button type="submit" disabled={loading} className="auth-btn-primary auth-btn-staff">
        {loading ? (
          <>
            <Loader2 size={15} className="auth-spin" />
            <span>Verifying credentials...</span>
          </>
        ) : (
          <span>Sign in to Staff Console</span>
        )}
      </button>

      <div className="auth-footnote">
        Seeded demo accounts: <code>admin@campusverse.edu</code> / <code>anita.sen@campusverse.edu</code>
        <br />Staff accounts are provisioned by the institution, not self-signup.
      </div>
    </form>
  );
}

// ---------- Common Login Page ----------
export default function CommonLogin({ initialRole = 'student' }) {
  const [role, setRole] = useState(initialRole); // 'student' | 'staff'
  const [studentMode, setStudentMode] = useState('login'); // 'login' | 'signup'

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-icon">
            <Sparkles size={20} />
          </div>
          <div>
            <h1 className="auth-title">CampusVerse AI</h1>
            <p className="auth-subtitle">One portal, two entry points — sign in as a student or as staff</p>
          </div>
        </div>

        <div className="auth-role-toggle">
          <button
            type="button"
            className={`auth-role-btn ${role === 'student' ? 'active' : ''}`}
            onClick={() => setRole('student')}
          >
            <GraduationCap size={15} />
            <span>Student</span>
          </button>
          <button
            type="button"
            className={`auth-role-btn ${role === 'staff' ? 'active' : ''}`}
            onClick={() => setRole('staff')}
          >
            <ShieldCheck size={15} />
            <span>Staff</span>
          </button>
        </div>

        {role === 'student' && (
          <>
            <div className="auth-subtabs">
              <button
                type="button"
                className={`auth-subtab-btn ${studentMode === 'login' ? 'active' : ''}`}
                onClick={() => setStudentMode('login')}
              >
                Log In
              </button>
              <button
                type="button"
                className={`auth-subtab-btn ${studentMode === 'signup' ? 'active' : ''}`}
                onClick={() => setStudentMode('signup')}
              >
                Sign Up
              </button>
            </div>
            {studentMode === 'login'
              ? <StudentLoginForm onSwitchToSignup={() => setStudentMode('signup')} />
              : <StudentSignupForm onSwitchToLogin={() => setStudentMode('login')} />}
          </>
        )}

        {role === 'staff' && <StaffLoginForm />}
      </div>
    </div>
  );
}
