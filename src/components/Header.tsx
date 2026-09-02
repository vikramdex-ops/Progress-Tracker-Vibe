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
          {/* Brand - flat brand-500 icon, no gradient */}
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-lg bg-[var(--color-brand)] flex items-center justify-center shadow-elevated">
              <svg viewBox="0 0 30 30" className="w-5 h-5">
                <path d="M3 15 H12 V6 H24 V15 H27 M12 15 V24" stroke="white" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="15" cy="15" r="2" fill="white" />
              </svg>
            </div>
            <div className="hidden sm:block">
              <span className="text-[15px] lg:text-base font-bold text-[var(--color-text-primary)] tracking-tight">
                Progress<span className="text-[var(--color-brand)]">Tracker</span>
              </span>
              <span className="text-[9px] lg:text-[10px] text-[var(--color-text-tertiary)] block font-mono tracking-[0.2em] uppercase leading-none mt-0.5">
                Daily EOD · Team Vikram
              </span>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Clock */}
            <div className="hidden md:flex items-center px-3 py-1.5 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
              <span className="text-xs font-mono text-[var(--color-text-tertiary)] tabular-nums">{clock}</span>
            </div>

            {/* Theme toggle */}
            <button
              onClick={() => setDark(!dark)}
              className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-[var(--color-surface-raised)] transition-all duration-[var(--duration-fast)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
              title={dark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {dark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
            </button>

            {/* User info - flat brand avatar */}
            <div className="flex items-center gap-2.5 pl-2 ml-1 border-l border-[var(--color-border)]">
              <div className="w-8 h-8 rounded-full bg-[var(--color-brand)] flex items-center justify-center text-white text-xs font-bold shadow-elevated">
                {user?.name?.[0] || "?"}
              </div>
              <span className="text-sm font-medium text-[var(--color-text-primary)] hidden sm:block">{user?.name}</span>
            </div>

            {/* Logout */}
            <button
              onClick={logout}
              className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-[var(--color-surface-alert)] transition-all duration-[var(--duration-fast)] text-[var(--color-text-tertiary)] hover:text-[var(--color-alert)] ml-1"
              title="Sign out"
            >
              <LogOut className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      </div>

      {/* Ticker - flat progress accent, no gradient */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-raised)] overflow-hidden h-9 sm:h-10 lg:h-[44px] flex items-center">
        <div className="flex-shrink-0 bg-[var(--color-progress)] text-white text-[9px] lg:text-[10px] font-bold tracking-[0.15em] px-3 sm:px-4 h-full flex items-center z-10 shadow-elevated">
          LIVE FEED
        </div>
        <div className="overflow-hidden flex-1">
          <div className="ticker-track flex gap-12 whitespace-nowrap px-5">
            {doubled.map((msg, i) => (
              <span key={i} className="text-[11px] lg:text-xs text-[var(--color-text-tertiary)] flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-completion)] flex-shrink-0" />
                {msg}
              </span>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
