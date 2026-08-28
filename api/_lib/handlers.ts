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
    data: { token, employee: sanitizeEmp(emp), forcePasswordChange: false },
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
  if (!employee) return { status: 400, data: { error: "Employee parameter required" } };

  try {
    const emps = await airtable.list(TABLES.EMPLOYEES, `{Name} = "${ef(employee)}"`);
    const emp = emps[0];
    if (!emp) return { status: 404, data: { error: "Employee not found" } };

    const badges = await airtable.list(
      TABLES.EARNED_BADGES,
      `{EmployeeName} = "${ef(employee)}"`
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
