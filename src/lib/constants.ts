export const PROJECTS = ["ACF_MB", "DM", "DE-OIL", "PW DE-OIL", "FST"];

export const RATING_OPTIONS = [
  { value: "M", label: "Meets Expectation" },
  { value: "S", label: "Satisfactory" },
  { value: "N", label: "Needs Improvement" },
  { value: "E", label: "Excellent" },
] as const;

export const RATING_COLORS: Record<string, string> = {
  M: "bg-[var(--color-surface-brand)] text-[var(--color-brand)] border-[var(--color-brand-200)] dark:border-[var(--color-brand-800)]",
  S: "bg-[var(--color-surface-completion)] text-[var(--color-completion)] border-[var(--color-emerald-200)] dark:border-[var(--color-emerald-800)]",
  N: "bg-[var(--color-surface-alert)] text-[var(--color-alert)] border-[var(--color-red-200)] dark:border-[var(--color-red-800)]",
  E: "bg-[var(--color-surface-progress)] text-[var(--color-progress)] border-[var(--color-amber-200)] dark:border-[var(--color-amber-800)]",
};

export const COMPLEXITY_COLORS: Record<string, string> = {
  Low: "bg-[var(--color-surface-completion)] text-[var(--color-completion)] border-[var(--color-emerald-200)] dark:border-[var(--color-emerald-800)]",
  Moderate: "bg-[var(--color-surface-progress)] text-[var(--color-progress)] border-[var(--color-amber-200)] dark:border-[var(--color-amber-800)]",
  High: "bg-[var(--color-surface-alert)] text-[var(--color-alert)] border-[var(--color-red-200)] dark:border-[var(--color-red-800)]",
};

export const TICKER_MESSAGES = [
  "Daily EOD submissions deadline: 6:00 PM IST",
  "Keep your momentum going — submit daily to extend your streak",
  "Early Bird Bonus: Submit before 5:00 PM for +5 XP",
  "Hit 100% of planned quantity to unlock bonus XP and badges",
  "Answer AI technical knowledge challenges to test your piping domain mastery",
  "Planned leave? Mark in advance to safeguard your streak count",
  "Team leaders review and rate quality entries every evening",
];
