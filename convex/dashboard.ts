import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getTeamPulse = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const employees = await ctx.db
      .query("employees")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const activeEmployees = employees.filter((e) => e.role === "employee");
    const totalEmployees = activeEmployees.length;

    let submittedToday = 0;
    const missingToday: any[] = [];
    const streakAtRisk: any[] = [];
    const lowCompletion: any[] = [];
    let totalCompletion = 0;
    let knowledgeCount = 0;

    for (const emp of activeEmployees) {
      const entry = await ctx.db
        .query("eod")
        .withIndex("by_employee_date", (q) =>
          q.eq("employeeId", emp._id).eq("date", args.date)
        )
        .first();

      if (entry) {
        submittedToday++;
        totalCompletion += entry.overallCompletion;
        if (entry.overallCompletion < 70) {
          lowCompletion.push({ entry, employee: emp });
        }
      } else {
        missingToday.push(emp);
        if (emp.currentStreak >= 3) {
          streakAtRisk.push(emp);
        }
      }

      // Check knowledge participation
      const knowledge = await ctx.db
        .query("knowledgeAssignments")
        .withIndex("by_employee_date", (q) =>
          q.eq("employeeId", emp._id).eq("date", args.date)
        )
        .first();

      if (knowledge?.isAnswered) {
        knowledgeCount++;
      }
    }

    const eodCompliance = totalEmployees > 0
      ? Math.round((submittedToday / totalEmployees) * 100)
      : 0;

    const avgCompletion = submittedToday > 0
      ? Math.round(totalCompletion / submittedToday)
      : 0;

    const activeStreaks = activeEmployees.filter((e) => e.currentStreak > 0).length;
    const knowledgeParticipation = totalEmployees > 0
      ? Math.round((knowledgeCount / totalEmployees) * 100)
      : 0;

    const teamHealth = Math.round(
      (eodCompliance * 0.4 + avgCompletion * 0.3 + knowledgeParticipation * 0.3)
    );

    return {
      totalEmployees,
      submittedToday,
      missingToday,
      streakAtRisk,
      lowCompletion,
      eodCompliance,
      avgCompletion,
      activeStreaks,
      knowledgeParticipation,
      teamHealth,
    };
  },
});

export const getLog = query({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("activityLog")
      .withIndex("by_created")
      .order("desc")
      .take(args.limit);

    const results = [];
    for (const log of logs) {
      const employee = await ctx.db.get(log.employeeId);
      results.push({ ...log, employee });
    }

    return results;
  },
});

export const getPendingResets = query({
  args: {},
  handler: async (ctx) => {
    const resets = await ctx.db
      .query("passwordResets")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    const results = [];
    for (const reset of resets) {
      const employee = await ctx.db.get(reset.employeeId);
      results.push({ ...reset, employee });
    }

    return results;
  },
});

export const processPasswordReset = mutation({
  args: {
    resetId: v.id("passwordResets"),
    processedBy: v.id("employees"),
    approve: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.resetId, {
      status: args.approve ? "approved" : "declined",
      processedBy: args.processedBy,
      processedAt: now,
    });
  },
});
