// Student Auth Routes
// Real accounts for students — email + password, hashed with bcrypt and
// stored in the Student table (passwordHash column), same pattern as
// Staff. Mounted at /api/auth/student. Unlike Staff, students self-signup
// (there's no "office admin" equivalent to provision a student account).

import express from 'express';
import bcrypt from 'bcryptjs';
import { signStudentToken, requireStudent } from '../middleware/auth.js';

const SALT_ROUNDS = 10;

export function createStudentAuthRouter(prisma) {
  const router = express.Router();

  // POST /api/auth/student/signup
  router.post('/signup', async (req, res) => {
    try {
      const { name, email, password, department, year, cgpa, interests, skills } = req.body;

      if (!name || !email || !password || !department || !year) {
        return res.status(400).json({ error: 'Name, email, password, department, and year are required.' });
      }
      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters.' });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const existing = await prisma.student.findUnique({ where: { email: normalizedEmail } });
      if (existing) {
        return res.status(409).json({ error: 'An account with this email already exists. Please log in instead.' });
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const student = await prisma.student.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          passwordHash,
          department,
          year: Number(year),
          cgpa: cgpa ? Number(cgpa) : 0,
          interests: interests || '',
          skills: skills || ''
        }
      });

      const token = signStudentToken(student);
      res.json({
        success: true,
        token,
        student: {
          id: student.id,
          name: student.name,
          email: student.email,
          department: student.department,
          year: student.year,
          cgpa: student.cgpa,
          interests: student.interests,
          skills: student.skills
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/auth/student/login
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }

      const student = await prisma.student.findUnique({ where: { email: email.toLowerCase().trim() } });
      if (!student) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const passwordMatches = await bcrypt.compare(password, student.passwordHash);
      if (!passwordMatches) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const token = signStudentToken(student);
      res.json({
        success: true,
        token,
        student: {
          id: student.id,
          name: student.name,
          email: student.email,
          department: student.department,
          year: student.year,
          cgpa: student.cgpa,
          interests: student.interests,
          skills: student.skills
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/auth/student/me — lets the frontend verify a stored token on page load
  router.get('/me', requireStudent, async (req, res) => {
    const student = await prisma.student.findUnique({ where: { id: req.student.id } });
    if (!student) {
      return res.status(401).json({ error: 'Account no longer exists. Please log in again.' });
    }
    res.json({
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        department: student.department,
        year: student.year,
        cgpa: student.cgpa,
        interests: student.interests,
        skills: student.skills
      }
    });
  });

  return router;
}
