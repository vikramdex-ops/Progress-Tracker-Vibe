import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const give = mutation({
  args: {
    fromEmployeeId: v.id("employees"),
    toEmployeeId: v.id("employees"),
    message: v.string(),
    reason: v.union(
      v.literal("great_consistency"),
      v.literal("good_output"),
      v.literal("helpful_to_team"),
      v.literal("solved_difficult_issue"),
      v.literal("good_quality"),
      v.literal("knowledge_sharing"),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const xpAwarded = 10;

    // Calculate week of
    const date = new Date();
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date);
    monday.setDate(diff);
    const weekOf = monday.toISOString().split("T")[0];

    await ctx.db.insert("shoutouts", {
      fromEmployeeId: args.fromEmployeeId,
      toEmployeeId: args.toEmployeeId,
      message: args.message,
      reason: args.reason,
      xpAwarded,
      weekOf,
      createdAt: now,
    });

    // Award XP to recipient
    await ctx.db.insert("xpLog", {
      employeeId: args.toEmployeeId,
      amount: xpAwarded,
      reason: `Shoutout from colleague`,
      source: "shoutout",
      createdAt: now,
    });

    // Notification
    const fromEmp = await ctx.db.get(args.fromEmployeeId);
    await ctx.db.insert("notifications", {
      employeeId: args.toEmployeeId,
      title: "👏 Shoutout!",
      message: `${fromEmp?.name} recognized you: "${args.message}"`,
      type: "shoutout",
      isRead: false,
      createdAt: now,
    });

    // Activity log
    await ctx.db.insert("activityLog", {
      employeeId: args.fromEmployeeId,
      action: "gave a shoutout",
      details: `To ${args.toEmployeeId}: ${args.reason.replace(/_/g, " ")}`,
      createdAt: now,
    });
  },
});

export const giveWeeklyPick = mutation({
  args: {
    employeeId: v.id("employees"),
    givenBy: v.id("employees"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const date = new Date();
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date);
    monday.setDate(diff);
    const weekOf = monday.toISOString().split("T")[0];

    // Check if already given this week
    const existing = await ctx.db
      .query("weeklyPicks")
      .withIndex("by_week", (q) => q.eq("weekOf", weekOf))
      .first();

    if (existing) throw new Error("Weekly pick already given this week");

    const xpAwarded = 50;

    await ctx.db.insert("weeklyPicks", {
      employeeId: args.employeeId,
      givenBy: args.givenBy,
      reason: args.reason,
      weekOf,
      xpAwarded,
      createdAt: now,
    });

    // Award XP
    await ctx.db.insert("xpLog", {
      employeeId: args.employeeId,
      amount: xpAwarded,
      reason: "Team Lead's Weekly Pick",
      source: "weekly_pick",
      createdAt: now,
    });

    // Notification
    await ctx.db.insert("notifications", {
      employeeId: args.employeeId,
      title: "⭐ Team Lead's Pick!",
      message: `You were selected as Team Lead's Pick! +${xpAwarded} XP`,
      type: "shoutout",
      isRead: false,
      createdAt: now,
    });
  },
});

export const getAll = query({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    const shoutouts = await ctx.db.query("shoutouts").order("desc").take(args.limit);

    const results = [];
    for (const s of shoutouts) {
      const fromEmployee = await ctx.db.get(s.fromEmployeeId);
      const toEmployee = await ctx.db.get(s.toEmployeeId);
      results.push({ ...s, fromEmployee, toEmployee });
    }

    return results;
  },
});

export const getCurrentWeekPick = query({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now);
    monday.setDate(diff);
    const weekOf = monday.toISOString().split("T")[0];

    const pick = await ctx.db
      .query("weeklyPicks")
      .withIndex("by_week", (q) => q.eq("weekOf", weekOf))
      .first();

    if (!pick) return null;

    const employee = await ctx.db.get(pick.employeeId);
    const givenByEmp = await ctx.db.get(pick.givenBy);

    return { ...pick, employee, givenByEmp };
  },
});
