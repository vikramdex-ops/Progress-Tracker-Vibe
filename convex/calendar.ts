import { v } from "convex/values";
import { query } from "./_generated/server";

export const getDay = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const day = await ctx.db
      .query("calendarDays")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .first();

    if (day) return day;

    // Fallback: check if it's a Sunday
    const date = new Date(args.date);
    const isSunday = date.getDay() === 0;

    return {
      _id: "fallback" as any,
      date: args.date,
      name: isSunday ? "Sunday" : "Working Day",
      type: isSunday ? ("weekend" as const) : ("working" as const),
      eodRequired: !isSunday,
    };
  },
});

export const getRange = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("calendarDays")
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), args.startDate),
          q.lte(q.field("date"), args.endDate)
        )
      )
      .collect();
  },
});
