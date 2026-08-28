import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { TICKER_MESSAGES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Zap, LogOut, Sun, Moon, Bell } from "lucide-react";

export default function Header() {
  const { user, logout } = useAuth();
  const [clock, setClock] = useState("");
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");
  const [showNotif, setShowNotif] = useState(false);

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
      {/* Main header bar */}
      <div className="glass border-b border-[var(--color-border)]/50">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/20">
              <svg viewBox="0 0 30 30" className="w-5 h-5">
                <path d="M3 15 H12 V6 H24 V15 H27 M12 15 V24" stroke="white" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="15" cy="15" r="2" fill="white" />
              </svg>
            </div>
            <div className="hidden sm:block">
              <span className="text-[15px] font-bold text-[var(--color-text-primary)] tracking-tight">
                Progress<span className="gradient-text">Tracker</span>
              </span>
              <span className="text-[9px] text-[var(--color-text-muted)] block font-mono tracking-[0.2em] uppercase leading-none mt-0.5">
                Daily EOD · Team Vikram
              </span>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Clock */}
            <div className="hidden md:flex items-center px-3 py-1.5 rounded-lg bg-[var(--color-surface-hover)] border border-[var(--color-border)]/50">
              <span className="text-xs font-mono text-[var(--color-text-muted)] tabular-nums">{clock}</span>
            </div>

            {/* Theme toggle */}
            <button
              onClick={() => setDark(!dark)}
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[var(--color-surface-hover)] transition-all duration-200 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              title={dark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {dark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
            </button>

            {/* User info */}
            <div className="flex items-center gap-2.5 pl-2 ml-1 border-l border-[var(--color-border)]">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                {user?.name?.[0] || "?"}
              </div>
              <span className="text-sm font-medium text-[var(--color-text-primary)] hidden sm:block">{user?.name}</span>
            </div>

            {/* Logout */}
            <button
              onClick={logout}
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-200 text-[var(--color-text-muted)] hover:text-red-500 ml-1"
              title="Sign out"
            >
              <LogOut className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      </div>

      {/* Ticker */}
      <div className="border-b border-[var(--color-border)]/30 bg-[var(--color-surface)]/60 overflow-hidden h-9 flex items-center">
        <div className="flex-shrink-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-bold tracking-[0.15em] px-4 h-full flex items-center z-10 shadow-sm">
          LIVE FEED
        </div>
        <div className="overflow-hidden flex-1">
          <div className="ticker-track flex gap-12 whitespace-nowrap px-5">
            {doubled.map((msg, i) => (
              <span key={i} className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0 shadow-sm shadow-emerald-400/30" />
                {msg}
              </span>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
