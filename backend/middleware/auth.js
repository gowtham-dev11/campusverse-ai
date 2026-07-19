// Auth Middleware
// Verifies JWTs for both authenticated identities in the app:
//   - Staff (office admin / faculty) — issued at /api/auth/staff/login,
//     attaches the decoded payload onto req.staff. Gates the Admin/Faculty
//     portal so students/visitors can't reach it.
//   - Student — issued at /api/auth/student/login, attaches the decoded
//     payload onto req.student. Gates the student-facing app now that
//     students have real accounts instead of a single hardcoded demo user.
//
// Both tokens carry a `type` claim ('staff' | 'student') so a student token
// can never be replayed against a staff-only route and vice versa, even
// though they're signed with the same secret.

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me';

export function signStaffToken(staff) {
  return jwt.sign(
    { type: 'staff', id: staff.id, email: staff.email, role: staff.role, name: staff.name },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
}

export function signStudentToken(student) {
  return jwt.sign(
    { type: 'student', id: student.id, email: student.email, name: student.name },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
}

// Requires ANY authenticated staff member (ADMIN or FACULTY).
export function requireStaff(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'staff') {
      return res.status(401).json({ error: 'This session is not a staff session. Please log in again.' });
    }
    req.staff = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

// Requires the ADMIN role specifically (office admin), not just any staff.
export function requireAdmin(req, res, next) {
  requireStaff(req, res, () => {
    if (req.staff.role !== 'ADMIN') {
      return res.status(403).json({ error: 'This action requires an Office Admin account.' });
    }
    next();
  });
}

// Requires an authenticated student.
export function requireStudent(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'student') {
      return res.status(401).json({ error: 'This session is not a student session. Please log in again.' });
    }
    req.student = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}
