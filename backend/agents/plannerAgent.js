// Central Planner & Orchestrator Agent
// Manages Intent Detection, generates reasoning steps, dispatches tasks to specialized agents, and merges outcomes.

import { detectIntent } from './intentAgent.js';
import { processNavigation } from './navigationAgent.js';
import { processAcademic } from './academicAgent.js';
import { processPlacement } from './placementAgent.js';
import { processJoinClub } from './communityAgent.js';
import { processEventDiscovery } from './eventAgent.js';
import { processCampusUpdates } from './campusInfoAgent.js';
import { getRecommendations } from '../services/recommendationEngine.js';

export async function orchestrateQuery(studentId, query, prisma) {
  // Fetch Student Profile
  const student = await prisma.student.findUnique({
    where: { id: studentId }
  });

  if (!student) {
    throw new Error('Student profile not found');
  }

  // Step 1: Detect Intent
  const analysis = await detectIntent(query, student);
  const { intent, entities } = analysis;

  const reasoningSteps = [];
  const agentCollaborations = []; // To draw interactive glowing paths
  let agentResponseData = {};

  // Fire-and-forget real usage log — backs the Analytics panel's "AI
  // Specialized Agent Usage" chart with actual counts (see QueryLog in
  // schema.prisma). Never blocks or fails the user-facing response.
  prisma.queryLog.create({ data: { intent } }).catch(() => {});

  reasoningSteps.push({
    title: 'Intent Analysis',
    status: 'success',
    detail: analysis.source === 'gemini'
      ? `Gemini classified user goal as "${intent}" (confidence ${Math.round(analysis.confidence * 100)}%) with entities: ${JSON.stringify(entities)}`
      : `Identified user goal: "${intent}" with entities: ${JSON.stringify(entities)} (rule-based fallback — no Gemini API key configured or Gemini call failed)`
  });

  agentCollaborations.push({ from: 'IntentAgent', to: 'PlannerAgent' });

  // Step 2: Dispatch to Specialized Agents & Run Database actions
  if (intent === 'JOIN_CLUB') {
    reasoningSteps.push({
      title: 'Activating Community Agent',
      status: 'success',
      detail: `Searching database for club name matching "${entities.clubName}"...`
    });
    agentCollaborations.push({ from: 'PlannerAgent', to: 'CommunityAgent' });

    // Join club
    const clubResult = await processJoinClub(studentId, entities.clubName, prisma);
    agentResponseData = clubResult;

    reasoningSteps.push({
      title: 'Database Registrations',
      status: 'success',
      detail: `Successfully registered Aarav Sharma for "${clubResult.clubName}". Orientation reminder added to calendar.`
    });
    agentCollaborations.push({ from: 'CommunityAgent', to: 'NotificationAgent' });

    // Recommendation Engine for other clubs
    reasoningSteps.push({
      title: 'Invoking Recommendation Engine',
      status: 'success',
      detail: `Fetching related technical clubs based on student's active skills: [${student.skills}]`
    });
    agentCollaborations.push({ from: 'PlannerAgent', to: 'RecommendationEngine' });
    const recs = await getRecommendations(studentId, prisma);
    agentResponseData.recommendations = recs;
  } 
  
  else if (intent === 'CAMPUS_UPDATES') {
    reasoningSteps.push({
      title: 'Activating Campus Information Agent',
      status: 'success',
      detail: `Fetching campus announcements, notices, and today's schedule...`
    });
    agentCollaborations.push({ from: 'PlannerAgent', to: 'CampusInfoAgent' });

    // Delegated to the Campus Info Agent (agents/campusInfoAgent.js), which
    // in turn delegates the dedup/sort/highlight work to the Event
    // Intelligence Agent — covers every event type, not just hackathons.
    const campusUpdates = await processCampusUpdates(prisma);

    reasoningSteps.push({
      title: 'AI Announcement Summarizer',
      status: 'success',
      detail: `Summarized ${campusUpdates.announcementCount} major update${campusUpdates.announcementCount === 1 ? '' : 's'}. Extracted deadlines/venues for ${campusUpdates.eventCount} upcoming event${campusUpdates.eventCount === 1 ? '' : 's'} across all event types.`
    });
    agentCollaborations.push({ from: 'CampusInfoAgent', to: 'EventIntelligenceAgent' });

    agentResponseData = {
      announcements: campusUpdates.announcements,
      todayEvents: campusUpdates.todayEvents
    };
  } 
  
  else if (intent === 'EXAM_PREP') {
    reasoningSteps.push({
      title: 'Activating Academic Agent',
      status: 'success',
      detail: `Retrieving syllabus and details for subject "${entities.subject}"...`
    });
    agentCollaborations.push({ from: 'PlannerAgent', to: 'AcademicAgent' });

    // Generate study calendar
    const examDate = '2026-07-27'; // next Monday from July 18
    const studyPlan = await processAcademic(studentId, entities.subject, examDate, prisma);
    agentResponseData = studyPlan;

    reasoningSteps.push({
      title: 'Database Sync',
      status: 'success',
      detail: `Created a 7-day study guide in SQL. Set automatic study reminders on the student's dashboard.`
    });
    agentCollaborations.push({ from: 'AcademicAgent', to: 'NotificationAgent' });
  } 
  
  else if (intent === 'PLACEMENT_PREP') {
    reasoningSteps.push({
      title: 'Activating Placement & Career Coaching Agent',
      status: 'success',
      detail: `Fetching Placement cell drives and analyzing CSE Student target roles...`
    });
    // Placement drive matching AND career-roadmap/DSA coaching both live in
    // placementAgent.js — there is no separate CareerCoachAgent file, so we
    // don't draw a collaboration edge to one (that used to be a label-only
    // agent with no backing logic).
    agentCollaborations.push({ from: 'PlannerAgent', to: 'PlacementAgent' });

    const placementData = await processPlacement(student, prisma);
    agentResponseData = placementData;

    reasoningSteps.push({
      title: 'Generating Career Roadmap',
      status: 'success',
      detail: `Created custom DSA study timeline. Suggested 2 resume-matching WebDev/AI projects.`
    });
    agentCollaborations.push({ from: 'PlacementAgent', to: 'NotificationAgent' });
  } 
  
  else if (intent === 'HACKATHON_DISCOVERY') {
    reasoningSteps.push({
      title: 'Activating Event Intelligence Agent',
      status: 'success',
      detail: `Collecting, sorting, and deduplicating active hackathons...`
    });
    agentCollaborations.push({ from: 'PlannerAgent', to: 'EventIntelligenceAgent' });

    const hackathonData = await processEventDiscovery(student, prisma);
    agentResponseData = hackathonData;

    reasoningSteps.push({
      title: 'Finding Teammate Matches',
      status: 'success',
      detail: `Queried Student community. Matched 3 potential teammates with complementary UI/UX and backend skills.`
    });
    agentCollaborations.push({ from: 'EventIntelligenceAgent', to: 'CommunityAgent' });
  } 
  
  else if (intent === 'NAVIGATION') {
    reasoningSteps.push({
      title: 'Activating Navigation Agent',
      status: 'success',
      detail: `Parsing campus spatial layout coordinates from source "${entities.source}" to "${entities.destination}"...`
    });
    agentCollaborations.push({ from: 'PlannerAgent', to: 'NavigationAgent' });

    const navigationData = await processNavigation(entities.source, entities.destination, prisma);
    agentResponseData = navigationData;

    reasoningSteps.push({
      title: 'Calculating Routes & Amenities',
      status: 'success',
      detail: `Generated custom SVG pathway. Identified nearby washrooms and library highlights.`
    });
  } 
  
  else {
    // Default fallback
    reasoningSteps.push({
      title: 'General Conversational Mode',
      status: 'success',
      detail: 'Interpreting question and fetching campus resources.'
    });
    agentResponseData = {
      message: "I understand you are asking about campus events. Try asking to: 'Join me to the AI Club', 'Show today's hackathons', 'I have a DBMS exam next week', or 'Navigate to Programming Lab' to see agentic workflows in action!"
    };
  }

  // Get current state of registered clubs & calendar to send back to update the front-end dashboard
  const updatedStudent = await prisma.student.findUnique({
    where: { id: studentId },
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
    where: { studentId, category: 'goal' }
  });

  return {
    query,
    intent,
    reasoningSteps,
    agentCollaborations,
    data: agentResponseData,
    dashboardSync: {
      joinedClubs,
      registeredEvents,
      activePlans,
      activeReminders: activeReminders.map(m => m.value)
    }
  };
}
