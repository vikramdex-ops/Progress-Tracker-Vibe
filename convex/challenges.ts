import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getTodaysChallenges = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("dailyChallenges")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

export const getWeeklyChallenge = query({
  args: { weekStart: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("weeklyChallenges")
      .withIndex("by_week", (q) => q.eq("weekStart", args.weekStart))
      .first();
  },
});

export const createWeeklyChallenge = mutation({
  args: {
    weekStart: v.string(),
    title: v.string(),
    description: v.string(),
    targetType: v.union(
      v.literal("submission_rate"),
      v.literal("completion_rate"),
      v.literal("streak_maintenance"),
      v.literal("knowledge_points"),
      v.literal("custom"),
    ),
    targetValue: v.number(),
    xpReward: v.number(),
  },
  handler: async (ctx, args) => {
    const employees = await ctx.db
      .query("employees")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const totalEmployees = employees.filter((e) => e.role === "employee").length;

    return await ctx.db.insert("weeklyChallenges", {
      weekStart: args.weekStart,
      title: args.title,
      description: args.description,
      targetType: args.targetType,
      targetValue: args.targetValue,
      xpReward: args.xpReward,
      currentProgress: 0,
      totalParticipants: totalEmployees,
      isActive: true,
      isCompleted: false,
      createdBy: employees[0]._id,
      createdAt: Date.now(),
    });
  },
});

export const completeChallenge = mutation({
  args: {
    challengeId: v.id("weeklyChallenges"),
    employeeId: v.id("employees"),
  },
  handler: async (ctx, args) => {
    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge || !challenge.isActive) return;

    // Check if already completed
    const existing = await ctx.db
      .query("challengeCompletions")
      .withIndex("by_challenge", (q) => q.eq("challengeId", args.challengeId))
      .collect();

    const alreadyCompleted = existing.some(
      (c) => c.employeeId === args.employeeId
    );
    if (alreadyCompleted) return;

    await ctx.db.insert("challengeCompletions", {
      challengeId: args.challengeId,
      employeeId: args.employeeId,
      completedAt: Date.now(),
    });

    const newProgress = challenge.currentProgress + 1;
    await ctx.db.patch(args.challengeId, {
      currentProgress: newProgress,
      isCompleted: newProgress >= challenge.totalParticipants,
    });

    if (newProgress >= challenge.totalParticipants) {
      // Award XP to all participants
      for (const completion of existing) {
        await ctx.db.insert("xpLog", {
          employeeId: completion.employeeId,
          amount: challenge.xpReward,
          reason: `Weekly Challenge Completed: ${challenge.title}`,
          source: "weekly_challenge",
          createdAt: Date.now(),
        });
      }
    }
  },
});

export const generateDailyChallenges = mutation({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("dailyChallenges")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .collect();

    if (existing.length > 0) return;

    const dateHash = args.date.split("-").reduce((a, b) => a + parseInt(b), 0);

    const challenges = [
      {
        title: "Complete 100% of planned quantity",
        description: "Achieve 100% completion on all work items",
        challengeType: "completion_100" as const,
        xpReward: 20,
      },
      {
        title: "Submit before 5:00 PM",
        description: "Submit your EOD entry before 5 PM",
        challengeType: "early_bird" as const,
        xpReward: 5,
      },
      {
        title: "Submit a knowledge question",
        description: "Answer today's piping knowledge question",
        challengeType: "knowledge_bonus" as const,
        xpReward: 5,
      },
    ];

    const selected = challenges[dateHash % challenges.length];

    await ctx.db.insert("dailyChallenges", {
      date: args.date,
      title: selected.title,
      description: selected.description,
      challengeType: selected.challengeType,
      xpReward: selected.xpReward,
      isActive: true,
    });

    return true;
  },
});
