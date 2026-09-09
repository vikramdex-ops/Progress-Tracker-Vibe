import { type Employee, type WorkItem, type EodEntry, type Leave, type Badge, type EarnedBadge, type Announcement, type Notification, type PushSubscription, type CalendarEntry, type GamificationData, type AuthResponse, type SubmissionResult } from "./types";

// Anchor "today" to the real current date so the seeded dataset always lines
// up with the app's live, today-based calculations (which use toISOString).
export const TODAY = new Date();

// Utility functions
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function isWorkingDay(date: Date): boolean {
  const day = date.getDay();
  return day !== 0 && day !== 6; // Exclude Sunday (0) and Saturday (6)
}

function getWorkingDaysBack(count: number): Date[] {
  const days: Date[] = [];
  let current = new Date(TODAY);

  while (days.length < count) {
    if (isWorkingDay(current)) {
      days.push(new Date(current));
    }
    current = addDays(current, -1);
  }

  return days.reverse(); // Oldest first
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// Initial test employees
export const TEST_EMPLOYEES: Employee[] = [
  // Team Leads
  {
    id: "tl-1",
    name: "Alex Johnson",
    email: "alex.johnson@company.com",
    role: "team_lead",
    active: true,
    firstLogin: false,
    xp: 1250,
    level: 6,
    levelTitle: "Piping Champion",
    currentStreak: 8,
    longestStreak: 15,
    totalEntries: 62,
  },
  {
    id: "tl-2",
    name: "Sam Wilson",
    email: "sam.wilson@company.com",
    role: "team_lead",
    active: true,
    firstLogin: false,
    xp: 980,
    level: 5,
    levelTitle: "Piping Expert",
    currentStreak: 3,
    longestStreak: 12,
    totalEntries: 49,
  },

  // Employees
  {
    id: "emp-1",
    name: "Taylor Chen",
    email: "taylor.chen@company.com",
    role: "employee",
    active: true,
    firstLogin: true, // First login employee
    xp: 75,
    level: 1,
    levelTitle: "Piping Trainee",
    currentStreak: 0,
    longestStreak: 2,
    totalEntries: 1,
  },
  {
    id: "emp-2",
    name: "Morgan Davis",
    email: "morgan.davis@company.com",
    role: "employee",
    active: true,
    firstLogin: false,
    xp: 320,
    level: 2,
    levelTitle: "Piping Explorer",
    currentStreak: 5,
    longestStreak: 8,
    totalEntries: 16,
  },
  {
    id: "emp-3",
    name: "Riley Martinez",
    email: "riley.martinez@company.com",
    role: "employee",
    active: true,
    firstLogin: false,
    xp: 480,
    level: 3,
    levelTitle: "Piping Practitioner",
    currentStreak: 2,
    longestStreak: 7,
    totalEntries: 24,
  },
  {
    id: "emp-4",
    name: "Casey Taylor",
    email: "casey.taylor@company.com",
    role: "employee",
    active: true,
    firstLogin: false,
    xp: 650,
    level: 4,
    levelTitle: "Piping Specialist",
    currentStreak: 10,
    longestStreak: 12,
    totalEntries: 32,
  },
  {
    id: "emp-5",
    name: "Jordan Moore",
    email: "jordan.moore@company.com",
    role: "employee",
    active: true,
    firstLogin: false,
    xp: 210,
    level: 2,
    levelTitle: "Piping Explorer",
    currentStreak: 1,
    longestStreak: 4,
    totalEntries: 10,
  },
  {
    id: "emp-6",
    name: "Quinn Anderson",
    email: "quinn.anderson@company.com",
    role: "employee",
    active: true,
    firstLogin: false,
    xp: 550,
    level: 4,
    levelTitle: "Piping Specialist",
    currentStreak: 3,
    longestStreak: 9,
    totalEntries: 27,
  },
];

// In-memory state
let state = {
  employees: [...TEST_EMPLOYEES],
  entries: [] as EodEntry[],
  leaves: [] as Leave[],
  calendar: [] as CalendarEntry[],
  announcements: [] as Announcement[],
  notifications: [] as Notification[],
  earnedBadges: [] as EarnedBadge[],
  passwordResetRequests: [] as {
    id: string;
    employeeName: string;
    requestedAt: string;
    status: "pending" | "approved" | "rejected";
  }[],
  pushSubscriptions: [] as PushSubscription[],
  quizHistory: [] as {
    id: string;
    employeeName: string;
    question: string;
    answer: string;
    correctAnswer: string;
    score: number;
    timestamp: string;
  }[],
  quizStats: {} as Record<string, {
    totalAttempts: number;
    correctAttempts: number;
    currentStreak: number;
    longestStreak: number;
  }>,
};

// Predefined data for seeding
const WORK_ITEMS: WorkItem[] = [
  { projectName: "Pipe Stress Analysis", task: "Modeling", description: "Create stress models for piping systems", plannedQty: 5, actualQty: 0, completionPercent: 0, complexity: "High", remarks: "" },
  { projectName: "HVAC Design", task: "Layout", description: "Design ductwork layout for new facility", plannedQty: 3, actualQty: 0, completionPercent: 0, complexity: "Moderate", remarks: "" },
  { projectName: "Fire Protection", task: "Hydraulic Calc", description: "Calculate water flow requirements", plannedQty: 10, actualQty: 0, completionPercent: 0, complexity: "High", remarks: "" },
  { projectName: "Process Piping", task: "Isometrics", description: "Generate isometric drawings", plannedQty: 8, actualQty: 0, completionPercent: 0, complexity: "Moderate", remarks: "" },
  { projectName: "Equipment Foundation", task: "Design", description: "Design foundations for rotating equipment", plannedQty: 4, actualQty: 0, completionPercent: 0, complexity: "High", remarks: "" },
];

const BADGES: Badge[] = [
  { id: "b1", Name: "Early Bird", Description: "Submit 5 entries before 9 AM", Icon: "Early Bird", Category: "Punctuality" },
  { id: "b2", Name: "Consistency King", Description: "Maintain 7-day streak", Icon: "Consistency", Category: "Streak" },
  { id: "b3", Name: "Quality Champion", Description: "Get 5 ratings of 4+", Icon: "Quality", Category: "Quality" },
  { id: "b4", Name: "Knowledge Seeker", Description: "Complete 3 quiz questions", Icon: "Knowledge", Category: "Learning" },
  { id: "b5", Name: "Team Player", Description: "Help 3 colleagues with feedback", Icon: "Teamwork", Category: "Collaboration" },
];

// Helper function to calculate level
function calculateLevel(xp: number): { level: number; currentXp: number; nextLevelXp: number; progress: number; title: string } {
  const levels = [
    { level: 1, xp: 0, title: "Piping Trainee" },
    { level: 2, xp: 50, title: "Piping Explorer" },
    { level: 3, xp: 150, title: "Piping Practitioner" },
    { level: 4, xp: 350, title: "Piping Specialist" },
    { level: 5, xp: 600, title: "Piping Expert" },
    { level: 6, xp: 1000, title: "Piping Champion" },
    { level: 7, xp: 1500, title: "Piping Master" },
    { level: 8, xp: 2200, title: "Piping Legend" },
    { level: 9, xp: 3000, title: "Piping Guru" },
    { level: 10, xp: 5000, title: "Piping Wizard" },
  ];

  let currentLevel = levels[0];
  let nextLevel = levels[1];

  for (let i = levels.length - 1; i >= 0; i--) {
    if (xp >= levels[i].xp) {
      currentLevel = levels[i];
      nextLevel = levels[Math.min(i + 1, levels.length - 1)];
      break;
    }
  }

  const currentXp = xp - currentLevel.xp;
  const nextLevelXp = nextLevel.xp - currentLevel.xp;
  const progress = nextLevelXp > 0 ? (currentXp / nextLevelXp) * 100 : 100;

  return {
    level: currentLevel.level,
    currentXp,
    nextLevelXp,
    progress: Math.min(progress, 100),
    title: currentLevel.title,
  };
}

function calculateStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  const sortedDates = dates
    .map((d) => new Date(d).getTime())
    .sort((a, b) => b - a);

  let streak = 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const latestDate = new Date(sortedDates[0]);
  latestDate.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((today.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > 1) return 0;

  for (let i = 1; i < sortedDates.length; i++) {
    const diff = Math.floor(
      (new Date(sortedDates[i - 1]).getTime() - new Date(sortedDates[i]).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
// Initialize with seed data
function initializeSeedData() {
  // Clear existing state
  state = {
    employees: [...TEST_EMPLOYEES],
    entries: [],
    leaves: [],
    calendar: [],
    announcements: [],
    notifications: [],
    earnedBadges: [],
    passwordResetRequests: [],
    pushSubscriptions: [],
    quizHistory: [],
    quizStats: {},
  };

  const workingDays = getWorkingDaysBack(30);

  // Seed entries for last 30 working days
  workingDays.forEach((date, dayIndex) => {
    const dateStr = formatDate(date);

    // Determine which employees work today (some missing)
    const missingToday = dayIndex % 7 === 0; // Every 7th day, 2 employees missing
    const employeesWorking = state.employees.filter(emp =>
      !missingToday || !["emp-1", "emp-3"].includes(emp.id) // emp-1 and emp-3 missing on these days
    );

    // Team lead on leave every 10th day
    const tlOnLeave = dayIndex % 10 === 0 && dayIndex > 0;

    employeesWorking.forEach(employee => {
      // Skip team leads on leave days
      if (employee.role === "team_lead" && tlOnLeave) return;

      // Create 1-2 entries per employee per day
      const entriesCount = Math.random() > 0.3 ? 1 : 2;

      for (let i = 0; i < entriesCount; i++) {
        const workItem = WORK_ITEMS[Math.floor(Math.random() * WORK_ITEMS.length)];
        const plannedQty = workItem.plannedQty;
        const actualQty = Math.max(0, plannedQty + (Math.random() - 0.5) * 4); // Some variance
        const completionPercent = plannedQty > 0 ? Math.min(100, (actualQty / plannedQty) * 100) : 0;

        const entry: EodEntry = {
          id: generateId(),
          EmployeeName: employee.name,
          Date: dateStr,
          Project: workItem.projectName,
          Task: workItem.task,
          Description: workItem.description,
          PlannedQty: plannedQty,
          ActualQty: Number(actualQty.toFixed(1)),
          CompletionPct: Number(completionPercent.toFixed(1)),
          Complexity: workItem.complexity,
          Remarks: workItem.remarks,
          Rating: i === 0 && dayIndex % 3 === 0 ? (Math.random() > 0.5 ? "4" : "5") : "", // Some rated entries
          RatingRemarks: i === 0 && dayIndex % 3 === 0 ? "Good work!" : "",
          FilledAt: new Date(date).toISOString(),
          XpAwarded: Math.floor(completionPercent / 10) + (completionPercent >= 100 ? 5 : 0),
        };

        state.entries.push(entry);

        // Update employee stats
        const emp = state.employees.find(e => e.id === employee.id);
        if (emp) {
          emp.totalEntries++;
          emp.xp += entry.XpAwarded;

          // Update level based on new XP
          const levelInfo = calculateLevel(emp.xp);
          emp.level = levelInfo.level;
          emp.levelTitle = levelInfo.title;
        }
      }
    });
  });

  // Ensure today has: a rated entry, an unrated entry, a team-lead entry,
  // a team lead on leave, and at least two missing employees

  // Add today's specific entries
  const todayStr = formatDate(TODAY);

  // Rated entry
  state.entries.push({
    id: generateId(),
    EmployeeName: "Morgan Davis",
    Date: todayStr,
    Project: "Pipe Stress Analysis",
    Task: "Modeling",
    Description: "Completed stress analysis for critical piping section",
    PlannedQty: 5,
    ActualQty: 5,
    CompletionPct: 100,
    Complexity: "High",
    Remarks: "",
    Rating: "5",
    RatingRemarks: "Excellent work, well documented!",
    FilledAt: new Date(TODAY).toISOString(),
    XpAwarded: 15,
  });

  // Unrated entry
  state.entries.push({
    id: generateId(),
    EmployeeName: "Taylor Chen",
    Date: todayStr,
    Project: "HVAC Design",
    Task: "Layout",
    Description: "Started ductwork layout for new wing",
    PlannedQty: 3,
    ActualQty: 2,
    CompletionPct: 66.7,
    Complexity: "Moderate",
    Remarks: "Pending review",
    Rating: "",
    RatingRemarks: "",
    FilledAt: new Date(TODAY).toISOString(),
    XpAwarded: 6,
  });

  // Team-lead entry
  state.entries.push({
    id: generateId(),
    EmployeeName: "Alex Johnson",
    Date: todayStr,
    Project: "Process Piping",
    Task: "Isometrics",
    Description: "Reviewed and approved isometric drawings",
    PlannedQty: 8,
    ActualQty: 8,
    CompletionPct: 100,
    Complexity: "Moderate",
    Remarks: "All drawings compliant with standards",
    Rating: "4",
    RatingRemarks: "Good attention to detail",
    FilledAt: new Date(TODAY).toISOString(),
    XpAwarded: 14,
  });

  // Add leaves for today (team lead on leave)
  state.leaves.push({
    id: generateId(),
    EmployeeName: "Sam Wilson",
    Date: todayStr,
    Reason: "Medical appointment",
    MarkedBy: "Alex Johnson",
  });

  // Mark emp-1 and emp-3 as missing today (no entries)

  // Seed some calendar entries
  state.calendar.push(
    { id: generateId(), Date: todayStr, DayType: "Working Day", Description: "Regular workday", EmployeeName: "Alex Johnson" },
    { id: generateId(), Date: formatDate(addDays(TODAY, 1)), DayType: "Meeting", Description: "Project kickoff meeting", EmployeeName: "Morgan Davis" },
    { id: generateId(), Date: formatDate(addDays(TODAY, 2)), DayType: "Training", Description: "ISO 9001 refresher course", EmployeeName: "Riley Martinez" }
  );

  // Seed some announcements
  state.announcements.push(
    { id: generateId(), EmployeeName: "System", Message: "Welcome to the Progress Tracker!", Type: "info", Timestamp: new Date(TODAY).toISOString(), Read: false },
    { id: generateId(), EmployeeName: "Alex Johnson", Message: "Don't forget about the safety training tomorrow at 10 AM", Type: "warning", Timestamp: new Date(addDays(TODAY, -1)).toISOString(), Read: true }
  );

  // Seed some notifications
  state.notifications.push(
    { id: generateId(), EmployeeName: "Taylor Chen", Type: "reminder", Title: "Entry Pending", Message: "You have 1 entry awaiting rating", Read: false, Timestamp: new Date(TODAY).toISOString() },
    { id: generateId(), EmployeeName: "Morgan Davis", Type: "achievement", Title: "XP Earned", Message: "You earned 15 XP today!", Read: true, Timestamp: new Date(TODAY).toISOString() }
  );

  // Seed some earned badges
  state.earnedBadges.push(
    { id: generateId(), EmployeeName: "Morgan Davis", BadgeName: "Early Bird", DateEarned: formatDate(addDays(TODAY, -5)), IsNew: false },
    { id: generateId(), EmployeeName: "Riley Martinez", BadgeName: "Knowledge Seeker", DateEarned: formatDate(addDays(TODAY, -3)), IsNew: true }
  );

  // Seed some password reset requests
  state.passwordResetRequests.push(
    { id: generateId(), employeeName: "Taylor Chen", requestedAt: formatDate(addDays(TODAY, -2)), status: "pending" },
    { id: generateId(), employeeName: "Morgan Davis", requestedAt: formatDate(addDays(TODAY, -1)), status: "approved" }
  );

  // Seed some push subscriptions
  state.pushSubscriptions.push(
    { id: generateId(), EmployeeName: "Alex Johnson", Endpoint: "https://fcm.googleapis.com/fcm/send/abc123", P256dh: "key1", Auth: "auth1", Active: true, ReminderCount: 2 },
    { id: generateId(), EmployeeName: "Morgan Davis", Endpoint: "https://fcm.googleapis.com/fcm/send/def456", P256dh: "key2", Auth: "auth2", Active: true, ReminderCount: 0 }
  );

  // Seed some quiz history
  state.quizHistory.push(
    { id: generateId(), employeeName: "Taylor Chen", question: "What is the primary cause of thermal expansion in pipes?", answer: "Temperature change", correctAnswer: "Temperature change", score: 100, timestamp: formatDate(addDays(TODAY, -4)) },
    { id: generateId(), employeeName: "Morgan Davis", question: "Which standard governs pressure piping design?", answer: "ASME B31.3", correctAnswer: "ASME B31.3", score: 100, timestamp: formatDate(addDays(TODAY, -2)) }
  );

  // Initialize quiz stats
  state.employees.forEach(emp => {
    state.quizStats[emp.id] = {
      totalAttempts: emp.id === "emp-1" ? 2 : emp.id === "emp-2" ? 5 : 3,
      correctAttempts: emp.id === "emp-1" ? 1 : emp.id === "emp-2" ? 4 : 2,
      currentStreak: emp.id === "emp-1" ? 0 : emp.id === "emp-2" ? 3 : 1,
      longestStreak: emp.id === "emp-1" ? 1 : emp.id === "emp-2" ? 4 : 2,
    };
  });
}

// ─── Accessors used by the test-mode mock API (test-mode-api.ts) ─────────
let seeded = false;

/** Seed the in-memory store on first use; subsequent calls are no-ops. */
export function ensureTestSeeded() {
  if (!seeded) {
    initializeSeedData();
    seeded = true;
  }
}

/** Wipe and reseed the in-memory store from scratch. */
export function resetTestData() {
  initializeSeedData();
  seeded = true;
}

/** Live in-memory store — mutations are visible to every mock endpoint. */
export function getTestState() {
  return state;
}

