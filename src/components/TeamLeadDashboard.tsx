import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { entriesApi, employeesApi, leavesApi, passwordResetsApi, notificationsApi } from "@/lib/api";
import { PROJECTS, RATING_OPTIONS, COMPLEXITY_COLORS } from "@/lib/constants";
import { getFactForDate } from "@/lib/engineering-facts";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { EodEntry, Employee } from "@/lib/types";
import {
  Users, AlertTriangle, Flame, Star, Target, TrendingUp,
  Zap, Clock, CheckCircle2, X, BarChart3, BookOpen, Filter, Lock,
} from "lucide-react";

export default function TeamLeadDashboard() {
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [entries, setEntries] = useState<EodEntry[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [fSearch, setFSearch] = useState("");
  const [fUser, setFUser] = useState("");
  const [fProject, setFProject] = useState("");
  const [fDate, setFDate] = useState("");
  const [fRange, setFRange] = useState("all");

  const [lbTab, setLbTab] = useState<"streak" | "completion" | "xp" | "entries">("streak");
  const [leaveModal, setLeaveModal] = useState<string | null>(null);
  const [leaveReason, setLeaveReason] = useState("");
  const [passwordResets, setPasswordResets] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [resetModal, setResetModal] = useState<any>(null);
  const [newTempPw, setNewTempPw] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [empRes, entRes, leaveRes, resetRes, notifRes] = await Promise.all([
        employeesApi.list() as any,
        entriesApi.list() as any,
        leavesApi.list({ date: today }) as any,
        passwordResetsApi.list() as any,
        notificationsApi.list(user?.name) as any,
      ]);
      setEmployees(Array.isArray(empRes) ? empRes : []);
      setEntries(Array.isArray(entRes) ? entRes.sort((a: any, b: any) => b.Date?.localeCompare(a.Date)) : []);
      setLeaves(Array.isArray(leaveRes) ? leaveRes : []);
      setPasswordResets(Array.isArray(resetRes) ? resetRes : []);
      setNotifications(Array.isArray(notifRes) ? notifRes : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [today, user?.name]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const todaysEntries = entries.filter((e) => e.Date === today);
  const teamNames = employees.map((e) => e.name);
  const onLeaveToday = leaves.map((l: any) => l.EmployeeName);
  const missingToday = teamNames.filter(
    (n) => !todaysEntries.find((e) => e.EmployeeName === n) && !onLeaveToday.includes(n)
  );
  const avgComp =
    todaysEntries.length > 0
      ? Math.round(todaysEntries.reduce((s, e) => s + (e.CompletionPct || 0), 0) / todaysEntries.length)
      : 0;
  const pendingRatings = entries.filter((e) => !e.Rating && e.FilledAt).length;

  // Streaks
  const streakMap: Record<string, number> = {};
  teamNames.forEach((name) => {
    const own = entries
      .filter((e) => e.EmployeeName === name && e.FilledAt)
      .sort((a, b) => b.Date.localeCompare(a.Date));
    let streak = 0;
    const todayDate = new Date(today);
    for (let i = 0; i < 60; i++) {
      const d = new Date(todayDate);
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split("T")[0];
      if (d.getDay() === 0) continue;
      if (leaves.some((l: any) => l.EmployeeName === name && l.Date === ds)) continue;
      if (own.find((e) => e.Date === ds)) streak++;
      else break;
    }
    streakMap[name] = streak;
  });

  const needsAttention = teamNames
    .map((n) => {
      const empsEntries = entries.filter((e) => e.EmployeeName === n);
      const missedCount = Math.max(0, 30 - empsEntries.length);
      return { name: n, missed: missedCount, streak: streakMap[n] || 0 };
    })
    .sort((a, b) => a.streak - b.streak)
    .slice(0, 5);

  const filteredEntries = entries.filter((e) => {
    if (!e.FilledAt) return false;
    if (
      fSearch &&
      !e.Project?.toLowerCase().includes(fSearch.toLowerCase()) &&
      !e.Task?.toLowerCase().includes(fSearch.toLowerCase()) &&
      !e.Description?.toLowerCase().includes(fSearch.toLowerCase())
    )
      return false;
    if (fUser && e.EmployeeName !== fUser) return false;
    if (fProject && e.Project !== fProject) return false;
    if (fDate && e.Date !== fDate) return false;
    if (fRange !== "all") {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - parseInt(fRange));
      if (new Date(e.Date) < cutoff) return false;
    }
    return true;
  });

  const handleRate = async (entryId: string, rating: string) => {
    try {
      await entriesApi.rate(entryId, rating);
      await loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleApproveReset = async () => {
    if (!resetModal || !newTempPw) return;
    try {
      await passwordResetsApi.approve(resetModal.id, newTempPw);
      setResetModal(null);
      setNewTempPw("");
      await loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const pendingResets = passwordResets.filter((r) => r.status === "pending");
  const unreadNotifs = notifications.filter((n) => !n.Read);

  const handleMarkLeave = async (empName: string) => {
    try {
      await leavesApi.create({ EmployeeName: empName, Date: today, Reason: leaveReason, MarkedBy: user?.name });
      setLeaveModal(null);
      setLeaveReason("");
      await loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const sortedByStreak = [...teamNames].sort((a, b) => (streakMap[b] || 0) - (streakMap[a] || 0));
  const todayFact = getFactForDate(today);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
          <span className="text-sm text-[var(--color-text-muted)]">Loading team data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-8 space-y-7">
      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger-children">
        {[
          { icon: <CheckCircle2 className="w-5 h-5" />, label: "Filled Today", value: `${todaysEntries.length}/${teamNames.length || "—"}`, color: "emerald", gradient: "from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/10" },
          { icon: <AlertTriangle className="w-5 h-5" />, label: "Missing Today", value: `${missingToday.length}`, color: "red", gradient: "from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/10" },
          { icon: <BarChart3 className="w-5 h-5" />, label: "Avg Completion", value: `${avgComp}%`, color: "blue", gradient: "from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/10" },
          { icon: <Star className="w-5 h-5" />, label: "Awaiting Rating", value: `${pendingRatings}`, color: "amber", gradient: "from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/10" },
        ].map((stat) => (
          <Card key={stat.label} className={cn("bg-gradient-to-br card-hover p-4", stat.gradient)}>
            <div className="flex items-center gap-4">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0",
                stat.color === "emerald" && "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
                stat.color === "red" && "bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400",
                stat.color === "blue" && "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
                stat.color === "amber" && "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
              )}>
                {stat.icon}
              </div>
              <div className="min-w-0">
                <div className={cn("text-lg font-bold tabular-nums leading-tight", stat.color === "red" ? "text-red-500" : "text-[var(--color-text-primary)]")}>{stat.value}</div>
                <div className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider leading-tight mt-0.5">{stat.label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* ── Password Reset Requests ── */}
      {pendingResets.length > 0 && (
        <Card className="border-blue-200/50 dark:border-blue-800/30 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 dark:from-blue-950/10 dark:to-indigo-950/5 animate-slide-down">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-blue-500 flex items-center gap-2">
                <Lock className="w-4 h-4" /> Password Reset Requests
              </h3>
              <Badge variant="outline" className="border-blue-300 text-blue-500">{pendingResets.length} pending</Badge>
            </div>
            <div className="space-y-2">
              {pendingResets.map((r) => (
                <div key={r.id} className="flex items-center justify-between bg-[var(--color-surface)] border border-blue-200/30 dark:border-blue-800/20 rounded-xl px-4 py-3">
                  <div>
                    <span className="text-sm font-semibold text-[var(--color-text-primary)]">{r.employeeName}</span>
                    <span className="text-xs text-[var(--color-text-muted)] ml-2">({r.email})</span>
                    <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">Requested {r.requestedAt ? new Date(r.requestedAt).toLocaleString() : ""}</div>
                  </div>
                  <Button size="sm" className="bg-blue-500 hover:bg-blue-600" onClick={() => { setResetModal(r); setNewTempPw(""); }}>
                    Reset Password
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Reset Password Modal ── */}
      {resetModal && (
        <Card className="border-blue-200/50 dark:border-blue-800/30 animate-slide-down">
          <CardContent className="p-5 flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block">
                Set new temporary password for {resetModal.employeeName}
              </label>
              <Input
                value={newTempPw}
                onChange={(e) => setNewTempPw(e.target.value)}
                placeholder="New temp password (min 4 chars)"
              />
            </div>
            <Button onClick={handleApproveReset} className="bg-blue-500 hover:bg-blue-600">Set & Notify</Button>
            <Button variant="ghost" onClick={() => { setResetModal(null); setNewTempPw(""); }}>
              <X className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Missing Today Alert ── */}
      {missingToday.length > 0 && (
        <Card className="border-red-200/50 dark:border-red-800/30 bg-gradient-to-r from-red-50/50 to-rose-50/30 dark:from-red-950/10 dark:to-rose-950/5 animate-slide-down">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-red-500 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Missing Today
              </h3>
              <Badge variant="destructive">{missingToday.length} pending</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {missingToday.map((n) => (
                <div
                  key={n}
                  className="flex items-center gap-2 bg-[var(--color-surface)] border border-red-200/50 dark:border-red-800/20 rounded-full px-3.5 py-2 shadow-sm"
                >
                  <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-500 text-[10px] font-bold">
                    {n[0]}
                  </div>
                  <span className="text-sm font-medium text-[var(--color-text-secondary)]">{n}</span>
                  <button
                    onClick={() => setLeaveModal(n)}
                    className="text-[10px] font-semibold text-[var(--color-text-muted)] hover:text-orange-500 ml-1 transition-colors"
                  >
                    mark leave
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Leave Modal ── */}
      {leaveModal && (
        <Card className="border-orange-200/50 dark:border-orange-800/30 animate-slide-down">
          <CardContent className="p-5 flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block">
                Mark {leaveModal} as on leave for today
              </label>
              <Input value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} placeholder="Reason (optional)" />
            </div>
            <Button onClick={() => handleMarkLeave(leaveModal)} className="bg-orange-500 hover:bg-orange-600">Confirm</Button>
            <Button variant="ghost" onClick={() => { setLeaveModal(null); setLeaveReason(""); }}>
              <X className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Compact Widgets Row ── */}
      <div className="grid md:grid-cols-3 gap-4 stagger-children">
        {/* Streak Leaderboard */}
        <Card className="card-hover">
          <CardHeader className="mb-3"><CardTitle className="flex items-center gap-1.5">🔥 Streak Leaderboard</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {sortedByStreak.map((name, i) => (
              <div key={name} className="flex items-center justify-between py-2 px-1 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors">
                <div className="flex items-center gap-2.5">
                  <span className={cn(
                    "text-[10px] font-bold w-5 text-center",
                    i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-orange-400" : "text-[var(--color-text-muted)]"
                  )}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-[10px] font-bold shadow-sm">
                    {name[0]}
                  </div>
                  <span className="text-sm font-medium text-[var(--color-text-secondary)]">{name.split(" ")[0]}</span>
                </div>
                <span className={cn("text-sm font-bold font-mono tabular-nums", streakMap[name] > 0 ? "text-amber-500" : "text-[var(--color-text-muted)]")}>
                  {streakMap[name] || 0} {streakMap[name] > 0 && "🔥"}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Needs Attention */}
        <Card className="card-hover border-red-200/30 dark:border-red-800/20">
          <CardHeader className="mb-3"><CardTitle className="flex items-center gap-1.5">⚠️ Needs Attention</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {needsAttention.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)] py-4 text-center">All good! 🎉</p>
            ) : needsAttention.map((n) => (
              <div key={n.name} className="flex items-center justify-between py-2 px-1 rounded-lg">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[var(--color-surface-hover)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] text-[10px] font-bold">
                    {n.name[0]}
                  </div>
                  <span className="text-sm font-medium text-[var(--color-text-secondary)]">{n.name.split(" ")[0]}</span>
                </div>
                <span className="text-[11px] font-mono text-[var(--color-text-muted)] tabular-nums">{n.streak}d streak</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Mini Leaderboard Tabs */}
        <Card className="card-hover">
          <CardHeader className="mb-3">
            <div className="flex gap-1 p-1 bg-[var(--color-surface-hover)] rounded-lg w-fit">
              {(["streak", "completion", "xp", "entries"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setLbTab(tab)}
                  className={cn(
                    "px-2.5 py-1.5 rounded-md text-[10px] font-bold transition-all duration-200",
                    lbTab === tab
                      ? "bg-amber-500 text-white shadow-sm"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                  )}
                >
                  {tab === "streak" ? "🔥" : tab === "completion" ? "🎯" : tab === "xp" ? "⭐" : "📊"}{" "}
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {[...employees]
              .sort((a, b) => {
                if (lbTab === "streak") return (streakMap[b.name] || 0) - (streakMap[a.name] || 0);
                if (lbTab === "xp") return (b.xp || 0) - (a.xp || 0);
                if (lbTab === "entries") return (b.totalEntries || 0) - (a.totalEntries || 0);
                return (b.totalEntries || 0) - (a.totalEntries || 0);
              })
              .slice(0, 5)
              .map((emp, i) => (
                <div key={emp.name} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "text-[10px] font-bold w-5 text-center",
                        i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-orange-400" : "text-[var(--color-text-muted)]"
                      )}
                    >
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                    </span>
                    <span className="text-sm font-medium text-[var(--color-text-secondary)]">{emp.name.split(" ")[0]}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-[var(--color-text-secondary)] tabular-nums">
                    {lbTab === "streak" && `${streakMap[emp.name] || 0}d`}
                    {lbTab === "xp" && `${emp.xp || 0} XP`}
                    {lbTab === "entries" && `${emp.totalEntries || 0}`}
                    {lbTab === "completion" && `${emp.totalEntries || 0}`}
                  </span>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>

      {/* ── Entry Table ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Team Entries</span>
            <span className="text-[10px] font-normal text-[var(--color-text-muted)] font-mono normal-case tracking-normal">
              search · filter · rate
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-2.5 mb-5 p-3 rounded-xl bg-[var(--color-surface-hover)]/50 border border-[var(--color-border)]/30">
            <div className="relative flex-1 min-w-[200px]">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              <Input
                placeholder="Search project / task / description..."
                value={fSearch}
                onChange={(e) => setFSearch(e.target.value)}
                className="pl-9 h-10 bg-[var(--color-surface)]"
              />
            </div>
            <select
              value={fUser}
              onChange={(e) => setFUser(e.target.value)}
              className="h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text-primary)] outline-none transition-all"
            >
              <option value="">All employees</option>
              {teamNames.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <select
              value={fProject}
              onChange={(e) => setFProject(e.target.value)}
              className="h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text-primary)] outline-none transition-all"
            >
              <option value="">All projects</option>
              {PROJECTS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <input
              type="date"
              value={fDate}
              onChange={(e) => setFDate(e.target.value)}
              className="h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text-primary)] outline-none transition-all"
            />
            <select
              value={fRange}
              onChange={(e) => setFRange(e.target.value)}
              className="h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text-primary)] outline-none transition-all"
            >
              <option value="all">All time</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider border-b border-[var(--color-border)]">
                  {["Date", "Employee", "Project", "Task", "Description", "Planned", "Actual", "Complete", "Complexity", "Rating"].map((h) => (
                    <th key={h} className="pb-3 font-semibold pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((e) => (
                  <tr key={e.id} className="border-b border-[var(--color-border)]/30 hover:bg-[var(--color-surface-hover)] transition-colors">
                    <td className="py-3 pr-4 font-mono text-xs whitespace-nowrap text-[var(--color-text-muted)]">{e.Date}</td>
                    <td className="py-3 pr-4 font-medium text-[var(--color-text-secondary)] whitespace-nowrap">{e.EmployeeName}</td>
                    <td className="py-3 pr-4 font-medium text-[var(--color-text-secondary)]">{e.Project}</td>
                    <td className="py-3 pr-4 text-[var(--color-text-secondary)]">{e.Task}</td>
                    <td className="py-3 pr-4 max-w-[200px] truncate text-[var(--color-text-muted)] text-xs">{e.Description}</td>
                    <td className="py-3 pr-4 font-mono tabular-nums">{e.PlannedQty}</td>
                    <td className="py-3 pr-4 font-mono tabular-nums">{e.ActualQty}</td>
                    <td className="py-3 pr-4 font-mono tabular-nums font-medium">{e.CompletionPct}%</td>
                    <td className="py-3 pr-4">
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                        COMPLEXITY_COLORS[e.Complexity] || ""
                      )}>
                        {e.Complexity}
                      </span>
                    </td>
                    <td className="py-3">
                      <select
                        value={e.Rating || ""}
                        onChange={(ev) => handleRate(e.id, ev.target.value)}
                        className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[11px] px-2.5 py-1.5 outline-none font-medium transition-all"
                      >
                        <option value="">—</option>
                        {RATING_OPTIONS.map((r) => (
                          <option key={r.value} value={r.value}>{r.value} · {r.label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
                {filteredEntries.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-[var(--color-text-muted)] text-sm">
                      No entries match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Engineering Fact ── */}
      <Card className="card-hover bg-gradient-to-r from-slate-50 to-blue-50/30 dark:from-slate-800/60 dark:to-slate-800/40 border-slate-200/60 dark:border-slate-700/40">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <div className="text-[10px] font-bold tracking-[0.15em] text-[var(--color-text-muted)] uppercase mb-1.5">
                ⚙ ENGINEERING FACT
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed font-medium">{todayFact}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
