import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getTodayKnowledge = query({
  args: {
    employeeId: v.id("employees"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const assignment = await ctx.db
      .query("knowledgeAssignments")
      .withIndex("by_employee_date", (q) =>
        q.eq("employeeId", args.employeeId).eq("date", args.date)
      )
      .first();

    if (!assignment) return { assignment: null, knowledge: null };

    const knowledge = await ctx.db.get(assignment.knowledgeId);
    return { assignment, knowledge };
  },
});

export const assignDailyKnowledge = mutation({
  args: {
    employeeId: v.id("employees"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if already assigned today
    const existing = await ctx.db
      .query("knowledgeAssignments")
      .withIndex("by_employee_date", (q) =>
        q.eq("employeeId", args.employeeId).eq("date", args.date)
      )
      .first();

    if (existing) return existing._id;

    // Get active knowledge items
    const allKnowledge = await ctx.db
      .query("knowledge")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    if (allKnowledge.length === 0) return null;

    // Pick one based on date hash for consistency across employees on same day
    const dateHash = args.date.split("-").reduce((a, b) => a + parseInt(b), 0);
    const knowledgeItem = allKnowledge[dateHash % allKnowledge.length];

    return await ctx.db.insert("knowledgeAssignments", {
      employeeId: args.employeeId,
      knowledgeId: knowledgeItem._id,
      date: args.date,
      isAnswered: false,
      awardedXp: 0,
    });
  },
});

export const submitKnowledgeAnswer = mutation({
  args: {
    employeeId: v.id("employees"),
    assignmentId: v.id("knowledgeAssignments"),
    answerIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) throw new Error("Assignment not found");
    if (assignment.isAnswered) throw new Error("Already answered");

    const knowledge = await ctx.db.get(assignment.knowledgeId);
    if (!knowledge) throw new Error("Knowledge item not found");

    const isCorrect = knowledge.correctAnswer === args.answerIndex;
    const xpAwarded = isCorrect ? 5 : 0;

    await ctx.db.patch(args.assignmentId, {
      isAnswered: true,
      isCorrect,
      awardedXp: xpAwarded,
    });

    if (xpAwarded > 0) {
      await ctx.db.insert("xpLog", {
        employeeId: args.employeeId,
        amount: xpAwarded,
        reason: "Knowledge Answer Correct",
        source: "knowledge",
        createdAt: Date.now(),
      });

      // Update knowledge points
      const emp = await ctx.db.get(args.employeeId);
      if (emp) {
        await ctx.db.patch(args.employeeId, {
          knowledgePoints: emp.knowledgePoints + xpAwarded,
        });
      }
    }

    return { isCorrect, xpAwarded, explanation: knowledge.explanation };
  },
});

export const markViewed = mutation({
  args: { assignmentId: v.id("knowledgeAssignments") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.assignmentId, { isAnswered: true });
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("knowledge")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});
