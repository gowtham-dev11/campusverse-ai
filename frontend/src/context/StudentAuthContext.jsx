import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Real auth context for students — email + password, backed by
// /api/auth/student/* (see backend/routes/studentAuthRoutes.js). Separate
// from AdminContext (staff side): different routes, different token,
// different storage key, but same shape/pattern so both sides behave
// consistently from the common login page's point of view.

const StudentAuthContext = createContext();
export const useStudentAuth = () => useContext(StudentAuthContext);

// See the matching comment in AdminContext.jsx for why this resolves to a
// relative '/api' by default.
const STUDENT_BACKEND_URL = import.meta.env.VITE_API_URL || '/api';
const STORAGE_KEY = 'campusverse_student_token';

export const StudentAuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY) || null);
  const [student, setStudent] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setStudent(null);
  }, []);

  // Attaches `Authorization: Bearer <token>` to every student API call.
  const fetchStudent = useCallback(async (path, options = {}) => {
    const res = await fetch(`${STUDENT_BACKEND_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });

    let data = null;
    try {
      data = await res.json();
    } catch {
      // No JSON body (e.g. a network-level failure) — leave data as null.
    }

    if (!res.ok) {
      if (res.status === 401) logout(); // expired/invalid session — bounce to login
      throw new Error((data && data.error) || `Request failed (${res.status})`);
    }

    return data;
  }, [token, logout]);

  const login = useCallback(async (email, password) => {
    const res = await fetch(`${STUDENT_BACKEND_URL}/auth/student/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Login failed. Please check your credentials.');
    }
    localStorage.setItem(STORAGE_KEY, data.token);
    setToken(data.token);
    setStudent(data.student);
    return data.student;
  }, []);

  const signup = useCallback(async (fields) => {
    const res = await fetch(`${STUDENT_BACKEND_URL}/auth/student/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields)
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Signup failed. Please try again.');
    }
    localStorage.setItem(STORAGE_KEY, data.token);
    setToken(data.token);
    setStudent(data.student);
    return data.student;
  }, []);

  // On mount (or whenever the token changes), verify it's still valid via
  // GET /api/auth/student/me rather than trusting whatever is sitting in storage.
  useEffect(() => {
    let cancelled = false;

    async function verify() {
      if (!token) {
        setAuthChecked(true);
        return;
      }
      try {
        const res = await fetch(`${STUDENT_BACKEND_URL}/auth/student/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data.student) {
          setStudent(data.student);
        } else {
          logout();
        }
      } catch {
        if (!cancelled) logout();
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    }

    verify();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <StudentAuthContext.Provider value={{
      token,
      student,
      authChecked,
      login,
      signup,
      logout,
      fetchStudent,
      backendUrl: STUDENT_BACKEND_URL
    }}>
      {children}
    </StudentAuthContext.Provider>
  );
};
