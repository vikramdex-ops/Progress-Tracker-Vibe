import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { entriesApi, employeesApi, leavesApi, passwordResetsApi, notificationsApi, announcementsApi, calendarApi, quizApi, gamificationApi } from "@/lib/api";
import { PROJECTS, RATING_OPTIONS, COMPLEXITY_COLORS } from "@/lib/constants";
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
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [calendar, setCalendar] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"team" | "myeod" | "myquiz">("team");
  // EOD submission state
  const [workItems, setWorkItems] = useState<any[]>([{ projectName: "", task: "", description: "", plannedQty: 0, actualQty: 0, completionPercent: 0, complexity: "Moderate", remarks: "" }]);
  const [overallRemarks, setOverallRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [myEntries, setMyEntries] = useState<any[]>([]);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveReasonSelf, setLeaveReasonSelf] = useState("");
  // Quiz state
  const [quiz, setQuiz] = useState<any>(null);
  const [quizAnswer, setQuizAnswer] = useState("");
  const [quizResult, setQuizResult] = useState<any>(null);
  const [quizStats, setQuizStats] = useState<any>(null);
  const [quizHistory, setQuizHistory] = useState<any[]>([]);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [quizTab, setQuizTab] = useState<"play" | "history">("play");

  const loadData = useCallback(async () => {
    try {
      const [empRes, entRes, leaveRes, resetRes, notifRes, annRes, calRes, myEntRes, qStats, qHist] = await Promise.all([
        employeesApi.list() as any,
        entriesApi.list() as any,
        leavesApi.list({ date: today }) as any,
        passwordResetsApi.list() as any,
        notificationsApi.list(user?.name) as any,
        announcementsApi.list() as any,
        calendarApi.list() as any,
        entriesApi.list({ employee: user?.name || "" }) as any,
        quizApi.stats(user?.name || "") as any,
        quizApi.history(user?.name || "") as any,
      ]);
      setEmployees(Array.isArray(empRes) ? empRes : []);
      setEntries(Array.isArray(entRes) ? entRes.sort((a: any, b: any) => b.Date?.localeCompare(a.Date)) : []);
      setLeaves(Array.isArray(leaveRes) ? leaveRes : []);
      setPasswordResets(Array.isArray(resetRes) ? resetRes : []);
      setNotifications(Array.isArray(notifRes) ? notifRes : []);
      setAnnouncements(Array.isArray(annRes) ? annRes : []);
      setCalendar(Array.isArray(calRes) ? calRes : []);
      setMyEntries(Array.isArray(myEntRes) ? myEntRes : []);
      if (qStats) setQuizStats(qStats);
      setQuizHistory(Array.isArray(qHist) ? qHist : []);
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

  // ── EOD Submission (for team lead) ──
  const todayMyEntry = myEntries.find((e: any) => e.Date === today);
  const myOnLeave = leaves.some((l: any) => l.EmployeeName === user?.name && l.Date === today);

  const updateItem = (i: number, field: string, val: any) => {
    const items = [...workItems];
    items[i] = { ...items[i], [field]: val };
    if (field === "plannedQty" || field === "actualQty") {
      const p = field === "plannedQty" ? Number(val) : items[i].plannedQty;
      const a = field === "actualQty" ? Number(val) : items[i].actualQty;
      items[i].completionPercent = p > 0 ? Math.min(999, Math.round((a / p) * 100)) : 0;
    }
    setWorkItems(items);
  };

  const handleSubmitEod = async () => {
    const valid = workItems.filter((w: any) => w.projectName && w.task);
    if (!valid.length) return;
    setSubmitting(true);
    try {
      await entriesApi.create({ EmployeeName: user?.name, Date: today, workItems: valid, OverallRemarks: overallRemarks });
      setWorkItems([{ projectName: "", task: "", description: "", plannedQty: 0, actualQty: 0, completionPercent: 0, complexity: "Moderate", remarks: "" }]);
      setOverallRemarks("");
      await loadData();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkLeaveSelf = async () => {
    try {
      await leavesApi.create({ EmployeeName: user?.name, Date: today, Reason: leaveReasonSelf, MarkedBy: user?.name });
      setShowLeaveForm(false);
      setLeaveReasonSelf("");
      await loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // ── Quiz (for team lead) ──
  const handleGenerateQuiz = async () => {
    setGeneratingQuiz(true);
    setQuiz(null);
    setQuizAnswer("");
    setQuizResult(null);
    try {
      const res: any = await quizApi.generate(user?.name || "");
      if (res.limitReached) setQuiz({ limitReached: true, count: res.count, limit: res.limit });
      else setQuiz(res);
    } catch (e: any) {
      console.error(e);
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const handleQuizAnswer = async (answer: string) => {
    if (!quiz || quizResult) return;
    setQuizAnswer(answer);
    try {
      const res: any = await quizApi.answer({
        employee: user?.name || "", question: quiz.question, answer,
        correctAnswer: quiz.correctAnswer, explanation: quiz.explanation,
        options: quiz.options, difficulty: quiz.difficulty, category: quiz.category,
      });
      setQuizResult({ correct: res.correct, xp: res.xpEarned, explanation: quiz.explanation, correctAnswer: quiz.correctAnswer });
      const gRes: any = await gamificationApi.get(user?.name || "");
      if (gRes) setQuizStats((prev: any) => prev ? { ...prev, correct: gRes.correct || prev.correct } : prev);
      // Reload stats and history
      const [newStats, newHist] = await Promise.all([
        quizApi.stats(user?.name || "") as any,
        quizApi.history(user?.name || "") as any,
      ]);
      if (newStats) setQuizStats(newStats);
      if (Array.isArray(newHist)) setQuizHistory(newHist);
    } catch (e: any) {
      console.error(e);
    }
  };

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
      {/* ── Tabs ── */}
      <div className="flex gap-1.5 p-1 bg-[var(--color-surface-hover)] rounded-xl w-fit border border-[var(--color-border)]/50">
        {([
          { id: "team" as const, label: "Team Overview", icon: <Users className="w-4 h-4" /> },
          { id: "myeod" as const, label: "My EOD", icon: <Target className="w-4 h-4" /> },
          { id: "myquiz" as const, label: "My Quiz", icon: <BookOpen className="w-4 h-4" /> },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200",
              activeTab === t.id
                ? "bg-[var(--color-surface)] text-amber-600 shadow-sm border border-amber-200/50 dark:border-amber-800/30"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            )}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ═══════════ TEAM OVERVIEW TAB ═══════════ */}
      {activeTab === "team" && (
      <>
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

      {/* ── Announcements Live Feed ── */}
      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" /> LIVE FEED
            <span className="text-[10px] font-normal text-[var(--color-text-muted)] normal-case tracking-normal ml-auto">
              who filled & when
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {announcements.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {announcements.slice(0, 15).map((ann) => (
                <div key={ann.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-[var(--color-surface-hover)] transition-colors">
                  <div className={cn(
                    "w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0",
                    ann.Type === "entry" && "bg-emerald-400",
                    ann.Type === "leave" && "bg-orange-400",
                    ann.Type === "badge" && "bg-amber-400",
                    ann.Type === "system" && "bg-blue-400",
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--color-text-secondary)] leading-snug">
                      <span className="font-semibold text-[var(--color-text-primary)]">{ann.EmployeeName}</span>
                      {" "}{ann.Message}
                    </p>
                    {ann.Timestamp && (
                      <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                        {new Date(ann.Timestamp).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)] text-center py-6">No activity yet today.</p>
          )}
        </CardContent>
      </Card>
      </>
      )}

      {/* ═══════════ MY EOD TAB ═══════════ */}
      {activeTab === "myeod" && (
        <div className="max-w-4xl space-y-6 animate-fade-in">
          {!todayMyEntry && !myOnLeave && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowLeaveForm(!showLeaveForm)}>
                📅 Mark Leave for Today
              </Button>
            </div>
          )}
          {showLeaveForm && (
            <Card className="border-orange-200/60 dark:border-orange-800/30 animate-slide-down">
              <CardContent className="p-5 flex gap-3 items-end">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block">Reason (optional)</label>
                  <Input value={leaveReasonSelf} onChange={(e) => setLeaveReasonSelf(e.target.value)} placeholder="e.g., Sick leave" />
                </div>
                <Button onClick={handleMarkLeaveSelf} className="bg-orange-500 hover:bg-orange-600">Confirm Leave</Button>
                <Button variant="ghost" onClick={() => setShowLeaveForm(false)}><X className="w-4 h-4" /></Button>
              </CardContent>
            </Card>
          )}
          {myOnLeave ? (
            <Card className="border-orange-200/60 dark:border-orange-800/30 bg-gradient-to-br from-orange-50/50 to-amber-50/30">
              <CardContent className="p-12 text-center">
                <div className="text-4xl mb-3">📅</div>
                <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">On Leave Today</h3>
                <p className="text-sm text-[var(--color-text-muted)]">No EOD submission needed.</p>
              </CardContent>
            </Card>
          ) : todayMyEntry ? (
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 className="w-5 h-5" /> Today's Entry Submitted
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-5 text-center">
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/15">
                    <div className="text-2xl font-bold text-amber-500">{todayMyEntry.PlannedQty}</div>
                    <div className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase">Planned</div>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/15">
                    <div className="text-2xl font-bold text-emerald-500">{todayMyEntry.ActualQty}</div>
                    <div className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase">Actual</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--color-surface-hover)]">
                    <div className="text-2xl font-bold">{todayMyEntry.CompletionPct}%</div>
                    <div className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase">Completion</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-4 h-4" /> TODAY'S EOD ENTRY
                  <span className="ml-auto text-sm font-bold text-amber-500 normal-case tracking-normal">+10 XP</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {workItems.map((item: any, i: number) => (
                  <div key={i} className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-hover)]/50 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Work Item {i + 1}</h4>
                      {workItems.length > 1 && (
                        <button onClick={() => setWorkItems(workItems.filter((_: any, j: number) => j !== i))} className="text-[var(--color-text-muted)] hover:text-red-500 p-1 rounded-lg">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block">Project</label>
                        <select value={item.projectName} onChange={(e) => updateItem(i, "projectName", e.target.value)} className="w-full h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm">
                          <option value="">Select project...</option>
                          {PROJECTS.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block">Task</label>
                        <Input value={item.task} onChange={(e) => updateItem(i, "task", e.target.value)} placeholder="e.g., Isometric drafting" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block">Description</label>
                        <Input value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} placeholder="Brief description..." />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block">Planned Qty</label>
                        <Input type="number" value={item.plannedQty || ""} onChange={(e) => updateItem(i, "plannedQty", Number(e.target.value))} placeholder="0" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block">Actual Qty</label>
                        <Input type="number" value={item.actualQty || ""} onChange={(e) => updateItem(i, "actualQty", Number(e.target.value))} placeholder="0" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block">Complexity</label>
                        <select value={item.complexity} onChange={(e) => updateItem(i, "complexity", e.target.value)} className="w-full h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm">
                          <option>Low</option><option>Moderate</option><option>High</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block">Completion: {item.completionPercent}%</label>
                      </div>
                    </div>
                  </div>
                ))}
                <Button variant="outline" onClick={() => setWorkItems([...workItems, { projectName: "", task: "", description: "", plannedQty: 0, actualQty: 0, completionPercent: 0, complexity: "Moderate", remarks: "" }])} className="w-full border-dashed">
                  + Add Another Project
                </Button>
                <div>
                  <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block">Overall Remarks</label>
                  <textarea value={overallRemarks} onChange={(e) => setOverallRemarks(e.target.value)} placeholder="Any additional notes..." className="w-full h-24 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm resize-none" />
                </div>
                <Button onClick={handleSubmitEod} disabled={submitting} className="w-full" size="lg">
                  {submitting ? "Submitting..." : "SUBMIT EOD ENTRY → +10 XP"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ═══════════ MY QUIZ TAB ═══════════ */}
      {activeTab === "myquiz" && (
        <div className="max-w-4xl space-y-6 animate-fade-in">
          <Card className="bg-gradient-to-r from-indigo-50 to-purple-50/30 dark:from-indigo-950/20 dark:to-purple-950/10 border-indigo-200/60 dark:border-indigo-800/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-500" />
                  <span className="text-[10px] font-bold tracking-[0.15em] text-[var(--color-text-muted)] uppercase">🤖 AI PIPING QUIZ</span>
                </div>
                <div className="flex gap-1 p-0.5 bg-[var(--color-surface-hover)] rounded-lg">
                  {(["play", "history"] as const).map((tab) => (
                    <button key={tab} onClick={() => setQuizTab(tab)} className={cn("px-3 py-1.5 rounded-md text-[10px] font-bold transition-all", quizTab === tab ? "bg-indigo-500 text-white shadow-sm" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]")}>
                      {tab === "play" ? "🎯 Play" : `📖 History (${quizHistory.length})`}
                    </button>
                  ))}
                </div>
              </div>
              {quizStats && (
                <div className="flex gap-3 mb-4 flex-wrap">
                  <div className="px-3 py-1.5 rounded-lg bg-[var(--color-surface-hover)] text-[10px] font-semibold"><span className="text-[var(--color-text-muted)]">Score:</span> <span className="text-[var(--color-text-primary)]">{quizStats.correct}/{quizStats.total}</span></div>
                  <div className="px-3 py-1.5 rounded-lg bg-[var(--color-surface-hover)] text-[10px] font-semibold"><span className="text-[var(--color-text-muted)]">Accuracy:</span> <span className="text-[var(--color-text-primary)]">{quizStats.accuracy}%</span></div>
                  <div className="px-3 py-1.5 rounded-lg bg-[var(--color-surface-hover)] text-[10px] font-semibold"><span className="text-[var(--color-text-muted)]">Unique:</span> <span className="text-[var(--color-text-primary)]">{quizStats.uniqueQuestions}</span></div>
                </div>
              )}
              {quizTab === "play" ? (
                generatingQuiz ? (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <div className="w-8 h-8 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                    <span className="text-sm text-indigo-500 font-medium">AI is generating your question...</span>
                  </div>
                ) : quiz?.limitReached ? (
                  <div className="text-center py-6">
                    <div className="text-3xl mb-2">🎯</div>
                    <p className="text-sm font-semibold">Daily Limit Reached ({quiz.count}/{quiz.limit})</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">Come back tomorrow!</p>
                  </div>
                ) : quiz && quiz.options ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      {quiz.difficulty && <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold", quiz.difficulty === "Easy" && "bg-emerald-100 text-emerald-600", quiz.difficulty === "Medium" && "bg-amber-100 text-amber-600", quiz.difficulty === "Hard" && "bg-red-100 text-red-500")}>{quiz.difficulty}</span>}
                      {quiz.remaining !== undefined && <span className="ml-auto px-2 py-0.5 rounded-full bg-indigo-100 text-[9px] font-bold text-indigo-600">{quiz.remaining} left today</span>}
                    </div>
                    <p className="text-sm font-semibold leading-relaxed">{quiz.question}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(quiz.options).map(([key, val]) => {
                        const isSelected = quizAnswer === key;
                        const isCorrect = quizResult && key === quizResult.correctAnswer;
                        const isWrong = quizResult && isSelected && !quizResult.correct;
                        return (
                          <button key={key} onClick={() => handleQuizAnswer(key)} disabled={!!quizResult} className={cn("p-3 rounded-xl text-left text-sm font-medium transition-all duration-200 border", !quizResult && "hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer", !!quizResult && "cursor-default", isCorrect && "border-emerald-400 bg-emerald-50 text-emerald-700", isWrong && "border-red-400 bg-red-50 text-red-600", !isSelected && !isCorrect && !isWrong && "border-[var(--color-border)] bg-[var(--color-surface)]")}>
                          <span className="text-[10px] font-bold text-[var(--color-text-muted)] mr-1.5">{key}.</span>{String(val)}
                        </button>
                      );
                    })}
                    </div>
                    {quizResult && (
                      <div className="space-y-2 animate-slide-up">
                        <div className={cn("p-3 rounded-xl text-sm font-medium", quizResult.correct ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500")}>
                          {quizResult.correct ? `✅ Correct! +${quizResult.xp} XP` : `❌ Wrong! Answer: ${quizResult.correctAnswer}`}
                        </div>
                        {quizResult.explanation && (
                          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200/50">
                            <p className="text-xs font-bold text-blue-600 mb-1">💡 EXPLANATION</p>
                            <p className="text-sm leading-relaxed">{quizResult.explanation}</p>
                          </div>
                        )}
                        <button onClick={handleGenerateQuiz} className="w-full py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold">🔄 Next Question</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-6">
                    <p className="text-sm text-[var(--color-text-muted)]">Test your piping engineering knowledge</p>
                    <button onClick={handleGenerateQuiz} className="px-6 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold shadow-sm">✨ Generate Question</button>
                  </div>
                )
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {quizHistory.length === 0 ? (
                    <p className="text-sm text-[var(--color-text-muted)] text-center py-8">No questions answered yet.</p>
                  ) : quizHistory.map((h) => (
                    <div key={h.id} className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-snug flex-1">{h.Question}</p>
                        <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-bold", h.IsCorrect ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-500")}>{h.IsCorrect ? "✓" : "✗"}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 text-[10px]">
                        {(["A", "B", "C", "D"] as const).map((k) => (
                          <span key={k} className={cn("px-2 py-0.5 rounded font-medium", k === h.CorrectAnswer ? "bg-emerald-100 text-emerald-700" : k === h.UserAnswer ? "bg-red-100 text-red-600" : "bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]")}>{k}. {h[`Option${k}`] || ""}</span>
                        ))}
                      </div>
                      {h.Explanation && <p className="text-[11px] text-[var(--color-text-muted)] bg-blue-50/50 rounded-lg px-2.5 py-2">💡 {h.Explanation}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
