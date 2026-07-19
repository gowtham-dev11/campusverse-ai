import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { orchestrateQuery } from './agents/plannerAgent.js';
import { KGService } from './services/kgService.js';
import { getRecommendations } from './services/recommendationEngine.js';
import { isGeminiAvailable, getGeminiProviderInfo } from './services/geminiService.js';
import { createAuthRouter } from './routes/authRoutes.js';
import { createAdminRouter } from './routes/adminRoutes.js';
import { createCommunityRouter } from './routes/communityRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const prisma = new PrismaClient();
const kgService = new KGService(prisma);

// CORS_ORIGIN lets a production deploy lock this down to the deployed
// frontend's exact origin (comma-separated for multiple). Left unset (the
// default for local dev, and for the single-service deploy below where
// frontend + backend share an origin anyway), it stays permissive.
const corsOrigin = process.env.CORS_ORIGIN;
app.use(cors(corsOrigin ? { origin: corsOrigin.split(',').map(o => o.trim()) } : {}));
// Limit raised from Express's 100kb default so base64-encoded event poster
// images (see POST/PUT /api/admin/events) fit in the request body. 8mb
// comfortably covers a compressed poster image with base64's ~33% overhead.
app.use(express.json({ limit: '8mb' }));

// Health check — used by hosting platforms (Render/Railway/Fly) to confirm
// the service is up before routing traffic to it, and by uptime monitors.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Helper to get active Student (we seed one student, Aarav Sharma) — needs
// to be defined before the routers below so it can be passed into them.
async function getActiveStudent() {
  let student = await prisma.student.findFirst();
  if (!student) {
    throw new Error('Please run seeding first using npm run db:seed');
  }
  return student;
}

// Separate Admin/Faculty portal — every route here requires a staff JWT
// (see middleware/auth.js). This is intentionally isolated from the
// student-facing endpoints below.
app.use('/api/auth', createAuthRouter(prisma));
app.use('/api/admin', createAdminRouter(prisma));

// AI Senior Mentor Community — student-facing, not staff-gated.
app.use('/api/community', createCommunityRouter(prisma, getActiveStudent));

// PORT
const PORT = process.env.PORT || 5000;

// 1. Get Student State (for dashboard sync)
app.get('/api/student', async (req, res) => {
  try {
    const student = await getActiveStudent();
    const updatedStudent = await prisma.student.findUnique({
      where: { id: student.id },
      include: { registrations: true, studyPlans: true }
    });

    const allClubs = await prisma.club.findMany();
    const allEvents = await prisma.event.findMany();

    const joinedClubs = updatedStudent.registrations
      .map(r => allClubs.find(c => c.id === r.clubId))
      .filter(Boolean);

    const registeredEvents = updatedStudent.registrations
      .map(r => allEvents.find(e => e.id === r.eventId))
      .filter(Boolean);

    const activePlans = updatedStudent.studyPlans.map(p => ({
      subject: p.subject,
      date: p.date,
      tasks: JSON.parse(p.tasks)
    }));

    const activeReminders = await prisma.memory.findMany({
      where: { studentId: student.id, category: 'goal' }
    });

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
      },
      dashboard: {
        joinedClubs,
        registeredEvents,
        activePlans,
        activeReminders: activeReminders.map(m => m.value)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Chat API - Triggers Agent Orchestration Engine
app.post('/api/agent/chat', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const student = await getActiveStudent();
    const result = await orchestrateQuery(student.id, query, prisma);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2b. Voice Assistant API - accepts a transcript captured client-side by the
// Web Speech API and routes it through the exact same orchestrateQuery
// pipeline as the text chat endpoint above. No separate voice AI logic here
// by design: transcription happens in the browser, and the response text
// the frontend already builds from `data`/`intent` (see
// getAgentTextResponse in CampusContext.jsx) is what gets spoken back via
// speech synthesis. `inputMode` just lets the frontend distinguish a
// voice-originated turn for UI purposes (e.g. auto-speak the reply).
app.post('/api/agent/voice', async (req, res) => {
  try {
    const { transcript } = req.body;
    if (!transcript || !transcript.trim()) {
      return res.status(400).json({ error: 'Transcript is required' });
    }

    const student = await getActiveStudent();
    const result = await orchestrateQuery(student.id, transcript, prisma);
    res.json({ ...result, inputMode: 'voice' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Knowledge Graph Visualization Data
app.get('/api/kg/graph', async (req, res) => {
  try {
    const graphData = await kgService.getFullGraph();
    res.json(graphData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3b. Public read-only listings (used by student club-discovery UI and by
// the admin portal's "existing items" views before editing)
app.get('/api/clubs', async (req, res) => {
  try {
    const clubs = await prisma.club.findMany();
    res.json(clubs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/events', async (req, res) => {
  try {
    const events = await prisma.event.findMany();
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/hostels', async (req, res) => {
  try {
    const hostels = await prisma.hostel.findMany();
    res.json(hostels);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/library', async (req, res) => {
  try {
    const books = await prisma.libraryBook.findMany();
    res.json(books);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3c. Faculty Directory — freshers-portal requirement. Optional
// ?department= filter for the student-facing directory search/filter UI;
// with no query params, returns everyone (used by the admin resource tab).
app.get('/api/faculty', async (req, res) => {
  try {
    const { department } = req.query;
    const faculty = await prisma.faculty.findMany({
      where: department ? { department } : undefined,
      orderBy: { name: 'asc' }
    });
    res.json(faculty);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3d. Class Timetable — freshers-portal requirement. With no query params,
// returns every slot (used by the admin resource tab, consistent with
// /api/hostels, /api/library, /api/clubs). Pass ?department=&year= to
// scope to one cohort — the student dashboard does this itself using the
// logged-in student's own department/year (see loadTimetable in
// CampusContext.jsx) rather than this endpoint guessing on its behalf.
app.get('/api/timetable', async (req, res) => {
  try {
    const { department, year } = req.query;
    const where = {};
    if (department) where.department = department;
    if (year) where.year = Number(year);

    const slots = await prisma.timetableSlot.findMany({ where });
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    slots.sort((a, b) => {
      const dayDiff = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
      return dayDiff !== 0 ? dayDiff : a.startTime.localeCompare(b.startTime);
    });
    res.json(slots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Recommendation Engine Data (live endpoint)
app.get('/api/student/recommendations', async (req, res) => {
  try {
    const student = await getActiveStudent();
    const recommendations = await getRecommendations(student.id, prisma);
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// NOTE: Announcement creation moved to the protected Admin/Faculty portal
// at POST /api/admin/announcements (see routes/adminRoutes.js). The old
// unauthenticated /api/admin/announcement endpoint has been removed —
// anyone could previously post announcements with no login at all.

// 6. Analytics API
app.get('/api/analytics', async (req, res) => {
  try {
    const registrations = await prisma.registration.findMany();
    const clubs = await prisma.club.findMany();
    const events = await prisma.event.findMany();
    const students = await prisma.student.findMany();
    const queryLogs = await prisma.queryLog.findMany();

    // Club popularity — real registration counts only, no fabricated baseline.
    const clubPopularity = clubs.map(c => ({
      name: c.name,
      members: registrations.filter(r => r.clubId === c.id).length
    }));

    // Event participation — real registration counts only.
    const eventParticipation = events.map(e => ({
      name: e.name,
      attendees: registrations.filter(r => r.eventId === e.id).length
    }));

    // Average CGPA computed from actual seeded/registered students.
    const averageCgpa = students.length
      ? Number((students.reduce((sum, s) => sum + s.cgpa, 0) / students.length).toFixed(2))
      : 0;

    // Engagement rate: share of students with at least one registration.
    const studentIdsWithRegistrations = new Set(registrations.map(r => r.studentId));
    const studentEngagementRate = students.length
      ? Math.round((studentIdsWithRegistrations.size / students.length) * 100)
      : 0;

    // AI agent usage — built from real QueryLog rows written by
    // plannerAgent.js on every /api/agent/chat and /api/agent/voice call.
    // Every query passes through IntentAgent then PlannerAgent; the
    // specialized agent below that is picked by intent.
    const INTENT_TO_AGENT = {
      JOIN_CLUB: 'CommunityAgent',
      CAMPUS_UPDATES: 'CampusInfoAgent',
      EXAM_PREP: 'AcademicAgent',
      PLACEMENT_PREP: 'PlacementAgent',
      HACKATHON_DISCOVERY: 'EventIntelligenceAgent',
      NAVIGATION: 'NavigationAgent'
    };
    const specializedCounts = {};
    for (const log of queryLogs) {
      const agent = INTENT_TO_AGENT[log.intent];
      if (agent) specializedCounts[agent] = (specializedCounts[agent] || 0) + 1;
    }
    const agentUsage = [
      { name: 'IntentAgent', queries: queryLogs.length },
      { name: 'PlannerAgent', queries: queryLogs.length },
      ...Object.entries(specializedCounts).map(([name, queries]) => ({ name, queries }))
    ];

    res.json({
      metrics: {
        totalStudents: students.length,
        activeRegistrations: registrations.length,
        averageCgpa,
        studentEngagementRate
      },
      clubPopularity,
      eventParticipation,
      agentUsage
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. AI Status - lets the frontend show whether Gemini is actually wired up
app.get('/api/ai/status', (req, res) => {
  res.json({
    geminiEnabled: isGeminiAvailable(),
    model: process.env.GEMINI_MODEL || 'gemini-flash-latest',
    ...getGeminiProviderInfo() // { provider: 'studio'|'vertex', configured, project, location }
  });
});

// NOTE: Poster generation (Nano Banana) is staff-only by design — see
// POST /api/admin/poster in routes/adminRoutes.js, gated behind requireStaff.
// There used to be a duplicate unauthenticated /api/poster here for the
// student app; it's been removed since staff/faculty are the ones who
// actually create Freshers' Welcome posters, not students.

// 8. Serve the built frontend (frontend/npm run build -> frontend/dist) as
// static files, so this single Express process can be deployed as the
// whole app — no separate frontend host/CORS setup required. This is a
// no-op in local dev, where frontend/dist won't exist yet (dev uses the
// Vite dev server on its own port instead, proxying /api to here — see
// frontend/vite.config.js).
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  // Anything not matched by an /api route above falls through to the SPA
  // shell so client-side view state (not URL-routed in this app, but this
  // keeps direct/refreshed loads working regardless) resolves correctly.
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
  console.log('Serving frontend static build from', frontendDist);
}

// Start Server
app.listen(PORT, () => {
  console.log(`CampusVerse Backend running on port ${PORT}`);
});
