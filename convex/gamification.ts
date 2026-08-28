import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// XP level thresholds
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

function getLevelForXp(xp: number) {
  let current = LEVELS[0];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xp) {
      current = LEVELS[i];
      break;
    }
  }
  return current;
}

export const awardXp = mutation({
  args: {
    employeeId: v.id("employees"),
    amount: v.number(),
    reason: v.string(),
    source: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.insert("xpLog", {
      employeeId: args.employeeId,
      amount: args.amount,
      reason: args.reason,
      source: args.source,
      createdAt: now,
    });

    const emp = await ctx.db.get(args.employeeId);
    if (!emp) throw new Error("Employee not found");

    const newTotalXp = emp.xp + args.amount;
    const newLevelInfo = getLevelForXp(newTotalXp);
    const leveledUp = newLevelInfo.level > emp.level;

    await ctx.db.patch(args.employeeId, {
      xp: newTotalXp,
      level: newLevelInfo.level,
      levelTitle: newLevelInfo.title,
    });

    if (leveledUp) {
      await ctx.db.insert("notifications", {
        employeeId: args.employeeId,
        title: "Level Up!",
        message: `You reached Level ${newLevelInfo.level} — ${newLevelInfo.title}!`,
        type: "level_up",
        isRead: false,
        createdAt: now,
      });
    }

    return { newTotalXp, leveledUp, newLevel: newLevelInfo };
  },
});

export const updateStreak = mutation({
  args: {
    employeeId: v.id("employees"),
    submittedDate: v.string(),
  },
  handler: async (ctx, args) => {
    const emp = await ctx.db.get(args.employeeId);
    if (!emp) throw new Error("Employee not found");

    const now = Date.now();
    let newStreak = emp.currentStreak;

    if (emp.lastSubmissionDate) {
      const lastDate = new Date(emp.lastSubmissionDate);
      const submitDate = new Date(args.submittedDate);
      const diffDays = Math.round(
        (submitDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 1) {
        newStreak = emp.currentStreak + 1;
      } else if (diffDays > 1) {
        newStreak = 1;
      }
      // diffDays === 0 means same day, don't change streak
    } else {
      newStreak = 1;
    }

    const longestStreak = Math.max(emp.longestStreak, newStreak);

    await ctx.db.patch(args.employeeId, {
      currentStreak: newStreak,
      longestStreak,
      lastSubmissionDate: args.submittedDate,
    });

    // Streak milestone XP awards
    if (newStreak === 3 && emp.currentStreak < 3) {
      await ctx.db.insert("xpLog", {
        employeeId: args.employeeId,
        amount: 15,
        reason: "3-Day Streak",
        source: "streak",
        createdAt: now,
      });
      await ctx.db.insert("notifications", {
        employeeId: args.employeeId,
        title: "🔥 3-Day Streak!",
        message: "You've maintained a 3-day streak. +15 XP!",
        type: "streak",
        isRead: false,
        createdAt: now,
      });
    } else if (newStreak === 7 && emp.currentStreak < 7) {
      await ctx.db.insert("xpLog", {
        employeeId: args.employeeId,
        amount: 30,
        reason: "7-Day Streak",
        source: "streak",
        createdAt: now,
      });
      await ctx.db.insert("notifications", {
        employeeId: args.employeeId,
        title: "🔥🔥 7-Day Streak!",
        message: "Incredible! A full week streak. +30 XP!",
        type: "streak",
        isRead: false,
        createdAt: now,
      });
    } else if (newStreak === 30 && emp.currentStreak < 30) {
      await ctx.db.insert("xpLog", {
        employeeId: args.employeeId,
        amount: 100,
        reason: "30-Day Streak",
        source: "streak",
        createdAt: now,
      });
      await ctx.db.insert("notifications", {
        employeeId: args.employeeId,
        title: "💎 30-Day Streak!",
        message: "Legendary! A 30-day streak! +100 XP!",
        type: "streak",
        isRead: false,
        createdAt: now,
      });
    }

    // Update XP with streak bonus
    const empAfter = await ctx.db.get(args.employeeId);
    if (empAfter) {
      await ctx.db.patch(args.employeeId, {
        xp: empAfter.xp,
        level: empAfter.level,
        levelTitle: empAfter.levelTitle,
      });
    }

    return { newStreak, longestStreak };
  },
});

export const checkBadges = mutation({
  args: { employeeId: v.id("employees") },
  handler: async (ctx, args) => {
    const emp = await ctx.db.get(args.employeeId);
    if (!emp) throw new Error("Employee not found");

    const allBadges = await ctx.db.query("badges").collect();
    const earnedBadgeIds = new Set(
      (
        await ctx.db
          .query("earnedBadges")
          .withIndex("by_employee", (q) => q.eq("employeeId", args.employeeId))
          .collect()
      ).map((eb) => eb.badgeId)
    );

    const newBadges = [];
    const now = Date.now();

    for (const badge of allBadges) {
      if (earnedBadgeIds.has(badge._id)) continue;

      let earned = false;

      switch (badge.criteriaType) {
        case "total_entries":
          earned = emp.totalEntries >= badge.criteriaValue;
          break;
        case "current_streak":
          earned = emp.currentStreak >= badge.criteriaValue;
          break;
        case "longest_streak":
          earned = emp.longestStreak >= badge.criteriaValue;
          break;
        case "xp_total":
          earned = emp.xp >= badge.criteriaValue;
          break;
        case "knowledge_points":
          earned = emp.knowledgePoints >= badge.criteriaValue;
          break;
        case "level":
          earned = emp.level >= badge.criteriaValue;
          break;
      }

      if (earned) {
        await ctx.db.insert("earnedBadges", {
          employeeId: args.employeeId,
          badgeId: badge._id,
          isNew: true,
          earnedAt: now,
        });

        await ctx.db.insert("notifications", {
          employeeId: args.employeeId,
          title: `Badge: ${badge.name}`,
          message: `You earned the ${badge.icon} ${badge.name} badge!`,
          type: "badge",
          isRead: false,
          createdAt: now,
        });

        newBadges.push(badge);
      }
    }

    return newBadges;
  },
});

export const getEmployeeBadges = query({
  args: { employeeId: v.id("employees") },
  handler: async (ctx, args) => {
    const earned = await ctx.db
      .query("earnedBadges")
      .withIndex("by_employee", (q) => q.eq("employeeId", args.employeeId))
      .collect();

    const results = [];
    for (const eb of earned) {
      const badge = await ctx.db.get(eb.badgeId);
      results.push({ ...eb, badge });
    }

    return results;
  },
});

export const getAllBadges = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("badges")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

export const getNotifications = query({
  args: {
    employeeId: v.id("employees"),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notifications")
      .withIndex("by_employee", (q) => q.eq("employeeId", args.employeeId))
      .order("desc")
      .take(args.limit);
  },
});

export const markNotificationRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, { isRead: true });
  },
});

export const markBadgeSeen = mutation({
  args: { earnedBadgeId: v.id("earnedBadges") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.earnedBadgeId, { isNew: false });
  },
});
