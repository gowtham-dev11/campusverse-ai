// Staff Auth Routes
// Handles login for the separate Admin/Faculty portal. Mounted at
// /api/auth/staff — see routes/studentAuthRoutes.js for the student side.
// Staff accounts are provisioned by seeding/another admin, not self-signup.

import express from 'express';
import bcrypt from 'bcryptjs';
import { signStaffToken, requireStaff } from '../middleware/auth.js';

export function createAuthRouter(prisma) {
  const router = express.Router();

  // POST /api/auth/staff/login
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }

      const staff = await prisma.staff.findUnique({ where: { email: email.toLowerCase().trim() } });
      if (!staff) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const passwordMatches = await bcrypt.compare(password, staff.passwordHash);
      if (!passwordMatches) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const token = signStaffToken(staff);
      res.json({
        success: true,
        token,
        staff: {
          id: staff.id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
          department: staff.department
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/auth/staff/me — lets the frontend verify a stored token on page load
  router.get('/me', requireStaff, (req, res) => {
    res.json({ staff: req.staff });
  });

  return router;
}
