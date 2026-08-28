import { airtable, TABLES } from "./airtable";
import { hashPassword, verifyPassword, generateToken, getEmployeeByEmail } from "./auth";

// ─── Auth ────────────────────────────────────────────────
export async function handleLogin(body: any) {
  const { email, password } = body;
  if (!email || !password) return { status: 400, data: { error: "Email and password required" } };

  const emp = await getEmployeeByEmail(email);
  if (!emp) return { status: 401, data: { error: "Invalid credentials" } };
  if (!emp.Active) return { status: 403, data: { error: "Account deactivated" } };

  // First login: use temp password
  if (emp.FirstLogin) {
    if (password !== emp.TempPassword) {
      return { status: 401, data: { error: "Invalid temporary password" } };
    }
    const token = generateToken();
    await airtable.update(TABLES.EMPLOYEES, emp.id, { SessionToken: token });
    return {
      status: 200,
      data: { token, employee: sanitizeEmp(emp), forcePasswordChange: true },
    };
  }

  // Normal login
  if (!verifyPassword(password, emp.PasswordHash)) {
    return { status: 401, data: { error: "Invalid password" } };
  }
  const token = generateToken();
  await airtable.update(TABLES.EMPLOYEES, emp.id, { SessionToken: token });
  return {
    status: 200,
    data: { token, employee: sanitizeEmp(emp), forcePasswordChange: false },
  };
}

export async function handleChangePassword(body: any, emp: any) {
  const { oldPassword, newPassword } = body;
  if (!newPassword || newPassword.length < 4)
    return { status: 400, data: { error: "Password must be at least 4 characters" } };

  if (!emp.FirstLogin) {
    if (!oldPassword || !verifyPassword(oldPassword, emp.PasswordHash)) {
      return { status: 401, data: { error: "Current password incorrect" } };
    }
  }

  const hash = hashPassword(newPassword);
  await airtable.update(TABLES.EMPLOYEES, emp.id, {
    PasswordHash: hash,
    FirstLogin: false,
    TempPassword: "",
  });
  return { status: 200, data: { success: true } };
}

// ─── Employees ───────────────────────────────────────────
export async function handleGetEmployees() {
  const records = await airtable.listAll(TABLES.EMPLOYEES, "{Active} = TRUE()");
  return {
    status: 200,
    data: records.map((r) => ({ id: r.id, ...sanitizeEmp(r) })),
  };
}

// ─── EOD Entries ─────────────────────────────────────────
export async function handleGetEntries(params: URLSearchParams) {
  const date = params.get("date");
  const employee = params.get("employee");
  let filter = "";
  if (date && employee) {
    filter = `AND({Date} = "${date}", {EmployeeName} = "${employee}")`;
  } else if (date) {
    filter = `{Date} = "${date}"`;
  } else if (employee) {
    filter = `{EmployeeName} = "${employee}"`;
  }
  const records = await airtable.listAll(TABLES.ENTRIES, filter || undefined);
  return { status: 200, data: records.map((r) => ({ id: r.id, ...r.fields })) };
}

export async function handleCreateEntry(body: any) {
  const { EmployeeName, Date, workItems, OverallRemarks } = body;
  if (!EmployeeName || !Date || !workItems?.length) {
    return { status: 400, data: { error: "Missing required fields" } };
  }

  const results = [];
  for (const item of workItems) {
    const planned = Number(item.plannedQty) || 0;
    const actual = Number(item.actualQty) || 0;
    const completionPct = planned > 0 ? Math.round((actual / planned) * 100) : 0;
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

    const created = await airtable.create(TABLES.ENTRIES, fields);
    results.push({ id: created.id, ...created.fields });
  }

  // Award XP
  const xpResult = await awardEntryXp(EmployeeName, workItems);

  return { status: 201, data: { entries: results, xp: xpResult } };
}

export async function handleRateEntry(body: any) {
  const { entryId, rating, ratingRemarks } = body;
  if (!entryId || !rating) return { status: 400, data: { error: "Missing fields" } };
  const updated = await airtable.update(TABLES.ENTRIES, entryId, {
    Rating: rating,
    RatingRemarks: ratingRemarks || "",
  });
  return { status: 200, data: { id: updated.id, ...updated.fields } };
}

// ─── Leaves ──────────────────────────────────────────────
export async function handleGetLeaves(params: URLSearchParams) {
  const date = params.get("date");
  const filter = date ? `{Date} = "${date}"` : "";
  const records = await airtable.listAll(TABLES.LEAVES, filter || undefined);
  return { status: 200, data: records.map((r) => ({ id: r.id, ...r.fields })) };
}

export async function handleCreateLeave(body: any) {
  const { EmployeeName, Date, Reason, MarkedBy } = body;
  if (!EmployeeName || !Date) return { status: 400, data: { error: "Missing fields" } };
  const created = await airtable.create(TABLES.LEAVES, {
    EmployeeName,
    Date,
    Reason: Reason || "",
    MarkedBy: MarkedBy || "",
  });
  return { status: 201, data: { id: created.id, ...created.fields } };
}

export async function handleDeleteLeave(id: string) {
  await airtable.remove(TABLES.LEAVES, id);
  return { status: 200, data: { success: true } };
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

  // Update employee XP
  const emps = await airtable.listAll(TABLES.EMPLOYEES, `{Name} = "${employeeName}"`);
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

  return { amount: totalXp, earlyBird: hour < 17, fullCompletion: allComplete };
}

function calculateLevel(xp: number) {
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
  let current = levels[0];
  for (let i = levels.length - 1; i >= 0; i--) {
    if (xp >= levels[i].xp) { current = levels[i]; break; }
  }
  return current;
}

export async function handleGetGamification(params: URLSearchParams) {
  const employee = params.get("employee");
  if (!employee) return { status: 400, data: { error: "Employee required" } };

  const emps = await airtable.listAll(TABLES.EMPLOYEES, `{Name} = "${employee}"`);
  const emp = emps[0];
  if (!emp) return { status: 404, data: { error: "Employee not found" } };

  const badges = await airtable.listAll(
    TABLES.EARNED_BADGES,
    `{EmployeeName} = "${employee}"`
  );

  return {
    status: 200,
    data: {
      xp: emp.fields.XP || 0,
      level: emp.fields.Level || 1,
      levelTitle: emp.fields.LevelTitle || "Piping Trainee",
      currentStreak: emp.fields.CurrentStreak || 0,
      longestStreak: emp.fields.LongestStreak || 0,
      totalEntries: emp.fields.TotalEntries || 0,
      badges: badges.map((b) => ({ id: b.id, ...b.fields })),
    },
  };
}

// ─── Seed ────────────────────────────────────────────────
// ─── Forgot Password ───────────────────────────────────
export async function handleForgotPassword(body: any) {
  const { email } = body;
  if (!email) return { status: 400, data: { error: "Email required" } };

  // Find the employee by email
  const emps = await airtable.listAll(TABLES.EMPLOYEES, `{Email} = "${email}"`);
  if (emps.length === 0) {
    // Don't reveal whether the email exists
    return { status: 200, data: { success: true, message: "If an account exists, the team lead has been notified." } };
  }

  const emp = emps[0];
  const empName = emp.fields.Name;

  // Create a notification for the team lead
  const now = new Date().toISOString();
  await airtable.create(TABLES.NOTIFICATIONS, {
    EmployeeName: "Vikram",
    Type: "system",
    Title: "Password Reset Request",
    Message: `${empName} (${email}) has requested a password reset. Please generate a new temporary password and share it with them.`,
    Read: false,
    Timestamp: now,
  });

  // Also store a password reset request record in Settings for tracking
  await airtable.create(TABLES.SETTINGS, {
    Key: `pwd_reset_${Date.now()}`,
    Value: JSON.stringify({ employeeName: empName, email, requestedAt: now, status: "pending" }),
  });

  return {
    status: 200,
    data: { success: true, message: "Your request has been sent to the team lead. They will reset your password shortly." },
  };
}

// ─── Password Reset Requests (team lead) ────────────────
export async function handleGetPasswordResets() {
  const settings = await airtable.listAll(TABLES.SETTINGS);
  const resets = settings
    .filter((s) => s.fields.Key?.startsWith("pwd_reset_"))
    .map((s) => {
      const val = JSON.parse(s.fields.Value || "{}");
      return { id: s.id, ...val };
    })
    .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  return { status: 200, data: resets };
}

export async function handleApprovePasswordReset(body: any) {
  const { requestId, newTempPassword } = body;
  if (!requestId || !newTempPassword)
    return { status: 400, data: { error: "Request ID and new temp password required" } };

  // Get the request record
  const record = await airtable.listAll(TABLES.SETTINGS, `{Key} = "${requestId}"`);
  if (record.length === 0) return { status: 404, data: { error: "Reset request not found" } };

  const data = JSON.parse(record[0].fields.Value || "{}");
  if (data.status === "completed") return { status: 400, data: { error: "Already completed" } };

  // Reset the employee's password
  const emps = await airtable.listAll(TABLES.EMPLOYEES, `{Name} = "${data.employeeName}"`);
  if (emps.length === 0) return { status: 404, data: { error: "Employee not found" } };

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
}

// ─── Notifications ──────────────────────────────────────
export async function handleGetNotifications(params: URLSearchParams) {
  const employee = params.get("employee");
  const filter = employee ? `{EmployeeName} = "${employee}"` : "";
  const records = await airtable.listAll(TABLES.NOTIFICATIONS, filter || undefined);
  return {
    status: 200,
    data: records.map((r) => ({ id: r.id, ...r.fields })).sort((a, b) => {
      const ta = a.Timestamp ? new Date(a.Timestamp).getTime() : 0;
      const tb = b.Timestamp ? new Date(b.Timestamp).getTime() : 0;
      return tb - ta;
    }),
  };
}

export async function handleMarkNotificationRead(id: string) {
  await airtable.update(TABLES.NOTIFICATIONS, id, { Read: true });
  return { status: 200, data: { success: true } };
}

// ─── Team Lead: Reset Employee Password ────────────────
export async function handleResetEmployeePassword(body: any) {
  const { employeeName, newTempPassword } = body;
  if (!employeeName || !newTempPassword)
    return { status: 400, data: { error: "Employee name and new temp password required" } };

  const emps = await airtable.listAll(TABLES.EMPLOYEES, `{Name} = "${employeeName}"`);
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
}

// ─── Seed ────────────────────────────────────────────────
export async function handleSeed() {
  return { status: 200, data: { success: true, message: "Database already seeded via setup script" } };
}

// ─── Helpers ─────────────────────────────────────────────
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
