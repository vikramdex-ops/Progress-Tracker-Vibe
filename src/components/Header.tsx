import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { TICKER_MESSAGES } from "@/lib/constants";
import { Sun, Moon, LogOut } from "lucide-react";

export default function Header() {
  const { user, logout } = useAuth();
  const [clock, setClock] = useState("");
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");

  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleString("en-IN", {
          weekday: "short",
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const doubled = [...TICKER_MESSAGES, ...TICKER_MESSAGES];

  return (
    <header className="sticky top-0 z-30">
      {/* Main header bar - glass variant per §5.1 */}
      <div className="glass border-b border-[var(--color-border)]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 h-14 sm:h-16 lg:h-[72px] flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--color-brand)] flex items-center justify-center shadow-sm text-white">
              <svg viewBox="0 0 30 30" className="w-5 h-5">
                <path d="M3 15 H12 V6 H24 V15 H27 M12 15 V24" stroke="white" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="15" cy="15" r="2" fill="white" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[15px] lg:text-base font-bold text-[var(--color-text-primary)] tracking-tight">
                  Progress <span className="text-[var(--color-brand)]">Tracker</span>
                </span>
                {user?.role && (
                  <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text-tertiary)]">
                    {user.role === "team_lead" ? "Team Lead" : "Member"}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-[var(--color-text-tertiary)] block font-mono tracking-wider uppercase leading-none mt-0.5">
                Dexterity Design Services
              </span>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2.5">
            {/* Clock */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-secondary)] tabular-nums shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-completion)] animate-pulse-subtle" />
              <span>{clock}</span>
            </div>

            {/* Theme toggle */}
            <button
              onClick={() => setDark(!dark)}
              className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-[var(--color-surface-raised)] border border-transparent hover:border-[var(--color-border)] transition-all duration-[var(--duration-fast)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer"
              aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
              title={dark ? "Switch to light theme" : "Switch to dark theme"}
            >
              {dark ? <Sun className="w-[17px] h-[17px] transition-transform duration-300 rotate-0 hover:rotate-45" /> : <Moon className="w-[17px] h-[17px] transition-transform duration-300 rotate-0 hover:-rotate-12" />}
            </button>

            {/* User profile */}
            <div className="flex items-center gap-2.5 pl-2.5 ml-1 border-l border-[var(--color-border)]">
              <div className="w-8 h-8 rounded-full bg-[var(--color-brand)] flex items-center justify-center text-white text-xs font-bold shadow-xs">
                {user?.name?.[0] || "?"}
              </div>
              <div className="hidden sm:block text-left leading-tight">
                <span className="text-xs font-semibold text-[var(--color-text-primary)] block truncate max-w-[130px]">
                  {user?.name}
                </span>
                <span className="text-[10px] text-[var(--color-text-tertiary)] block truncate">
                  {user?.role === "team_lead" ? "Lead Reviewer" : "Piping Engineer"}
                </span>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={logout}
              className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-[var(--color-surface-alert)] hover:border hover:border-[var(--color-red-200)] transition-all duration-[var(--duration-fast)] text-[var(--color-text-tertiary)] hover:text-[var(--color-alert)] ml-1 cursor-pointer"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="w-[17px] h-[17px]" />
            </button>
          </div>
        </div>
      </div>

      {/* Ticker bar with soft gradient mask */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-raised)] overflow-hidden h-9 sm:h-10 flex items-center relative">
        <div className="flex-shrink-0 bg-[var(--color-progress)] text-white text-[9px] lg:text-[10px] font-bold tracking-[0.15em] px-3 sm:px-4 h-full flex items-center gap-1.5 z-10 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span>LIVE FEED</span>
        </div>
        <div className="overflow-hidden flex-1 relative [mask-image:linear-gradient(to_right,transparent,black_20px,black_calc(100%-20px),transparent)]">
          <div className="ticker-track flex gap-12 whitespace-nowrap px-5">
            {doubled.map((msg, i) => (
              <span key={i} className="text-[11px] lg:text-xs text-[var(--color-text-secondary)] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-completion)] flex-shrink-0 animate-pulse-subtle" />
                {msg}
              </span>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
