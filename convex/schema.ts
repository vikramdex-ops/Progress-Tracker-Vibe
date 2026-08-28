import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Employees table
  employees: defineTable({
    name: v.string(),
    role: v.union(v.literal("employee"), v.literal("team_lead")),
    passwordHash: v.optional(v.string()),
    xp: v.number(),
    level: v.number(),
    levelTitle: v.string(),
    currentStreak: v.number(),
    longestStreak: v.number(),
    totalEntries: v.number(),
    knowledgePoints: v.number(),
    knowledgeStreak: v.number(),
    isActive: v.boolean(),
    lastSubmissionDate: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_name", ["name"])
    .index("by_role", ["role"]),

  // End of Day entries
  eod: defineTable({
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
    totalPlanned: v.number(),
    totalActual: v.number(),
    overallCompletion: v.number(),
    rating: v.optional(v.union(
      v.literal("excellent"),
      v.literal("good"),
      v.literal("satisfactory"),
      v.literal("needs_improvement"),
      v.literal("poor"),
    )),
    ratedBy: v.optional(v.id("employees")),
    ratedAt: v.optional(v.number()),
    ratedRemarks: v.optional(v.string()),
    isEdited: v.boolean(),
    editCount: v.number(),
    submittedAt: v.number(),
    xpAwarded: v.number(),
  }).index("by_employee_date", ["employeeId", "date"])
    .index("by_date", ["date"])
    .index("by_employee", ["employeeId"]),

  // Projects
  projects: defineTable({
    name: v.string(),
    code: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_name", ["name"]),

  // Badges definitions
  badges: defineTable({
    name: v.string(),
    icon: v.string(),
    description: v.string(),
    category: v.union(
      v.literal("submission"),
      v.literal("streak"),
      v.literal("productivity"),
      v.literal("knowledge"),
      v.literal("team"),
    ),
    criteriaType: v.string(),
    criteriaValue: v.number(),
    xpReward: v.number(),
    isActive: v.boolean(),
  }).index("by_category", ["category"]),

  // Earned badges
  earnedBadges: defineTable({
    employeeId: v.id("employees"),
    badgeId: v.id("badges"),
    isNew: v.boolean(),
    earnedAt: v.number(),
  }).index("by_employee", ["employeeId"])
    .index("by_employee_badge", ["employeeId", "badgeId"]),

  // XP transactions log
  xpLog: defineTable({
    employeeId: v.id("employees"),
    amount: v.number(),
    reason: v.string(),
    source: v.string(),
    createdAt: v.number(),
  }).index("by_employee", ["employeeId"])
    .index("by_employee_date", ["employeeId", "createdAt"]),

  // Notifications
  notifications: defineTable({
    employeeId: v.id("employees"),
    title: v.string(),
    message: v.string(),
    type: v.union(
      v.literal("badge"),
      v.literal("streak"),
      v.literal("level_up"),
      v.literal("shoutout"),
      v.literal("challenge"),
      v.literal("system"),
    ),
    isRead: v.boolean(),
    createdAt: v.number(),
  }).index("by_employee", ["employeeId", "createdAt"]),

  // Knowledge items
  knowledge: defineTable({
    title: v.string(),
    content: v.string(),
    category: v.union(
      v.literal("piping_design"),
      v.literal("isometrics"),
      v.literal("code_compliance"),
      v.literal("materials"),
      v.literal("process"),
      v.literal("general"),
    ),
    difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
    options: v.optional(v.array(v.string())),
    correctAnswer: v.optional(v.number()),
    explanation: v.optional(v.string()),
    source: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_category", ["category"]),

  // Daily knowledge assignments
  knowledgeAssignments: defineTable({
    employeeId: v.id("employees"),
    knowledgeId: v.id("knowledge"),
    date: v.string(),
    isAnswered: v.boolean(),
    isCorrect: v.optional(v.boolean()),
    awardedXp: v.number(),
  }).index("by_employee_date", ["employeeId", "date"])
    .index("by_date", ["date"]),

  // Calendar days
  calendarDays: defineTable({
    date: v.string(),
    name: v.string(),
    type: v.union(
      v.literal("working"),
      v.literal("holiday"),
      v.literal("weekend"),
      v.literal("special"),
    ),
    eodRequired: v.boolean(),
  }).index("by_date", ["date"]),

  // Daily challenges
  dailyChallenges: defineTable({
    date: v.string(),
    title: v.string(),
    description: v.string(),
    challengeType: v.union(
      v.literal("completion_100"),
      v.literal("early_bird"),
      v.literal("high_output"),
      v.literal("streak_bonus"),
      v.literal("knowledge_bonus"),
    ),
    xpReward: v.number(),
    isActive: v.boolean(),
  }).index("by_date", ["date"]),

  // Weekly challenges
  weeklyChallenges: defineTable({
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
    currentProgress: v.number(),
    totalParticipants: v.number(),
    isActive: v.boolean(),
    isCompleted: v.boolean(),
    createdBy: v.id("employees"),
    createdAt: v.number(),
  }).index("by_week", ["weekStart"]),

  // Challenge completions (tracking who completed what)
  challengeCompletions: defineTable({
    challengeId: v.id("weeklyChallenges"),
    employeeId: v.id("employees"),
    completedAt: v.number(),
  }).index("by_challenge", ["challengeId"])
    .index("by_employee", ["employeeId"]),

  // Activity log
  activityLog: defineTable({
    employeeId: v.id("employees"),
    action: v.string(),
    details: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_created", ["createdAt"])
    .index("by_employee", ["employeeId"]),

  // Password reset requests
  passwordResets: defineTable({
    employeeId: v.id("employees"),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("declined")),
    processedBy: v.optional(v.id("employees")),
    processedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_status", ["status"]),

  // Shoutouts
  shoutouts: defineTable({
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
    xpAwarded: v.number(),
    weekOf: v.string(),
    createdAt: v.number(),
  }).index("by_to_employee", ["toEmployeeId"])
    .index("by_week", ["weekOf"]),

  // Weekly pick (team lead's pick)
  weeklyPicks: defineTable({
    employeeId: v.id("employees"),
    givenBy: v.id("employees"),
    reason: v.string(),
    weekOf: v.string(),
    xpAwarded: v.number(),
    createdAt: v.number(),
  }).index("by_week", ["weekOf"]),

  // Seed tracking
  seedStatus: defineTable({
    key: v.string(),
    isInitialized: v.boolean(),
    initializedAt: v.optional(v.number()),
  }),
});
