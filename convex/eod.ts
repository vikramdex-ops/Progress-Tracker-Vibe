import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const submit = mutation({
  args: {
    employeeId: v.id("employees"),
    date: v.string(),
    workItems: v.array(v.object({
      projectName: v.string(),
      task: v.string(),
      description: v.optional(v.string()),
      plannedQty: v.number(),
      actualQty: v.number(),
      completionPercent: v.number(),
      complexity: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical")),
      itemRemarks: v.optional(v.string()),
    })),
    overallRemarks: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if already submitted today
    const existing = await ctx.db
      .query("eod")
      .withIndex("by_employee_date", (q) =>
        q.eq("employeeId", args.employeeId).eq("date", args.date)
      )
      .first();

    if (existing) {
      throw new Error("Already submitted today. Use edit instead.");
    }

    const totalPlanned = args.workItems.reduce((s, w) => s + w.plannedQty, 0);
    const totalActual = args.workItems.reduce((s, w) => s + w.actualQty, 0);
    const overallCompletion = totalPlanned > 0
      ? Math.round((totalActual / totalPlanned) * 100)
      : 0;

    const now = Date.now();
    const xpAwarded = 10;

    const entryId = await ctx.db.insert("eod", {
      employeeId: args.employeeId,
      date: args.date,
      workItems: args.workItems,
      overallRemarks: args.overallRemarks,
      totalPlanned,
      totalActual,
      overallCompletion,
      isEdited: false,
      editCount: 0,
      submittedAt: now,
      xpAwarded,
    });

    // Award base XP
    await ctx.db.insert("xpLog", {
      employeeId: args.employeeId,
      amount: xpAwarded,
      reason: "EOD Submission",
      source: "eod",
      createdAt: now,
    });

    // Award early bird bonus if before 5 PM
    const hour = new Date().getHours();
    if (hour < 17) {
      await ctx.db.insert("xpLog", {
        employeeId: args.employeeId,
        amount: 5,
        reason: "Early Bird - Submitted before 5 PM",
        source: "early_bird",
        createdAt: now,
      });
    }

    // Award 100% completion bonus
    if (overallCompletion >= 100 && args.workItems.length > 0) {
      await ctx.db.insert("xpLog", {
        employeeId: args.employeeId,
        amount: 5,
        reason: "100% Planned Completion",
        source: "perfect_completion",
        createdAt: now,
      });
    }

    // Log activity
    await ctx.db.insert("activityLog", {
      employeeId: args.employeeId,
      action: "submitted EOD entry",
      details: `${args.workItems.length} work item(s), ${overallCompletion}% completion`,
      createdAt: now,
    });

    // Update employee total entries
    const emp = await ctx.db.get(args.employeeId);
    if (emp) {
      await ctx.db.patch(args.employeeId, {
        totalEntries: emp.totalEntries + 1,
        lastSubmissionDate: args.date,
      });
    }

    return entryId;
  },
});

export const edit = mutation({
  args: {
    entryId: v.id("eod"),
    employeeId: v.id("employees"),
    workItems: v.array(v.object({
      projectName: v.string(),
      task: v.string(),
      description: v.optional(v.string()),
      plannedQty: v.number(),
      actualQty: v.number(),
      completionPercent: v.number(),
      complexity: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical")),
      itemRemarks: v.optional(v.string()),
    })),
    overallRemarks: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (!entry) throw new Error("Entry not found");
    if (entry.employeeId !== args.employeeId) throw new Error("Not authorized");

    // Check 24-hour edit window
    const hoursSinceSubmission = (Date.now() - entry.submittedAt) / (1000 * 60 * 60);
    if (hoursSinceSubmission > 24) {
      throw new Error("Edit window expired (24 hours)");
    }

    const totalPlanned = args.workItems.reduce((s, w) => s + w.plannedQty, 0);
    const totalActual = args.workItems.reduce((s, w) => s + w.actualQty, 0);
    const overallCompletion = totalPlanned > 0
      ? Math.round((totalActual / totalPlanned) * 100)
      : 0;

    await ctx.db.patch(args.entryId, {
      workItems: args.workItems,
      overallRemarks: args.overallRemarks,
      totalPlanned,
      totalActual,
      overallCompletion,
      isEdited: true,
      editCount: entry.editCount + 1,
    });

    return args.entryId;
  },
});

export const getByEmployeeAndDate = query({
  args: {
    employeeId: v.id("employees"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("eod")
      .withIndex("by_employee_date", (q) =>
        q.eq("employeeId", args.employeeId).eq("date", args.date)
      )
      .first();
  },
});

export const getRecentByEmployee = query({
  args: {
    employeeId: v.id("employees"),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("eod")
      .withIndex("by_employee", (q) => q.eq("employeeId", args.employeeId))
      .order("desc")
      .take(args.limit);
  },
});

export const getTodayStatus = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const employees = await ctx.db
      .query("employees")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const results = [];
    for (const emp of employees) {
      const entry = await ctx.db
        .query("eod")
        .withIndex("by_employee_date", (q) =>
          q.eq("employeeId", emp._id).eq("date", args.date)
        )
        .first();

      results.push({
        employee: emp,
        submitted: !!entry,
        entry,
      });
    }

    return results;
  },
});

export const rateEntry = mutation({
  args: {
    entryId: v.id("eod"),
    ratedBy: v.id("employees"),
    rating: v.union(
      v.literal("excellent"),
      v.literal("good"),
      v.literal("satisfactory"),
      v.literal("needs_improvement"),
      v.literal("poor"),
    ),
    ratedRemarks: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (!entry) throw new Error("Entry not found");

    const now = Date.now();
    await ctx.db.patch(args.entryId, {
      rating: args.rating,
      ratedBy: args.ratedBy,
      ratedAt: now,
      ratedRemarks: args.ratedRemarks,
    });

    // Award XP for good/excellent ratings
    if (args.rating === "excellent" || args.rating === "good") {
      await ctx.db.insert("xpLog", {
        employeeId: entry.employeeId,
        amount: 10,
        reason: `Rating: ${args.rating}`,
        source: "rating",
        createdAt: now,
      });
    }

    // Log activity
    await ctx.db.insert("activityLog", {
      employeeId: args.ratedBy,
      action: "rated an EOD entry",
      details: `Rating: ${args.rating}`,
      createdAt: now,
    });
  },
});
