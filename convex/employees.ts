import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("employees").collect();
  },
});

export const get = query({
  args: { employeeId: v.id("employees") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.employeeId);
  },
});

export const setupTeam = mutation({
  args: {
    teamLeadName: v.string(),
    employeeNames: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if already set up
    const existing = await ctx.db.query("employees").collect();
    if (existing.length > 0) {
      throw new Error("Team already set up");
    }

    const now = Date.now();
    const employeeIds = [];

    // Create team lead
    const leadId = await ctx.db.insert("employees", {
      name: args.teamLeadName,
      role: "team_lead",
      xp: 0,
      level: 1,
      levelTitle: "Piping Trainee",
      currentStreak: 0,
      longestStreak: 0,
      totalEntries: 0,
      knowledgePoints: 0,
      knowledgeStreak: 0,
      isActive: true,
      createdAt: now,
    });
    employeeIds.push(leadId);

    // Create employees
    for (const name of args.employeeNames) {
      const id = await ctx.db.insert("employees", {
        name,
        role: "employee",
        xp: 0,
        level: 1,
        levelTitle: "Piping Trainee",
        currentStreak: 0,
        longestStreak: 0,
        totalEntries: 0,
        knowledgePoints: 0,
        knowledgeStreak: 0,
        isActive: true,
        createdAt: now,
      });
      employeeIds.push(id);
    }

    return employeeIds;
  },
});

export const toggleActive = mutation({
  args: { employeeId: v.id("employees") },
  handler: async (ctx, args) => {
    const emp = await ctx.db.get(args.employeeId);
    if (!emp) throw new Error("Employee not found");
    await ctx.db.patch(args.employeeId, { isActive: !emp.isActive });
  },
});

export const getLeaderboardStats = query({
  args: {},
  handler: async (ctx) => {
    const employees = await ctx.db
      .query("employees")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const stats = [];

    for (const emp of employees) {
      // Get recent entries for consistency and completion stats
      const entries = await ctx.db
        .query("eod")
        .withIndex("by_employee", (q) => q.eq("employeeId", emp._id))
        .order("desc")
        .take(30);

      const consistency = entries.length > 0
        ? Math.round((entries.length / 30) * 100)
        : 0;

      const avgCompletion = entries.length > 0
        ? Math.round(entries.reduce((s, e) => s + e.overallCompletion, 0) / entries.length)
        : 0;

      const totalOutput = entries.reduce((s, e) => s + e.totalActual, 0);

      stats.push({
        _id: emp._id,
        name: emp.name,
        role: emp.role,
        xp: emp.xp,
        level: emp.level,
        levelTitle: emp.levelTitle,
        currentStreak: emp.currentStreak,
        longestStreak: emp.longestStreak,
        totalEntries: emp.totalEntries,
        knowledgePoints: emp.knowledgePoints,
        consistency,
        avgCompletion,
        totalOutput,
      });
    }

    return stats;
  },
});
