/* ─────────────────────────────────────────────────────────
 * Test Mode — in-memory mock API
 *
 * While test mode is active, every call from src/lib/api.ts is
 * routed here instead of the network. This router serves data
 * from the seeded in-memory store (test-data.ts) and replicates
 * the exact response shapes of the real Airtable-backed handlers
 * in api/_lib/handlers.ts, so the entire app works end-to-end
 * (submit EOD → XP → live feed → team-lead rating → notifications)
 * without any backend or Airtable connection.
 * ───────────────────────────────────────────────────────── */
import type { EodEntry } from "./types";
import {
  ensureTestSeeded,
  resetTestData,
  getTestState,
} from "./test-data";

let interceptorActive = false;
let sessionEmployeeId: string | null = null;

export function setTestModeInterceptor(active: boolean) {
  interceptorActive = active;
  if (active) ensureTestSeeded();
}

export function isTestModeActive() {
  return interceptorActive;
}

/** Which test employee the mock "session" belongs to (for change-password). */
export function setTestSessionEmployee(id: string | null) {
  sessionEmployeeId = id;
}

const DAILY_QUIZ_LIMIT = 3;

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function delay<T>(value: T, ms = 120): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

class ApiError extends Error {}

function findEmpByName(name: string) {
  const clean = String(name || "").trim().toLowerCase();
  return getTestState().employees.find((e) => e.name.toLowerCase() === clean);
}

/* Level table — mirrors api/_lib/handlers.ts LEVELS */
const LEVELS = [
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

function levelMeta(xp: number) {
  let cur = LEVELS[0];
  for (const l of LEVELS) if (xp >= l.xp) cur = l;
  const next = LEVELS.find((l) => l.level === cur.level + 1);
  return {
    level: cur.level,
    title: cur.title,
    currentXpInLevel: xp - cur.xp,
    nextLevelXp: next ? next.xp : cur.xp,
    progressToNextLevel: next ? ((xp - cur.xp) / (next.xp - cur.xp)) * 100 : 100,
  };
}

const RATING_LABELS: Record<string, string> = {
  M: "Meets Expectation",
  S: "Satisfactory",
  N: "Needs Improvement",
  E: "Excellent",
};

/* ── Canned engineering quiz pool (rotates per attempt) ── */
const QUIZ_POOL = [
  {
    question: "Under ASME B31.3, what is the allowable stress basis for seamless pipe material at moderate temperature?",
    options: { A: "1/3 of the specified minimum tensile strength at temperature", B: "1/2 of the yield strength", C: "2/3 of the ultimate tensile strength", D: "Full tensile strength with a 2.0 safety factor" },
    correctAnswer: "A", explanation: "ASME B31.3 limits basic allowable stress S to the lesser of 1/3 of specified minimum tensile strength (SMTS) at temperature and 2/3 of specified minimum yield strength (SMYS).", difficulty: "Medium", category: "Codes & Standards",
  },
  {
    question: "What is the primary purpose of a pipe stress analysis on a critical piping system?",
    options: { A: "To reduce material cost", B: "To ensure stresses stay within code allowables and nozzle loads are acceptable", C: "To calculate paint coverage", D: "To determine pipe color coding" },
    correctAnswer: "B", explanation: "Stress analysis verifies sustained, occasional, and thermal displacement stress ranges against ASME B31.3 allowables, and checks that nozzle loads on connected equipment stay within vendor/API 610 limits.", difficulty: "Easy", category: "Stress Analysis",
  },
  {
    question: "In piping layout, why is a cold spring (cut short) applied to a hot service line?",
    options: { A: "To make installation faster", B: "To reduce the operating stress range and nozzle loads by pre-loading the opposite direction", C: "To improve weld appearance", D: "To allow smaller pipe supports" },
    correctAnswer: "B", explanation: "Cut-short/cold-spring deliberately misaligns the line at ambient conditions so that hot thermal growth partly neutralizes it, reducing hot-state stress and load on connected equipment.", difficulty: "Hard", category: "Layout",
  },
  {
    question: "Which standard governs the design and rating of standard steel pipe flanges up to NPS 24?",
    options: { A: "ASME B16.5", B: "API 650", C: "ASME B31.1", D: "ASTM A106" },
    correctAnswer: "A", explanation: "ASME B16.5 covers pipe flanges and flanged fittings up to NPS 24; B16.47 covers larger sizes. API 650 is storage tanks, B31.1 is power piping, A106 is seamless pipe material.", difficulty: "Easy", category: "Codes & Standards",
  },
  {
    question: "A piping system experiences excessive vibration near a reciprocating compressor. What is the FIRST corrective measure to evaluate?",
    options: { A: "Increase pipe wall thickness", B: "Add a pulsation dampener and check acoustic/mechanical natural frequencies", C: "Replace carbon steel with stainless", D: "Reduce insulation thickness" },
    correctAnswer: "B", explanation: "Reciprocating machinery induces pulsation; the API 618 approach is to analyze acoustic natural frequencies and add pulsation bottles/dampeners plus mechanical supports to detune resonance.", difficulty: "High", category: "Vibration",
  },
];

function createEntries(body: any) {
  const state = getTestState();
  const name: string = body.EmployeeName || "";
  const date: string = body.Date || todayStr();
  const items: any[] = Array.isArray(body.workItems) ? body.workItems : [];
  const created: EodEntry[] = [];
  const fullCompletion =
    items.length > 0 &&
    items.every((i) => ((Number(i.plannedQty) || 0) > 0 ? (Number(i.actualQty) / Number(i.plannedQty)) * 100 >= 100 : true));
  const earlyBird = new Date().getHours() < 17;

  items.forEach((item) => {
    const planned = Number(item.plannedQty) || 0;
    const actual = Number(item.actualQty) || 0;
    const pct = planned > 0 ? Math.min(999, Math.round((actual / planned) * 100)) : 0;
    const xp = Math.floor(pct / 10) + (pct >= 100 ? 5 : 0);
    const entry: EodEntry = {
      id: uid("e"),
      EmployeeName: name,
      Date: date,
      Project: item.projectName || "",
      Task: item.task || "",
      Description: item.description || "",
      PlannedQty: planned,
      ActualQty: actual,
      CompletionPct: pct,
      Complexity: item.complexity || "Moderate",
      Remarks: item.remarks || "",
      Rating: "",
      RatingRemarks: "",
      FilledAt: nowIso(),
      XpAwarded: xp,
    };
    state.entries.push(entry);
    created.push(entry);
  });

  const amount = created.reduce((s, e) => s + e.XpAwarded, 0) + (earlyBird ? 5 : 0) + (fullCompletion ? 10 : 0);

  const emp = state.employees.find((e) => e.name === name);
  if (emp && created.length > 0) {
    emp.totalEntries += created.length;
    emp.xp += amount;
    const li = levelMeta(emp.xp);
    emp.level = li.level;
    emp.levelTitle = li.title;
  }

  if (created.length > 0) {
    const avg = Math.round(created.reduce((s, e) => s + e.CompletionPct, 0) / created.length);
    state.announcements.push({
      id: uid("a"),
      EmployeeName: name,
      Message: `${name} submitted ${created.length} work item${created.length > 1 ? "s" : ""} — ${avg}% completion, +${amount} XP earned`,
      Type: "entry",
      Timestamp: nowIso(),
      Read: false,
    });
  }

  return { entries: created, xp: { amount, earlyBird, fullCompletion } };
}

/* ─────────────────────────────────────────────────────────
 * Main router — mirrors api/index.ts endpoint map
 * ───────────────────────────────────────────────────────── */
export async function handleTestApiRequest(path: string, options: RequestInit = {}): Promise<any> {
  ensureTestSeeded();
  const method = (options.method || "GET").toUpperCase();
  const [route, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  let body: any = {};
  if (options.body) {
    try {
      body = JSON.parse(String(options.body));
    } catch {
      body = {};
    }
  }
  const state = getTestState();

  // ── Auth ──
  if (route === "auth/login" && method === "POST") {
    const key = String(body.email || "").trim().toLowerCase();
    const emp = state.employees.find(
      (e) => e.email.toLowerCase() === key || e.name.toLowerCase() === key
    );
    if (!emp || !emp.active) throw new ApiError("No account found with that email or name");
    sessionEmployeeId = emp.id;
    return delay({
      token: `test-token-${emp.id}`,
      employee: emp,
      forcePasswordChange: emp.firstLogin,
      message: emp.firstLogin
        ? "Welcome! Please set your personal password to continue."
        : "Logged in successfully",
    });
  }

  if (route === "auth/change-password" && method === "POST") {
    const emp = state.employees.find((e) => e.id === sessionEmployeeId);
    if (emp) emp.firstLogin = false;
    return delay({ success: true, message: "Password updated successfully" });
  }

  if (route === "auth/forgot-password" && method === "POST") {
    const key = String(body.email || "").trim().toLowerCase();
    const emp = state.employees.find((e) => e.email.toLowerCase() === key);
    if (emp) {
      state.passwordResetRequests.push({
        id: uid("pr"),
        employeeName: emp.name,
        requestedAt: nowIso(),
        status: "pending",
      });
      state.notifications.push({
        id: uid("n"),
        EmployeeName: "Alex Johnson",
        Type: "system",
        Title: "Password Reset Request",
        Message: `${emp.name} (${emp.email}) has requested a password reset. Please generate a new temporary password and share it with them.`,
        Read: false,
        Timestamp: nowIso(),
      });
    }
    return delay({ success: true, message: "Your request has been sent to the team lead. They will reset your password shortly." });
  }

  // ── Employees ──
  if (route === "employees" && method === "GET") {
    return delay(state.employees.map((e) => ({ ...e })));
  }

  if (route === "employees/reset-password" && method === "POST") {
    const emp = findEmpByName(body.employeeName);
    if (!emp) throw new ApiError("Employee not found");
    emp.firstLogin = true;
    state.notifications.push({
      id: uid("n"),
      EmployeeName: emp.name,
      Type: "system",
      Title: "Password Reset",
      Message: "Your password has been reset. Contact the team lead for your new temporary password. You'll be asked to set a new password on next login.",
      Read: false,
      Timestamp: nowIso(),
    });
    return delay({ success: true, message: `Password reset for ${emp.name}. New temp password: ${body.newTempPassword}` });
  }

  // ── Entries ──
  if (route === "entries" && method === "GET") {
    let list = [...state.entries];
    const date = params.get("date");
    const employee = params.get("employee");
    if (date) list = list.filter((e) => e.Date === date);
    if (employee) list = list.filter((e) => e.EmployeeName === employee);
    return delay(list);
  }

  if (route === "entries" && method === "POST") {
    return delay(createEntries(body));
  }

  if (route === "entries/rate" && method === "POST") {
    const entry = state.entries.find((e) => e.id === body.entryId);
    if (!entry) throw new ApiError("Entry not found");
    entry.Rating = body.rating;
    entry.RatingRemarks = body.ratingRemarks || "";
    state.notifications.push({
      id: uid("n"),
      EmployeeName: entry.EmployeeName,
      Type: "system",
      Title: "Entry Rated",
      Message: `Your ${entry.Date} entry "${entry.Task}" was rated "${RATING_LABELS[body.rating] || body.rating}" by your team lead.`,
      Read: false,
      Timestamp: nowIso(),
    });
    return delay({ success: true, entry: { ...entry } });
  }

  // ── Leaves ──
  if (route === "leaves" && method === "GET") {
    const date = params.get("date");
    const list = date ? state.leaves.filter((l) => l.Date === date) : [...state.leaves];
    return delay(list.map((l) => ({ ...l })));
  }

  if (route === "leaves" && method === "POST") {
    const leave = {
      id: uid("l"),
      EmployeeName: body.EmployeeName,
      Date: body.Date || todayStr(),
      Reason: body.Reason || "",
      MarkedBy: body.MarkedBy || body.EmployeeName,
    };
    state.leaves.push(leave as any);
    state.announcements.push({
      id: uid("a"),
      EmployeeName: body.EmployeeName,
      Message: `is on leave today (${body.Reason || "no reason provided"}). Streak safeguarded.`,
      Type: "leave",
      Timestamp: nowIso(),
      Read: false,
    });
    return delay({ ...leave });
  }

  const leaveDelete = route.match(/^leaves\/([^/]+)$/);
  if (leaveDelete && method === "DELETE") {
    const i = state.leaves.findIndex((l) => l.id === leaveDelete[1]);
    if (i >= 0) state.leaves.splice(i, 1);
    return delay({ success: true });
  }

  // ── Gamification ──
  if (route === "gamification" && method === "GET") {
    const emp = findEmpByName(params.get("employee") || "");
    if (!emp) throw new ApiError("Employee not found");
    const li = levelMeta(emp.xp);
    return delay({
      xp: emp.xp,
      level: emp.level,
      levelTitle: emp.levelTitle,
      currentStreak: emp.currentStreak,
      longestStreak: emp.longestStreak,
      totalEntries: emp.totalEntries,
      badges: state.earnedBadges
        .filter((b) => b.EmployeeName === emp.name)
        .map((b) => ({ id: b.id, EmployeeName: b.EmployeeName, BadgeName: b.BadgeName, DateEarned: b.DateEarned, IsNew: b.IsNew })),
      currentXpInLevel: li.currentXpInLevel,
      nextLevelXp: li.nextLevelXp,
      progressToNextLevel: li.progressToNextLevel,
    });
  }

  // ── Notifications ──
  if (route === "notifications" && method === "GET") {
    const employee = params.get("employee");
    const list = employee ? state.notifications.filter((n) => n.EmployeeName === employee) : [...state.notifications];
    return delay(list.map((n) => ({ ...n })));
  }

  const notifRead = route.match(/^notifications\/([^/]+)\/read$/);
  if (notifRead && method === "POST") {
    const n = state.notifications.find((x) => x.id === notifRead[1]);
    if (n) n.Read = true;
    return delay({ success: true });
  }

  // ── Password resets (team lead) ──
  if (route === "password-resets" && method === "GET") {
    return delay(state.passwordResetRequests.map((r) => ({ ...r })));
  }

  if (route === "password-resets/approve" && method === "POST") {
    const req = state.passwordResetRequests.find((r) => r.id === body.requestId);
    if (!req) throw new ApiError("Reset request not found");
    if (req.status === "approved") throw new ApiError("This reset has already been completed");
    req.status = "approved";
    const emp = findEmpByName(req.employeeName);
    if (emp) emp.firstLogin = true;
    state.notifications.push({
      id: uid("n"),
      EmployeeName: req.employeeName,
      Type: "system",
      Title: "Password Reset",
      Message: "Your password has been reset. Contact the team lead for your new temporary password.",
      Read: false,
      Timestamp: nowIso(),
    });
    return delay({ success: true, message: `Password reset for ${req.employeeName}. New temp password: ${body.newTempPassword}` });
  }

  // ── Calendar ──
  if (route === "calendar" && method === "GET") {
    return delay(state.calendar.map((c) => ({ ...c })));
  }

  if (route === "calendar" && method === "POST") {
    const cal = {
      id: uid("cal"),
      Date: body.Date,
      DayType: body.DayType || "Working Day",
      Description: body.Description || "",
      EmployeeName: body.EmployeeName || "",
    };
    state.calendar.push(cal as any);
    return delay(cal);
  }

  const calDelete = route.match(/^calendar\/([^/]+)$/);
  if (calDelete && method === "DELETE") {
    const i = state.calendar.findIndex((c) => c.id === calDelete[1]);
    if (i >= 0) state.calendar.splice(i, 1);
    return delay({ success: true });
  }

  // ── Announcements (live feed) ──
  if (route === "announcements" && method === "GET") {
    return delay(
      [...state.announcements]
        .sort((a, b) => String(b.Timestamp).localeCompare(String(a.Timestamp)))
        .map((a) => ({ ...a }))
    );
  }

  if (route === "announcements" && method === "POST") {
    const ann = {
      id: uid("a"),
      EmployeeName: body.EmployeeName,
      Message: body.Message,
      Type: body.Type || "info",
      Timestamp: nowIso(),
      Read: false,
    };
    state.announcements.push(ann as any);
    return delay({ ...ann });
  }

  // ── AI Quiz (NVIDIA MiniMax) ──
  if (route === "quiz/generate" && method === "POST") {
    const employee = String(body.employee || "");
    const answeredToday = state.quizHistory.filter(
      (h) => h.employeeName === employee && String(h.timestamp).slice(0, 10) === todayStr()
    ).length;
    if (answeredToday >= DAILY_QUIZ_LIMIT) {
      throw new ApiError(`Daily quiz limit reached (${DAILY_QUIZ_LIMIT}/${DAILY_QUIZ_LIMIT}). Come back tomorrow!`);
    }
    const count = state.quizHistory.filter((h) => h.employeeName === employee).length;
    const q = QUIZ_POOL[count % QUIZ_POOL.length];
    return delay({
      id: uid("q"),
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      difficulty: q.difficulty,
      category: q.category,
      todayCount: answeredToday + 1,
      dailyLimit: DAILY_QUIZ_LIMIT,
      remaining: DAILY_QUIZ_LIMIT - answeredToday - 1,
    });
  }

  if (route === "quiz/stats" && method === "GET") {
    const employee = params.get("employee") || "";
    const hist = state.quizHistory.filter((h) => h.employeeName === employee);
    const correct = hist.filter((h) => h.score === 100).length;
    const total = hist.length;
    return delay({
      correct,
      total,
      accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
      questionsAnswered: total,
      uniqueQuestions: new Set(hist.map((h) => h.question)).size,
    });
  }

  if (route === "quiz/answer" && method === "POST") {
    const isCorrect = body.answer === body.correctAnswer;
    const xpEarned = isCorrect ? 5 : 0;
    state.quizHistory.push({
      id: uid("qh"),
      employeeName: body.employee,
      question: body.question,
      answer: body.answer,
      correctAnswer: body.correctAnswer,
      score: isCorrect ? 100 : 0,
      timestamp: nowIso(),
    });
    if (isCorrect) {
      const emp = findEmpByName(body.employee);
      if (emp) {
        emp.xp += xpEarned;
        const li = levelMeta(emp.xp);
        emp.level = li.level;
        emp.levelTitle = li.title;
      }
    }
    return delay({ correct: isCorrect, xpEarned, correctAnswer: body.correctAnswer, explanation: body.explanation || "" });
  }

  if (route === "quiz/history" && method === "GET") {
    const employee = params.get("employee") || "";
    const hist = state.quizHistory
      .filter((h) => h.employeeName === employee)
      .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)))
      .map((h) => ({
        id: h.id,
        EmployeeName: h.employeeName,
        Question: h.question,
        UserAnswer: h.answer,
        CorrectAnswer: h.correctAnswer,
        IsCorrect: h.score === 100,
        Explanation: "",
        AnsweredAt: h.timestamp,
        XpEarned: h.score === 100 ? 5 : 0,
      }));
    return delay(hist);
  }

  // ── AI insights (GPT-OSS / DeepSeek) ──
  if (route === "ai/eod-insights" && method === "POST") {
    const items: any[] = body.entries || [];
    const pcts = items.map((i) => {
      const p = Number(i.plannedQty) || 0;
      const a = Number(i.actualQty) || 0;
      return p > 0 ? Math.min(999, Math.round((a / p) * 100)) : 0;
    });
    const avg = items.length ? Math.round(pcts.reduce((s, x) => s + x, 0) / items.length) : 0;
    const score = Math.max(1, Math.min(10, Math.round(avg / 10) || 5));
    return delay({
      summary: `${items.length} work item${items.length === 1 ? "" : "s"} logged today with an average completion of ${avg}%. ${avg >= 100 ? "All planned quantities were met — strong execution day." : "Some items are still below plan; a carry-forward tomorrow is reasonable."}`,
      productivityScore: score,
      highlights: [
        `Highest completion item reached ${Math.max(...pcts, 0)}%`,
        avg >= 100 ? "100% of planned quantity achieved" : `Average completion at ${avg}%`,
        "Entries submitted within the working day",
      ],
      suggestions: [
        avg < 100 ? "Carry forward under-completed items to tomorrow's plan." : "Consider taking on a stretch task tomorrow.",
        "Add detailed remarks on high-complexity items for cleaner reviews.",
      ],
      complexityAnalysis: `Complexity mix: ${items.filter((i) => i.complexity === "High").length} High / ${items.filter((i) => i.complexity === "Moderate").length} Moderate / ${items.filter((i) => i.complexity === "Low").length} Low.`,
    });
  }


  if (route === "ai/auto-describe" && method === "POST") {
    const task = body.task || "the assigned task";
    const project = body.project || "the active project";
    const qty = body.actualQty ?? body.plannedQty ?? 0;
    return delay({
      description: `Completed ${task} on ${project} — processed ${qty} unit(s) at ${body.complexity || "Moderate"} complexity, checked against project standards and released for the next stage.`,
      suggestions: [`Mention drawings/line numbers for ${task}`, "Note any review or QA hand-off"],
    });
  }



  // ── Push subscriptions ──
  if (route === "push/subscribe" && method === "POST") {
    state.pushSubscriptions.push({
      id: uid("ps"),
      EmployeeName: body.employeeName,
      Endpoint: body.endpoint || "https://test.local/endpoint",
      P256dh: body.p256dh || "",
      Auth: body.auth || "",
      Active: true,
      ReminderCount: 0,
    });
    return delay({ success: true });
  }

  if (route === "push/unsubscribe" && method === "POST") {
    state.pushSubscriptions.forEach((p) => {
      if (p.EmployeeName === body.employeeName) p.Active = false;
    });
    return delay({ success: true });
  }

  if (route === "push/check-reminders") {
    const missing = state.employees.filter(
      (emp) => !state.entries.some((e) => e.EmployeeName === emp.name && e.Date === todayStr())
    );
    return delay({ success: true, remindersSent: missing.length, missing: missing.map((m) => m.name) });
  }

  // ── Seed ──
  if (route === "seed" && method === "POST") {
    resetTestData();
    return delay({ success: true, message: "Test data reseeded" });
  }

  throw new ApiError(`Test mode: no mock for ${method} /${route}`);
}







