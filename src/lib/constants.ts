export const PROJECTS = ["ACF_MB", "DM", "DE-OIL", "PW DE-OIL", "FST"];

export const RATING_OPTIONS = [
  { value: "M", label: "Meets Expectation" },
  { value: "S", label: "Satisfactory" },
  { value: "N", label: "Needs Improvement" },
  { value: "E", label: "Excellent" },
] as const;

export const RATING_COLORS: Record<string, string> = {
  M: "bg-slate-100 text-slate-600",
  S: "bg-emerald-50 text-emerald-600",
  N: "bg-red-50 text-red-500",
  E: "bg-amber-50 text-amber-600",
};

export const COMPLEXITY_COLORS: Record<string, string> = {
  Low: "bg-emerald-50 text-emerald-600 border-emerald-200",
  Moderate: "bg-amber-50 text-amber-600 border-amber-200",
  High: "bg-red-50 text-red-500 border-red-200",
};

export const TICKER_MESSAGES = [
  "📋 EOD submissions due by 6:00 PM IST daily",
  "🔥 Maintain your streak — submit every working day",
  "⭐ Earn XP for early submissions and 100% completion",
  "🏆 Weekly challenge active — check your dashboard",
  "💡 Knowledge questions earn you bonus XP",
  "🎯 Complete 100% of planned quantity for bonus XP",
  "⚡ Early bird bonus: submit before 5 PM for +5 XP",
  "🤝 Mark leaves early so your streak stays safe",
];
