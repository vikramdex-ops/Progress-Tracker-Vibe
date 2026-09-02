import { useEffect, useState } from "react";
import { X, Sparkles, Target, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Calm Glass onboarding — first-run empty state + progressive hint
export function OnboardingHint({ storageKey, children }: { storageKey: string; children: React.ReactNode }) {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(storageKey) === "1");

  if (dismissed) return null;

  return (
    <Card className="border-[var(--color-brand-200)] bg-[var(--color-surface-brand)] p-5 relative">
      <button
        onClick={() => {
          localStorage.setItem(storageKey, "1");
          setDismissed(true);
        }}
        className="absolute right-3 top-3 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
      {children}
    </Card>
  );
}

export function FirstEodOnboarding() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem("onboard-eod") === "1");
  useEffect(() => {
    // auto-show only once per user
  }, []);
  if (dismissed) return null;
  return (
    <OnboardingHint storageKey="onboard-eod">
      <div className="flex gap-4">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-brand)] flex items-center justify-center flex-shrink-0">
          <Target className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-[var(--color-text-primary)]">Welcome to Progress Tracker</h4>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1 leading-relaxed">
            Submit your daily EOD to earn XP, build streaks, and appear on the live feed. Each entry awards <strong>+10 XP</strong>, early birds get <strong>+5 XP</strong> before 5 PM, and 100% completion earns <strong>+20 XP bonus</strong>.
          </p>
          <div className="flex gap-2 mt-3">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)]">
              <Sparkles className="w-3 h-3 text-[var(--color-brand)]" /> XP & Levels
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)]">
              <Trophy className="w-3 h-3 text-[var(--color-progress)]" /> Streaks
            </span>
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="mt-3"
            onClick={() => {
              localStorage.setItem("onboard-eod", "1");
              setDismissed(true);
            }}
          >
            Got it, let’s go
          </Button>
        </div>
      </div>
    </OnboardingHint>
  );
}
