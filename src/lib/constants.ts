export const PROJECTS = ["ACF_MB", "DM", "DE-OIL", "PW DE-OIL", "FST"];

export const RATING_OPTIONS = [
  { value: "M", label: "Meets Expectation" },
  { value: "S", label: "Satisfactory" },
  { value: "N", label: "Needs Improvement" },
  { value: "E", label: "Excellent" },
] as const;

export const RATING_COLORS: Record<string, string> = {
  M: "bg-[var(--color-surface-brand)] text-[var(--color-brand)] border-[var(--color-brand-200)]",
  S: "bg-[var(--color-surface-completion)] text-[var(--color-emerald-700)] border-[var(--color-emerald-200)]",
  N: "bg-[var(--color-surface-alert)] text-[var(--color-red-700)] border-[var(--color-red-200)]",
  E: "bg-[var(--color-surface-progress)] text-[var(--color-amber-700)] border-[var(--color-amber-200)]",
};

export const COMPLEXITY_COLORS: Record<string, string> = {
  Low: "bg-[var(--color-surface-completion)] text-[var(--color-emerald-700)] border-[var(--color-emerald-200)]",
  Moderate: "bg-[var(--color-surface-progress)] text-[var(--color-amber-700)] border-[var(--color-amber-200)]",
  High: "bg-[var(--color-surface-alert)] text-[var(--color-red-700)] border-[var(--color-red-200)]",
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
