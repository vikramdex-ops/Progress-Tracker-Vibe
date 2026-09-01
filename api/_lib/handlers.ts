import { airtable, TABLES } from "./airtable";
import { hashPassword, verifyPassword, generateToken, getEmployeeByEmail } from "./auth";

/** Sanitize employee data — strip sensitive fields before sending to client */
function sanitizeEmp(emp: any) {
  return {
    id: emp.id,
    name: emp.fields.Name,
    email: emp.fields.Email,
    role: emp.fields.Role,
    active: emp.fields.Active,
    firstLogin: emp.fields.FirstLogin,
    xp: emp.fields.XP || 0,
    level: emp.fields.Level || 1,
    levelTitle: emp.fields.LevelTitle || "Piping Trainee",
    currentStreak: emp.fields.CurrentStreak || 0,
    longestStreak: emp.fields.LongestStreak || 0,
    totalEntries: emp.fields.TotalEntries || 0,
  };
}

/** Safe Airtable filter formula */
function ef(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

// ─── Auth ────────────────────────────────────────────────
export async function handleLogin(body: any) {
  const { email, password } = body;
  if (!email || !password) {
    return { status: 400, data: { error: "Email and password are required" } };
  }

  const emp = await getEmployeeByEmail(email);
  if (!emp) {
    return {
      status: 401,
      data: {
        error: "No account found. Check your email or contact the team lead.",
        hint: "You can also try logging in with your name instead of email.",
      },
    };
  }

  if (!emp.fields.Active) {
    return {
      status: 403,
      data: {
        error: "This account has been deactivated. Contact the team lead to reactivate it.",
      },
    };
  }

  // First login: use temp password
  if (emp.fields.FirstLogin) {
    if (!emp.fields.TempPassword) {
      return {
        status: 500,
        data: {
          error: "No temporary password set. Contact the team lead to reset your password.",
        },
      };
    }
    if (password !== emp.fields.TempPassword) {
      return {
        status: 401,
        data: {
          error: "Invalid temporary password. Check with your team lead for the correct password.",
          hint: "If you've already changed your password, try your personal password instead.",
        },
      };
    }
    const token = generateToken();
    await airtable.update(TABLES.EMPLOYEES, emp.id, { SessionToken: token });
    return {
      status: 200,
      data: {
        token,
        employee: sanitizeEmp(emp),
        forcePasswordChange: true,
        message: "Welcome! Please set your personal password to continue.",
      },
    };
  }

  // Normal login — check password hash
  if (!emp.fields.PasswordHash) {
    // Password hash is empty — user needs a password reset
    return {
      status: 401,
      data: {
        error: "No password set for this account. Use 'Forgot Password?' or contact the team lead.",
      },
    };
  }

  if (!verifyPassword(password, emp.fields.PasswordHash)) {
    return {
      status: 401,
      data: {
        error: "Incorrect password. Please try again or use 'Forgot Password?'.",
        hint: "Passwords are case-sensitive.",
      },
    };
  }

  const token = generateToken();
    await airtable.update(TABLES.EMPLOYEES, emp.id, { SessionToken: token });
    return {
      status: 200,
      data: { token, employee: sanitizeEmp(emp), forcePasswordChange: false, message: "Logged in successfully" },
    };
}

export async function handleChangePassword(body: any, emp: any) {
  const { oldPassword, newPassword } = body;
  if (!newPassword || newPassword.length < 4)
    return { status: 400, data: { error: "Password must be at least 4 characters" } };

  // On first login, skip old password verification
  if (!emp.FirstLogin) {
    if (!oldPassword || !emp.PasswordHash || !verifyPassword(oldPassword, emp.PasswordHash)) {
      return { status: 401, data: { error: "Current password is incorrect" } };
    }
  }

  if (newPassword === emp.TempPassword) {
    return { status: 400, data: { error: "New password must be different from your temporary password" } };
  }

  const hash = hashPassword(newPassword);
  await airtable.update(TABLES.EMPLOYEES, emp.id, {
    PasswordHash: hash,
    FirstLogin: false,
    TempPassword: "",
  });
  return { status: 200, data: { success: true, message: "Password updated successfully" } };
}

// ─── Employees ───────────────────────────────────────────
export async function handleGetEmployees() {
  try {
    const records = await airtable.list(TABLES.EMPLOYEES, "{Active} = TRUE()");
    return {
      status: 200,
      data: records.map((r) => sanitizeEmp(r)),
    };
  } catch (err: any) {
    console.error("Failed to fetch employees:", err);
    return { status: 500, data: { error: "Failed to load employees: " + err.message } };
  }
}

// ─── EOD Entries ─────────────────────────────────────────
export async function handleGetEntries(params: URLSearchParams) {
  const date = params.get("date");
  const employee = params.get("employee");
  let filter = "";
  if (date && employee) {
    filter = `AND({Date} = "${ef(date)}", {EmployeeName} = "${ef(employee)}")`;
  } else if (date) {
    filter = `{Date} = "${ef(date)}"`;
  } else if (employee) {
    filter = `{EmployeeName} = "${ef(employee)}"`;
  }
  try {
    const records = await airtable.list(TABLES.ENTRIES, filter || undefined);
    return { status: 200, data: records.map((r) => ({ id: r.id, ...r.fields })) };
  } catch (err: any) {
    return { status: 500, data: { error: "Failed to fetch entries: " + err.message } };
  }
}

export async function handleCreateEntry(body: any) {
  const { EmployeeName, Date, workItems, OverallRemarks } = body;
  if (!EmployeeName || !Date || !workItems?.length) {
    return { status: 400, data: { error: "Missing required fields (EmployeeName, Date, or workItems)" } };
  }

  const results = [];
    for (const item of workItems) {
      const planned = Number(item.plannedQty) || 0;
      const actual = Number(item.actualQty) || 0;
      const completionPct = planned > 0 ? Math.min(999, Math.round((actual / planned) * 100)) : 0;
    const now = new Date();
    const filledAt = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const fields: any = {
      EmployeeName,
      Date,
      Project: item.projectName,
      Task: item.task,
      Description: item.description || "",
      PlannedQty: planned,
      ActualQty: actual,
      CompletionPct: completionPct,
      Complexity: item.complexity || "Moderate",
      Remarks: item.remarks || OverallRemarks || "",
      FilledAt: filledAt,
      Rating: "",
      RatingRemarks: "",
      XpAwarded: 0,
    };

    try {
      const created = await airtable.create(TABLES.ENTRIES, fields);
      results.push({ id: created.id, ...created.fields });
    } catch (err: any) {
      console.error("Failed to create entry:", err);
      return { status: 500, data: { error: `Failed to save entry: ${err.message}` } };
    }
  }

  // Award XP
  const xpResult = await awardEntryXp(EmployeeName, workItems);

  // Auto-create announcement for live feed
    try {
      const filledAt = results[0]?.FilledAt || "now";
      const totalItems = workItems.length;
      const avgCompletion = results.length > 0
        ? Math.round(results.reduce((s: number, r: any) => s + (r.CompletionPct || 0), 0) / results.length)
        : 0;
    await airtable.create(TABLES.ANNOUNCEMENTS, {
      EmployeeName,
      Message: `filled ${totalItems} task${totalItems > 1 ? "s" : ""} at ${filledAt} — ${avgCompletion}% completion`,
      Type: "entry",
      Timestamp: new Date().toISOString(),
      Read: false,
    });
  } catch (err) {
    console.error("Announcement creation failed (non-critical):", err);
  }

  return { status: 201, data: { entries: results, xp: xpResult } };
}

export async function handleRateEntry(body: any) {
  const { entryId, rating, ratingRemarks } = body;
  if (!entryId || !rating) return { status: 400, data: { error: "Missing entryId or rating" } };
  try {
    const updated = await airtable.update(TABLES.ENTRIES, entryId, {
      Rating: rating,
      RatingRemarks: ratingRemarks || "",
    });
    return { status: 200, data: { id: updated.id, ...updated.fields } };
  } catch (err: any) {
    return { status: 500, data: { error: "Failed to rate entry: " + err.message } };
  }
}

// ─── Leaves ──────────────────────────────────────────────
export async function handleGetLeaves(params: URLSearchParams) {
  const date = params.get("date");
  const filter = date ? `{Date} = "${ef(date)}"` : "";
  try {
    const records = await airtable.list(TABLES.LEAVES, filter || undefined);
    return { status: 200, data: records.map((r) => ({ id: r.id, ...r.fields })) };
  } catch (err: any) {
    return { status: 500, data: { error: "Failed to fetch leaves: " + err.message } };
  }
}

export async function handleCreateLeave(body: any) {
  const { EmployeeName, Date, Reason, MarkedBy } = body;
  if (!EmployeeName || !Date) return { status: 400, data: { error: "EmployeeName and Date required" } };
  try {
    const created = await airtable.create(TABLES.LEAVES, {
      EmployeeName,
      Date,
      Reason: Reason || "",
      MarkedBy: MarkedBy || "",
    });
    // Auto-create announcement for leave
    try {
      await airtable.create(TABLES.ANNOUNCEMENTS, {
        EmployeeName,
        Message: `marked as on leave for ${Date}${Reason ? ` — ${Reason}` : ""}`,
        Type: "leave",
        Timestamp: new Date().toISOString(),
        Read: false,
      });
    } catch (err) {
      console.error("Leave announcement failed (non-critical):", err);
    }
    return { status: 201, data: { id: created.id, ...created.fields } };
  } catch (err: any) {
    return { status: 500, data: { error: "Failed to mark leave: " + err.message } };
  }
}

export async function handleDeleteLeave(id: string) {
  try {
    await airtable.remove(TABLES.LEAVES, id);
    return { status: 200, data: { success: true } };
  } catch (err: any) {
    return { status: 500, data: { error: "Failed to remove leave: " + err.message } };
  }
}

// ─── Gamification ────────────────────────────────────────
async function awardEntryXp(employeeName: string, workItems: any[]) {
  let totalXp = 10; // Base XP for submission
  const now = new Date();
  const hour = now.getHours();

  // Early bird bonus (before 5 PM IST)
  if (hour < 17) totalXp += 5;

  // 100% completion bonus
  const allComplete = workItems.every((w: any) => {
    const p = Number(w.plannedQty) || 0;
    const a = Number(w.actualQty) || 0;
    return p > 0 && a >= p;
  });
  if (allComplete && workItems.length > 0) totalXp += 20;

  try {
    // Find employee by name
    const emps = await airtable.list(
      TABLES.EMPLOYEES,
      `{Name} = "${ef(employeeName)}"`
    );
    if (emps.length > 0) {
      const emp = emps[0];
      const currentXp = emp.fields.XP || 0;
      const newXp = currentXp + totalXp;
      const levelInfo = calculateLevel(newXp);
      await airtable.update(TABLES.EMPLOYEES, emp.id, {
        XP: newXp,
        Level: levelInfo.level,
        LevelTitle: levelInfo.title,
        TotalEntries: (emp.fields.TotalEntries || 0) + 1,
      });
    }
  } catch (err) {
    console.error("XP award failed (non-critical):", err);
  }

  return { amount: totalXp, earlyBird: hour < 17, fullCompletion: allComplete };
}

// ─── Level Calculation (module-level for reuse) ───────────────
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

function calculateLevel(xp: number) {
  let current = LEVELS[0];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xp) { current = LEVELS[i]; break; }
  }
  return current;
}

export async function handleGetGamification(params: URLSearchParams) {
  const employee = params.get("employee");
  if (!employee) return { status: 400, data: { error: "Employee parameter required" } };

  try {
    const emps = await airtable.list(TABLES.EMPLOYEES, `{Name} = "${ef(employee)}"`);
    const emp = emps[0];
    if (!emp) return { status: 404, data: { error: "Employee not found" } };

    const badges = await airtable.list(
          TABLES.EARNED_BADGES,
          `{EmployeeName} = "${ef(employee)}"`
        );

        const xp = emp.fields.XP || 0;
        const levelInfo = calculateLevel(xp);

        return {
          status: 200,
          data: {
            xp,
            level: emp.fields.Level || 1,
            levelTitle: emp.fields.LevelTitle || "Piping Trainee",
            currentStreak: emp.fields.CurrentStreak || 0,
            longestStreak: emp.fields.LongestStreak || 0,
            totalEntries: emp.fields.TotalEntries || 0,
            badges: badges.map((b) => ({ id: b.id, ...b.fields })),
            // Level progression metadata
            currentXpInLevel: xp - levelInfo.xp,
            nextLevelXp: levelInfo.level < 10
              ? LEVELS.find(l => l.level === levelInfo.level + 1)?.xp || levelInfo.xp
              : levelInfo.xp,
            progressToNextLevel: levelInfo.level < 10
              ? ((xp - levelInfo.xp) / (LEVELS.find(l => l.level === levelInfo.level + 1)?.xp - levelInfo.xp)) * 100
              : 100,
          },
        };
      } catch (err: any) {
        return { status: 500, data: { error: "Failed to load gamification data: " + err.message } };
      }
    }

// ─── Forgot Password ───────────────────────────────────
export async function handleForgotPassword(body: any) {
  const { email } = body;
  if (!email) return { status: 400, data: { error: "Email is required" } };

  try {
    // Find the employee by email
    const emp = await getEmployeeByEmail(email);
    if (!emp) {
      // Don't reveal whether the email exists
      return { status: 200, data: { success: true, message: "If an account exists, the team lead has been notified." } };
    }

    const empName = emp.fields.Name;

    // Create a notification for the team lead
    const now = new Date().toISOString();
    await airtable.create(TABLES.NOTIFICATIONS, {
      EmployeeName: "Vikram",
      Type: "system",
      Title: "Password Reset Request",
      Message: `${empName} (${emp.fields.Email}) has requested a password reset. Please generate a new temporary password and share it with them.`,
      Read: false,
      Timestamp: now,
    });

    // Also store a password reset request record in Settings for tracking
    await airtable.create(TABLES.SETTINGS, {
      Key: `pwd_reset_${Date.now()}`,
      Value: JSON.stringify({ employeeName: empName, email: emp.fields.Email, requestedAt: now, status: "pending" }),
    });

    return {
      status: 200,
      data: { success: true, message: "Your request has been sent to the team lead. They will reset your password shortly." },
    };
  } catch (err: any) {
    return { status: 500, data: { error: "Failed to process request: " + err.message } };
  }
}

// ─── Password Reset Requests (team lead) ────────────────
export async function handleGetPasswordResets() {
  try {
    const settings = await airtable.list(TABLES.SETTINGS);
    const resets = settings
      .filter((s) => s.fields.Key?.startsWith("pwd_reset_"))
      .map((s) => {
        const val = JSON.parse(s.fields.Value || "{}");
        return { id: s.id, ...val };
      })
      .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    return { status: 200, data: resets };
  } catch (err: any) {
    return { status: 500, data: { error: "Failed to fetch reset requests: " + err.message } };
  }
}

export async function handleApprovePasswordReset(body: any) {
  const { requestId, newTempPassword } = body;
  if (!requestId || !newTempPassword)
    return { status: 400, data: { error: "Request ID and new temp password required" } };

  try {
    // Get the request record
    const record = await airtable.list(TABLES.SETTINGS, `{Key} = "${ef(requestId)}"`);
    if (record.length === 0) return { status: 404, data: { error: "Reset request not found" } };

    const data = JSON.parse(record[0].fields.Value || "{}");
    if (data.status === "completed") return { status: 400, data: { error: "This reset has already been completed" } };

    // Reset the employee's password
    const emps = await airtable.list(TABLES.EMPLOYEES, `{Name} = "${ef(data.employeeName)}"`);
    if (emps.length === 0) return { status: 404, data: { error: "Employee not found — they may have been removed" } };

    const emp = emps[0];
    await airtable.update(TABLES.EMPLOYEES, emp.id, {
      TempPassword: newTempPassword,
      FirstLogin: true,
      PasswordHash: "",
    });

    // Mark the request as completed
    await airtable.update(TABLES.SETTINGS, record[0].id, {
      Value: JSON.stringify({ ...data, status: "completed", completedAt: new Date().toISOString() }),
    });

    // Notify the employee
    const now = new Date().toISOString();
    await airtable.create(TABLES.NOTIFICATIONS, {
      EmployeeName: data.employeeName,
      Type: "system",
      Title: "Password Reset",
      Message: `Your password has been reset. Contact the team lead for your new temporary password. You'll be asked to set a new password on next login.`,
      Read: false,
      Timestamp: now,
    });

    return { status: 200, data: { success: true, message: `Password reset for ${data.employeeName}. New temp password: ${newTempPassword}` } };
  } catch (err: any) {
    return { status: 500, data: { error: "Failed to approve reset: " + err.message } };
  }
}

// ─── Notifications ──────────────────────────────────────
export async function handleGetNotifications(params: URLSearchParams) {
  const employee = params.get("employee");
  const filter = employee ? `{EmployeeName} = "${ef(employee)}"` : "";
  try {
    const records = await airtable.list(TABLES.NOTIFICATIONS, filter || undefined);
    return {
      status: 200,
      data: records.map((r) => ({ id: r.id, ...r.fields })).sort((a, b) => {
        const ta = a.Timestamp ? new Date(a.Timestamp).getTime() : 0;
        const tb = b.Timestamp ? new Date(b.Timestamp).getTime() : 0;
        return tb - ta;
      }),
    };
  } catch (err: any) {
    return { status: 500, data: { error: "Failed to load notifications: " + err.message } };
  }
}

export async function handleMarkNotificationRead(id: string) {
  try {
    await airtable.update(TABLES.NOTIFICATIONS, id, { Read: true });
    return { status: 200, data: { success: true } };
  } catch (err: any) {
    return { status: 500, data: { error: "Failed to mark notification: " + err.message } };
  }
}

// ─── Team Lead: Reset Employee Password ────────────────
export async function handleResetEmployeePassword(body: any) {
  const { employeeName, newTempPassword } = body;
  if (!employeeName || !newTempPassword)
    return { status: 400, data: { error: "Employee name and new temp password required" } };

  try {
    const emps = await airtable.list(TABLES.EMPLOYEES, `{Name} = "${ef(employeeName)}"`);
    if (emps.length === 0) return { status: 404, data: { error: "Employee not found" } };

    const emp = emps[0];
    await airtable.update(TABLES.EMPLOYEES, emp.id, {
      TempPassword: newTempPassword,
      FirstLogin: true,
      PasswordHash: "",
    });

    // Notify the employee
    const now = new Date().toISOString();
    await airtable.create(TABLES.NOTIFICATIONS, {
      EmployeeName: employeeName,
      Type: "system",
      Title: "Password Reset",
      Message: `Your password has been reset by the team lead. Use the new temporary password to log in. You'll be asked to set a new password on next login.`,
      Read: false,
      Timestamp: now,
    });

    return { status: 200, data: { success: true, message: `Password reset for ${employeeName}` } };
  } catch (err: any) {
    return { status: 500, data: { error: "Failed to reset password: " + err.message } };
  }
}

// ─── Seed ────────────────────────────────────────────────
export async function handleSeed() {
  return { status: 200, data: { success: true, message: "Database already seeded via setup script" } };
}

// ─── Calendar ──────────────────────────────────────────────
export async function handleGetCalendar(params: URLSearchParams) {
  const date = params.get("date");
  const filter = date ? `{Date} = "${ef(date)}"` : "";
  try {
    const records = await airtable.list(TABLES.CALENDAR, filter || undefined);
    return {
      status: 200,
      data: records.map((r) => {
        const fields = r.fields;
        // Normalize "Day Type" → DayType for frontend compatibility
        const normalized = { ...fields };
        if ("Day Type" in fields && !("DayType" in fields)) {
          (normalized as any).DayType = fields["Day Type"];
        }
        return { id: r.id, ...normalized };
      }),
    };
  } catch (err: any) {
    return { status: 500, data: { error: "Failed to fetch calendar: " + err.message } };
  }
}

export async function handleCreateCalendarEntry(body: any) {
  const { Date: date, DayType, EmployeeName, Reason } = body;
  if (!date || !DayType) return { status: 400, data: { error: "Date and DayType required" } };
  try {
    const created = await airtable.create(TABLES.CALENDAR, {
      Date: date,
      DayType: DayType,
      Description: Reason || "",
      EmployeeName: EmployeeName || "All",
    });
    return { status: 201, data: { id: created.id, ...created.fields } };
  } catch (err: any) {
    return { status: 500, data: { error: "Failed to create calendar entry: " + err.message } };
  }
}

export async function handleDeleteCalendarEntry(id: string) {
  try {
    await airtable.remove(TABLES.CALENDAR, id);
    return { status: 200, data: { success: true } };
  } catch (err: any) {
    return { status: 500, data: { error: "Failed to delete calendar entry: " + err.message } };
  }
}

// ─── Announcements (Live Feed) ──────────────────────────────
export async function handleGetAnnouncements(params: URLSearchParams) {
  const limit = params.get("limit") ? Number(params.get("limit")) : 20;
  try {
    const records = await airtable.list(TABLES.ANNOUNCEMENTS, undefined, undefined, limit);
    return {
      status: 200,
      data: records.map((r) => ({ id: r.id, ...r.fields })).sort((a, b) => {
        const ta = a.Timestamp ? new Date(a.Timestamp).getTime() : 0;
        const tb = b.Timestamp ? new Date(b.Timestamp).getTime() : 0;
        return tb - ta;
      }),
    };
  } catch (err: any) {
    return { status: 500, data: { error: "Failed to fetch announcements: " + err.message } };
  }
}

export async function handleCreateAnnouncement(body: any) {
  const { EmployeeName, Message, Type } = body;
  if (!EmployeeName || !Message) return { status: 400, data: { error: "EmployeeName and Message required" } };
  try {
    const created = await airtable.create(TABLES.ANNOUNCEMENTS, {
      EmployeeName,
      Message,
      Type: Type || "system",
      Timestamp: new Date().toISOString(),
      Read: false,
    });
    return { status: 201, data: { id: created.id, ...created.fields } };
  } catch (err: any) {
    return { status: 500, data: { error: "Failed to create announcement: " + err.message } };
  }
}

// ─── AI-Powered Engineering Quiz (NVIDIA MiniMax M3) ─────────
import { generateQuizQuestion } from "./nvidia";

/** Get previously asked questions for an employee from App_Settings */
async function getAskedQuestions(employee: string): Promise<string[]> {
  try {
    const records = await airtable.list(
      TABLES.SETTINGS,
      `{Key} = "quiz_history_${ef(employee)}"`
    );
    if (records.length > 0) {
      const data = JSON.parse(records[0].fields.Value || "[]");
      return Array.isArray(data) ? data : [];
    }
    return [];
  } catch {
    return [];
  }
}

/** Save a question to the employee's history */
async function saveAskedQuestion(employee: string, question: string) {
  try {
    const records = await airtable.list(
      TABLES.SETTINGS,
      `{Key} = "quiz_history_${ef(employee)}"`
    );
    const existing = records.length > 0 ? JSON.parse(records[0].fields.Value || "[]") : [];
    // Keep last 200 questions to avoid unbounded growth
    const updated = [...existing, question].slice(-200);
    if (records.length > 0) {
      await airtable.update(TABLES.SETTINGS, records[0].id, {
        Value: JSON.stringify(updated),
      });
    } else {
      await airtable.create(TABLES.SETTINGS, {
        Key: `quiz_history_${employee}`,
        Value: JSON.stringify(updated),
      });
    }
  } catch (err) {
    console.error("Failed to save quiz history (non-critical):", err);
  }
}

/** Daily quiz cap */
const DAILY_QUIZ_LIMIT = 3;

/** Check how many quizzes answered today */
async function getTodayQuizCount(employee: string): Promise<number> {
  const today = new Date().toISOString().split("T")[0];
  const records = await airtable.list(
    TABLES.QUIZ_HISTORY,
    `AND({EmployeeName} = "${ef(employee)}", LEFT({AnsweredAt}, 10) = "${today}")`
  );
  return records.length;
}

/** Generate a fresh AI-powered quiz question (capped at 3/day) */
export async function handleGenerateQuiz(body: any) {
  const { employee } = body;
  if (!employee) return { status: 400, data: { error: "Employee name required" } };
  try {
    const todayCount = await getTodayQuizCount(employee);
    if (todayCount >= DAILY_QUIZ_LIMIT) {
      return {
        status: 429,
        data: {
          error: `Daily quiz limit reached (${DAILY_QUIZ_LIMIT}/${DAILY_QUIZ_LIMIT}). Come back tomorrow!`,
          limitReached: true,
          count: todayCount,
          limit: DAILY_QUIZ_LIMIT,
        },
      };
    }
    const previousQuestions = await getAskedQuestions(employee);
    const question = await generateQuizQuestion(previousQuestions);
    await saveAskedQuestion(employee, question.question);
    return {
      status: 200,
      data: {
        id: `ai_${Date.now()}`,
        ...question,
        todayCount: todayCount + 1,
        dailyLimit: DAILY_QUIZ_LIMIT,
        remaining: DAILY_QUIZ_LIMIT - todayCount - 1,
      },
    };
  } catch (err: any) {
    console.error("Quiz generation failed:", err);
    return { status: 500, data: { error: "Failed to generate question: " + err.message } };
  }
}

/** Get quiz stats for an employee */
export async function handleGetQuizStats(params: URLSearchParams) {
  const employee = params.get("employee");
  if (!employee) return { status: 400, data: { error: "Employee parameter required" } };
  try {
    const xpLogs = await airtable.list(TABLES.XP_LOG, `{EmployeeName} = "${ef(employee)}"`);
    const quizLogs = xpLogs.filter((l) => l.fields.Action === "quiz_correct" || l.fields.Action === "quiz_wrong");
    const correct = quizLogs.filter((l) => l.fields.Action === "quiz_correct").length;
    const total = quizLogs.length;
    const asked = await getAskedQuestions(employee);
    return {
      status: 200,
      data: {
        correct,
        total,
        accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
        questionsAnswered: total,
        uniqueQuestions: asked.length,
      },
    };
  } catch (err: any) {
    return { status: 500, data: { error: "Failed to load quiz stats: " + err.message } };
  }
}

/** Submit a quiz answer, save to history, and get explanation */
export async function handleSubmitQuizAnswer(body: any) {
  const { employee, question, answer, correctAnswer, explanation, options, difficulty, category } = body;
  if (!employee || !question || !answer || !correctAnswer) {
    return { status: 400, data: { error: "Missing required fields" } };
  }
  const isCorrect = answer === correctAnswer;
  const xpEarned = isCorrect ? 5 : 0;
  try {
    // Save to QuizHistory for revisiting
    try {
      await airtable.create(TABLES.QUIZ_HISTORY, {
        EmployeeName: employee,
        Question: question,
        OptionA: options?.A || "",
        OptionB: options?.B || "",
        OptionC: options?.C || "",
        OptionD: options?.D || "",
        CorrectAnswer: correctAnswer,
        UserAnswer: answer,
        IsCorrect: isCorrect,
        Explanation: explanation || "",
        Difficulty: difficulty || "Medium",
        Category: category || "",
        AnsweredAt: new Date().toISOString(),
        XpEarned: xpEarned,
      });
    } catch (histErr) {
      console.error("QuizHistory save failed (non-critical):", histErr);
    }

    // Log XP
    await airtable.create(TABLES.XP_LOG, {
      EmployeeName: employee,
      Action: isCorrect ? "quiz_correct" : "quiz_wrong",
      Details: `${question.substring(0, 80)}... → ${answer} (${isCorrect ? "correct" : "wrong"})`,
      Timestamp: new Date().toISOString(),
    });
    if (isCorrect) {
      const emps = await airtable.list(TABLES.EMPLOYEES, `{Name} = "${ef(employee)}"`);
      if (emps.length > 0) {
        await airtable.update(TABLES.EMPLOYEES, emps[0].id, {
          XP: (emps[0].fields.XP || 0) + xpEarned,
        });
      }
    }
    return {
      status: 200,
      data: {
        correct: isCorrect,
        xpEarned,
        correctAnswer,
        explanation: explanation || "",
      },
    };
  } catch (err: any) {
    return { status: 500, data: { error: "Failed to submit answer: " + err.message } };
  }
}

/** Get quiz history for an employee */
export async function handleGetQuizHistory(params: URLSearchParams) {
  const employee = params.get("employee");
  if (!employee) return { status: 400, data: { error: "Employee parameter required" } };
  try {
    const records = await airtable.list(
      TABLES.QUIZ_HISTORY,
      `{EmployeeName} = "${ef(employee)}"`
    );
    return {
      status: 200,
      data: records.map((r) => ({ id: r.id, ...r.fields })).sort((a, b) => {
        const ta = a.AnsweredAt ? new Date(a.AnsweredAt).getTime() : 0;
        const tb = b.AnsweredAt ? new Date(b.AnsweredAt).getTime() : 0;
        return tb - ta;
      }),
    };
  } catch (err: any) {
    return { status: 500, data: { error: "Failed to fetch quiz history: " + err.message } };
  }
}

// ─── AI EOD Insights (GPT-OSS-20B) ──────────────────────────
import { generateEodInsights, generateWeeklyReport } from "./nvidia-oss";
import { generateEodDescription, chatWithEngineer, analyzeTeamPatterns } from "./deepseek";

export async function handleGetEodInsights(body: any) {
  const { employee, entries } = body;
  if (!employee || !entries?.length) {
    return { status: 400, data: { error: "Employee and entries required" } };
  }
  try {
    const insights = await generateEodInsights(entries, employee);
    return { status: 200, data: insights };
  } catch (err: any) {
    return { status: 500, data: { error: "Failed to generate insights: " + err.message } };
  }
}

export async function handleGetWeeklyReport() {
  try {
    const employees = await airtable.list(TABLES.EMPLOYEES, "{Active} = TRUE()");
    const allEntries = await airtable.list(TABLES.ENTRIES);
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weekStr = oneWeekAgo.toISOString().split("T")[0];

    const teamData = employees.map((emp) => {
      const name = emp.fields.Name;
      const empEntries = allEntries.filter((e) => e.fields.EmployeeName === name);
      const weekEntries = empEntries.filter((e) => e.fields.Date >= weekStr);
      const avgComp = weekEntries.length > 0
        ? Math.round(weekEntries.reduce((s, e) => s + (e.fields.CompletionPct || 0), 0) / weekEntries.length)
        : 0;
      return {
        name,
        entries: weekEntries.length,
        avgCompletion: avgComp,
        streak: emp.fields.CurrentStreak || 0,
        xp: emp.fields.XP || 0,
      };
    });

    const totalEntries = teamData.reduce((s, t) => s + t.entries, 0);
    const report = await generateWeeklyReport(teamData, totalEntries, employees.length);
    return { status: 200, data: report };
  } catch (err: any) {
    return { status: 500, data: { error: "Failed to generate report: " + err.message } };
  }
}

// ─── AI EOD Auto-Describe (DeepSeek V4) ───────────────────────
export async function handleAutoDescribe(body: any) {
  const { task, project, plannedQty, actualQty, complexity } = body;
  if (!task) return { status: 400, data: { error: "Task name required" } };
  try {
    const result = await generateEodDescription(task, project || "", plannedQty || 0, actualQty || 0, complexity || "Moderate");
    return { status: 200, data: result };
  } catch (err: any) {
    return { status: 500, data: { error: "Failed to generate description: " + err.message } };
  }
}

// ─── AI Piping Chatbot (DeepSeek V4) ─────────────────────────
export async function handleChatMessage(body: any) {
  const { message, context } = body;
  if (!message) return { status: 400, data: { error: "Message required" } };
  try {
    const result = await chatWithEngineer(message, context);
    return { status: 200, data: result };
  } catch (err: any) {
    return { status: 500, data: { error: "Chat failed: " + err.message } };
  }
}

// ─── AI Smart Team Analytics (DeepSeek V4) ────────────────────
export async function handleTeamAnalytics() {
  try {
    const employees = await airtable.list(TABLES.EMPLOYEES, "{Active} = TRUE()");
    const allEntries = await airtable.list(TABLES.ENTRIES);
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const weekStr = oneWeekAgo.toISOString().split("T")[0];
    const twoWeekStr = twoWeeksAgo.toISOString().split("T")[0];

    const teamHistory = employees.map((emp) => {
      const name = emp.fields.Name;
      const empEntries = allEntries.filter((e) => e.fields.EmployeeName === name);
      const thisWeek = empEntries.filter((e) => e.fields.Date >= weekStr);
      const lastWeek = empEntries.filter((e) => e.fields.Date >= twoWeekStr && e.fields.Date < weekStr);
      const avgComp = thisWeek.length > 0
        ? Math.round(thisWeek.reduce((s, e) => s + (e.fields.CompletionPct || 0), 0) / thisWeek.length)
        : 0;
      const trend = thisWeek.length > lastWeek.length ? "improving"
        : thisWeek.length < lastWeek.length ? "declining" : "stable";
      return {
        name,
        entries: thisWeek.length,
        avgCompletion: avgComp,
        streak: emp.fields.CurrentStreak || 0,
        recentTrend: trend,
        missedDays: Math.max(0, 5 - thisWeek.length),
      };
    });

    const report = await analyzeTeamPatterns(teamHistory, "last 7 days");
    return { status: 200, data: report };
  } catch (err: any) {
    return { status: 500, data: { error: "Failed to analyze team: " + err.message } };
  }
}

// ─── Push Notifications ─────────────────────────────────────
export async function handleSubscribePush(body: any) {
  const { employeeName, endpoint, p256dh, auth } = body;
  if (!employeeName || !endpoint) {
    return { status: 400, data: { error: "employeeName and endpoint required" } };
  }
  try {
    // Check if already subscribed
    const existing = await airtable.list(TABLES.PUSH_SUBS, `{EmployeeName} = "${ef(employeeName)}"`);
    if (existing.length > 0) {
      // Update existing
      await airtable.update(TABLES.PUSH_SUBS, existing[0].id, {
        Endpoint: endpoint,
        P256dh: p256dh || "",
        Auth: auth || "",
        Active: true,
      });
    } else {
      await airtable.create(TABLES.PUSH_SUBS, {
        EmployeeName: employeeName,
        Endpoint: endpoint,
        P256dh: p256dh || "",
        Auth: auth || "",
        Active: true,
        ReminderCount: 0,
      });
    }
    return { status: 200, data: { success: true } };
  } catch (err: any) {
    return { status: 500, data: { error: "Failed to subscribe: " + err.message } };
  }
}

export async function handleUnsubscribePush(body: any) {
  const { employeeName } = body;
  if (!employeeName) return { status: 400, data: { error: "employeeName required" } };
  try {
    const existing = await airtable.list(TABLES.PUSH_SUBS, `{EmployeeName} = "${ef(employeeName)}"`);
    if (existing.length > 0) {
      await airtable.update(TABLES.PUSH_SUBS, existing[0].id, { Active: false });
    }
    return { status: 200, data: { success: true } };
  } catch (err: any) {
    return { status: 500, data: { error: "Failed to unsubscribe: " + err.message } };
  }
}

export async function handleCheckReminders() {
  // This endpoint is called by the client to check if reminders should be sent
  // It checks: (1) employee hasn't filled today, (2) today is a working day, (3) not on leave
  const today = new Date().toISOString().split("T")[0];
  try {
    const employees = await airtable.list(TABLES.EMPLOYEES, "{Active} = TRUE()");
    const entries = await airtable.list(TABLES.ENTRIES, `{Date} = "${ef(today)}"`);
    const leaves = await airtable.list(TABLES.LEAVES, `{Date} = "${ef(today)}"`);
    const calendar = await airtable.list(TABLES.CALENDAR, `{Date} = "${ef(today)}"`);
    const pushSubs = await airtable.list(TABLES.PUSH_SUBS, "{Active} = TRUE()");

    const filledNames = entries.map((e) => e.fields.EmployeeName);
    const onLeaveNames = leaves.map((l) => l.fields.EmployeeName);
        // Normalize DayType field for calendar check (handles both "Day Type" and DayType)
        const isWorkingDay = calendar.length === 0 || calendar.some((c) => {
          const fields = c.fields as any;
          return fields.DayType === "Working" || fields["Day Type"] === "Working";
        });

    const needReminders: string[] = [];
    for (const emp of employees) {
      const name = emp.fields.Name;
      if (filledNames.includes(name)) continue; // Already filled
      if (onLeaveNames.includes(name)) continue; // On leave
      // Check push subscription exists
      const sub = pushSubs.find((s) => s.fields.EmployeeName === name);
      if (sub) needReminders.push(name);
    }

    return {
      status: 200,
      data: {
        isWorkingDay,
        needReminders,
        filledToday: filledNames,
        onLeaveToday: onLeaveNames,
      },
    };
  } catch (err: any) {
    return { status: 500, data: { error: "Failed to check reminders: " + err.message } };
  }
}

// ─── Team Lead: Get All Announcements ─────────────────────
export async function handleGetAllAnnouncements() {
  try {
    const records = await airtable.list(TABLES.ANNOUNCEMENTS);
    return {
      status: 200,
      data: records.map((r) => ({ id: r.id, ...r.fields })).sort((a, b) => {
        const ta = a.Timestamp ? new Date(a.Timestamp).getTime() : 0;
        const tb = b.Timestamp ? new Date(b.Timestamp).getTime() : 0;
        return tb - ta;
      }),
    };
  } catch (err: any) {
    return { status: 500, data: { error: "Failed to fetch announcements: " + err.message } };
  }
}

// ─── Team Lead: Manage Calendar ──────────────────────────
export async function handleGetAllCalendar() {
  try {
    const records = await airtable.list(TABLES.CALENDAR);
    return {
      status: 200,
      data: records.map((r) => {
        const fields = r.fields;
        // Normalize "Day Type" → DayType for frontend compatibility
        const normalized = { ...fields };
        if ("Day Type" in fields && !("DayType" in fields)) {
          (normalized as any).DayType = fields["Day Type"];
        }
        return { id: r.id, ...normalized };
      }),
    };
  } catch (err: any) {
    return { status: 500, data: { error: "Failed to fetch calendar: " + err.message } };
  }
}
