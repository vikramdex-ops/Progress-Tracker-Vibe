import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTestMode } from "@/lib/test-mode";
import { useAuth } from "@/lib/auth";
import { resetTestData } from "@/lib/test-data";
import { cn } from "@/lib/utils";
import {
  FlaskConical,
  ChevronDown,
  ChevronUp,
  Repeat,
  RotateCcw,
  LogOut,
  LayoutDashboard,
  Users,
  FileEdit,
  BookOpen,
  Gauge,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────
 * TestModeBar — floating HUD for the demo/test mode.
 *
 * Lets a tester jump between any team-lead / employee account,
 * deep-link into every screen + tab, reseed the demo dataset,
 * and exit back to the real login — without ever touching the
 * production backend. Rendered inside <BrowserRouter/> (App.tsx).
 * ───────────────────────────────────────────────────────── */

const QUICK_SCREENS: {
  label: string;
  path: string;
  roles: ("employee" | "team_lead")[];
  icon: React.ReactNode;
}[] = [
  { label: "My Dashboard", path: "/dashboard?tab=overview", roles: ["employee", "team_lead"], icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
  { label: "EOD Entry Form", path: "/dashboard?tab=entries", roles: ["employee", "team_lead"], icon: <FileEdit className="w-3.5 h-3.5" /> },
  { label: "Team Overview", path: "/team?tab=team", roles: ["team_lead"], icon: <Users className="w-3.5 h-3.5" /> },
  { label: "Lead · My EOD", path: "/team?tab=myeod", roles: ["team_lead"], icon: <Gauge className="w-3.5 h-3.5" /> },
  { label: "Engineering Quiz", path: "/team?tab=myquiz", roles: ["team_lead"], icon: <BookOpen className="w-3.5 h-3.5" /> },
];

export default function TestModeBar() {
  const testMode = useTestMode();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!testMode?.active || !user) return null;

  const { currentEmployee, employees, switchEmployee, disable, version } = testMode;

  const handleSwitch = (id: string) => {
    const emp = switchEmployee(id);
    if (emp) navigate(emp.role === "team_lead" ? "/team" : "/dashboard", { replace: true });
  };

  const handleReset = () => {
    resetTestData();
    window.location.reload();
  };

  const handleExit = () => {
    disable?.();
    navigate("/login", { replace: true });
  };

  const leads = employees.filter((e) => e.role === "team_lead");
  const members = employees.filter((e) => e.role === "employee");

  return (
    <div className="fixed bottom-4 left-4 z-[70] font-sans">
      {open ? (
        <div className="w-72 max-h-[80vh] overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-default)] shadow-2xl ring-1 ring-[var(--color-progress)]/20 animate-fade-in">
          {/* Header */}
          <div className="sticky top-0 flex items-center justify-between gap-2 px-4 py-3 bg-[var(--color-progress)] text-white rounded-t-2xl">
            <div className="flex items-center gap-2 min-w-0">
              <FlaskConical className="w-4 h-4 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-widest leading-none">Test Mode</p>
                <p className="text-[10px] opacity-80 truncate mt-0.5">
                  {currentEmployee?.name} · {currentEmployee?.role === "team_lead" ? "Team Lead" : "Employee"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-lg hover:bg-white/15 cursor-pointer transition-colors"
              aria-label="Collapse test mode panel"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 space-y-4" key={version}>
            {/* Account switcher */}
            <section>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-tertiary)] mb-1.5 flex items-center gap-1">
                <Repeat className="w-3 h-3" /> Switch account
              </p>
              <div className="space-y-1.5">
                {leads.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => handleSwitch(emp.id)}
                    className={cn(
                      "w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-all border",
                      currentEmployee?.id === emp.id
                        ? "bg-[var(--color-surface-progress)] border-[var(--color-progress)] text-[var(--color-progress)] font-semibold"
                        : "bg-[var(--color-surface-raised)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-default)]"
                    )}
                  >
                    <span className="truncate">{emp.name}</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider opacity-70 flex-shrink-0">Lead</span>
                  </button>
                ))}
                {members.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => handleSwitch(emp.id)}
                    className={cn(
                      "w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-all border",
                      currentEmployee?.id === emp.id
                        ? "bg-[var(--color-surface-brand)] border-[var(--color-brand)] text-[var(--color-brand)] font-semibold"
                        : "bg-[var(--color-surface-raised)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-default)]"
                    )}
                  >
                    <span className="truncate">{emp.name}</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider opacity-70 flex-shrink-0">{emp.xp} XP</span>
                  </button>
                ))}
              </div>
            </section>
            {/* Quick screen nav */}
            <section>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-tertiary)] mb-1.5">
                All screens
              </p>
              <div className="space-y-1.5">
                {QUICK_SCREENS.filter((s) => s.roles.includes(currentEmployee?.role ?? "employee")).map((s) => (
                  <button
                    key={s.path}
                    onClick={() => navigate(s.path)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-default)] cursor-pointer transition-all"
                  >
                    <span className="text-[var(--color-brand)]">{s.icon}</span>
                    <span className="truncate">{s.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Actions */}
            <section className="space-y-1.5">
              <button
                onClick={handleReset}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer transition-all"
                title="Wipe and reseed the demo dataset"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset demo data
              </button>
              <button
                onClick={handleExit}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs bg-[var(--color-surface-alert)] border border-[var(--color-red-200)] dark:border-[var(--color-red-800)] text-[var(--color-alert)] font-semibold hover:brightness-95 cursor-pointer transition-all"
              >
                <LogOut className="w-3.5 h-3.5" /> Exit test mode
              </button>
            </section>

            <p className="text-[9px] leading-relaxed text-[var(--color-text-tertiary)]">
              All data is in-memory demo data — nothing touches Airtable or the production API.
            </p>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-[var(--color-progress)] text-white text-[11px] font-bold uppercase tracking-wider shadow-lg hover:brightness-105 cursor-pointer transition-all"
          aria-label="Open test mode panel"
        >
          <FlaskConical className="w-3.5 h-3.5" />
          Test Mode
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}



