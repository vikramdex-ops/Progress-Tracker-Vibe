import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import {
  entriesApi,
  employeesApi,
  leavesApi,
  passwordResetsApi,
  notificationsApi,
  announcementsApi,
  calendarApi,
  quizApi,
  gamificationApi,
  aiInsightsApi,
  deepseekApi,
} from "@/lib/api";
import { PROJECTS, RATING_OPTIONS, COMPLEXITY_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { useNotification } from "@/components/ui/primitives";
import type { EodEntry, Employee } from "@/lib/types";
import {
  Users,
  AlertTriangle,
  Flame,
  Star,
  Target,
  Zap,
  Clock,
  CheckCircle2,
  X,
  BarChart3,
  BookOpen,
  Filter,
  Lock,
  Send,
  Sparkles,
  Trophy,
  RefreshCw,
  MessageSquare,
  ChevronRight,
} from "lucide-react";

export default function TeamLeadDashboard() {
  const { user } = useAuth();
  const { notify } = useNotification();
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

  // EOD submission state (for team lead)
  const [workItems, setWorkItems] = useState<any[]>([
    {
      projectName: "",
      task: "",
      description: "",
      plannedQty: 0,
      actualQty: 0,
      completionPercent: 0,
      complexity: "Moderate",
      remarks: "",
    },
  ]);
  const [overallRemarks, setOverallRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [myEntries, setMyEntries] = useState<any[]>([]);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveReasonSelf, setLeaveReasonSelf] = useState("");

  // Quiz state (for team lead)
  const [quiz, setQuiz] = useState<any>(null);
  const [quizAnswer, setQuizAnswer] = useState("");
  const [quizResult, setQuizResult] = useState<any>(null);
  const [quizStats, setQuizStats] = useState<any>(null);
  const [quizHistory, setQuizHistory] = useState<any[]>([]);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [quizTab, setQuizTab] = useState<"play" | "history">("play");

  // AI insights
  const [weeklyReport, setWeeklyReport] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [teamAnalytics, setTeamAnalytics] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Chatbot
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([
    {
      role: "assistant",
      content: "👋 Hi! I'm your piping engineering assistant. Ask me anything about ASME codes, piping standards, or team coordination!",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [empRes, entRes, leaveRes, resetRes, notifRes, annRes, calRes, myEntRes, qStats, qHist] =
        await Promise.all([
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
      notify({
        title: "Rating Saved",
        description: `Marked entry as ${rating}.`,
        variant: "success",
      });
      await loadData();
    } catch (e: any) {
      notify({
        title: "Rating Failed",
        description: e.message || "Failed to update rating.",
        variant: "error",
      });
    }
  };

  const handleApproveReset = async () => {
    if (!resetModal || !newTempPw) return;
    try {
      await passwordResetsApi.approve(resetModal.id, newTempPw);
      notify({
        title: "Password Reset Approved",
        description: `Temporary password set for ${resetModal.employeeName}.`,
        variant: "success",
      });
      setResetModal(null);
      setNewTempPw("");
      await loadData();
    } catch (e: any) {
      notify({
        title: "Reset Failed",
        description: e.message || "Could not approve reset.",
        variant: "error",
      });
    }
  };

  const pendingResets = passwordResets.filter((r) => r.status === "pending");

  const handleMarkLeave = async (empName: string) => {
    try {
      await leavesApi.create({ EmployeeName: empName, Date: today, Reason: leaveReason, MarkedBy: user?.name });
      notify({
        title: "Leave Recorded",
        description: `Marked ${empName} as on leave for today.`,
        variant: "info",
      });
      setLeaveModal(null);
      setLeaveReason("");
      await loadData();
    } catch (e: any) {
      notify({
        title: "Action Failed",
        description: e.message || "Could not record leave.",
        variant: "error",
      });
    }
  };

  const sortedByStreak = [...teamNames].sort((a, b) => (streakMap[b] || 0) - (streakMap[a] || 0));

  const loadTeamAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const report = await deepseekApi.teamAnalytics();
      setTeamAnalytics(report);
      notify({
        title: "Team Analytics Ready",
        description: "DeepSeek V4 analysis completed successfully.",
        variant: "success",
      });
    } catch (e: any) {
      notify({
        title: "Analytics Failed",
        description: e.message || "Could not generate team analytics.",
        variant: "error",
      });
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setChatLoading(true);
    try {
      const res: any = await deepseekApi.chat(
        userMsg,
        `Team: ${teamNames.join(", ")}. Today: ${today}. Team size: ${teamNames.length}`
      );
      setChatMessages((prev) => [...prev, { role: "assistant", content: res.answer || "I couldn't process that." }]);
    } catch {
      setChatMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered an error connecting to DeepSeek." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const loadWeeklyReport = async () => {
    setLoadingReport(true);
    try {
      const report = await aiInsightsApi.weeklyReport();
      setWeeklyReport(report);
      notify({
        title: "Weekly Report Generated",
        description: "Performance breakdown is now available.",
        variant: "success",
      });
    } catch (e: any) {
      notify({
        title: "Report Failed",
        description: e.message || "Could not generate weekly report.",
        variant: "error",
      });
    } finally {
      setLoadingReport(false);
    }
  };

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
    if (!valid.length) {
      notify({
        title: "Incomplete Form",
        description: "Please select a project and provide a task description.",
        variant: "error",
      });
      return;
    }
    setSubmitting(true);
    try {
      await entriesApi.create({
        EmployeeName: user?.name,
        Date: today,
        workItems: valid,
        OverallRemarks: overallRemarks,
      });
      notify({
        title: "EOD Submitted",
        description: "Your daily progress was saved (+10 XP)!",
        variant: "success",
      });
      setWorkItems([
        {
          projectName: "",
          task: "",
          description: "",
          plannedQty: 0,
          actualQty: 0,
          completionPercent: 0,
          complexity: "Moderate",
          remarks: "",
        },
      ]);
      setOverallRemarks("");
      await loadData();
    } catch (e: any) {
      notify({
        title: "Submission Failed",
        description: e.message || "Could not submit EOD entry.",
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkLeaveSelf = async () => {
    try {
      await leavesApi.create({ EmployeeName: user?.name, Date: today, Reason: leaveReasonSelf, MarkedBy: user?.name });
      notify({
        title: "Leave Recorded",
        description: "You are marked on leave for today.",
        variant: "info",
      });
      setShowLeaveForm(false);
      setLeaveReasonSelf("");
      await loadData();
    } catch (e: any) {
      notify({
        title: "Action Failed",
        description: e.message || "Could not mark leave.",
        variant: "error",
      });
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
        employee: user?.name || "",
        question: quiz.question,
        answer,
        correctAnswer: quiz.correctAnswer,
        explanation: quiz.explanation,
        options: quiz.options,
        difficulty: quiz.difficulty,
        category: quiz.category,
      });
      setQuizResult({
        correct: res.correct,
        xp: res.xpEarned,
        explanation: quiz.explanation,
        correctAnswer: quiz.correctAnswer,
      });
      if (res.correct) {
        notify({
          title: `Correct Answer! +${res.xpEarned} XP`,
          description: "Piping engineering mastery upgraded.",
          variant: "success",
        });
      }
      const gRes: any = await gamificationApi.get(user?.name || "");
      if (gRes) setQuizStats((prev: any) => (prev ? { ...prev, correct: gRes.correct || prev.correct } : prev));
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
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-8 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-[var(--color-surface-raised)] skeleton-shimmer" />
          ))}
        </div>
        <div className="h-64 rounded-2xl bg-[var(--color-surface-raised)] skeleton-shimmer" />
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 py-5 sm:py-6 lg:py-8 space-y-5 sm:space-y-6 lg:space-y-8">
      {/* ── Tabs Navigation ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1.5 p-1 bg-[var(--color-surface-raised)] rounded-xl border border-[var(--color-border)] shadow-sm">
          {[
            { id: "team" as const, label: "Team Overview", icon: <Users className="w-4 h-4" /> },
            { id: "myeod" as const, label: "My Daily EOD", icon: <Target className="w-4 h-4" /> },
            { id: "myquiz" as const, label: "Engineering Quiz", icon: <BookOpen className="w-4 h-4" /> },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200",
                activeTab === t.id
                  ? "bg-[var(--color-surface-default)] text-[var(--color-text-primary)] shadow-sm border border-[var(--color-border)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              )}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData()}
            className="text-xs h-9 gap-1.5 border-[var(--color-border)]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Data</span>
          </Button>
        </div>
      </div>

      {/* ═══════════ TEAM OVERVIEW TAB ═══════════ */}
      {activeTab === "team" && (
        <>
          {/* ── Top Stat Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
            <StatCard
              label="Filled Today"
              value={`${todaysEntries.length}/${teamNames.length || "—"}`}
              subtitle="Daily Submissions"
              icon={<CheckCircle2 className="w-5 h-5" />}
              color="completion"
            />
            <StatCard
              label="Missing Today"
              value={`${missingToday.length}`}
              subtitle="Pending EOD"
              icon={<AlertTriangle className="w-5 h-5" />}
              color={missingToday.length > 0 ? "alert" : "completion"}
            />
            <StatCard
              label="Avg Completion"
              value={`${avgComp}%`}
              subtitle="Team Delivery Rate"
              icon={<BarChart3 className="w-5 h-5" />}
              color="brand"
            />
            <StatCard
              label="Awaiting Rating"
              value={`${pendingRatings}`}
              subtitle="Entries to Review"
              icon={<Star className="w-5 h-5" />}
              color="progress"
            />
          </div>

          {/* ── Password Reset Requests Banner ── */}
          {pendingResets.length > 0 && (
            <Card className="border-[var(--color-brand)]/30 bg-[var(--color-surface-brand)] shadow-sm">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-[var(--color-brand)] flex items-center gap-2">
                    <Lock className="w-4 h-4" /> Password Reset Requests
                  </h3>
                  <Badge variant="outline" className="border-[var(--color-brand)]/40 text-[var(--color-brand)]">
                    {pendingResets.length} pending
                  </Badge>
                </div>
                <div className="space-y-2">
                  {pendingResets.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between bg-[var(--color-surface-default)] border border-[var(--color-border)] rounded-xl px-4 py-3 shadow-xs"
                    >
                      <div>
                        <span className="text-sm font-semibold text-[var(--color-text-primary)]">{r.employeeName}</span>
                        <span className="text-xs text-[var(--color-text-muted)] ml-2">({r.email})</span>
                        <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                          Requested {r.requestedAt ? new Date(r.requestedAt).toLocaleString() : ""}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setResetModal(r);
                          setNewTempPw("");
                        }}
                      >
                        Reset Password
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Reset Password Modal Inline ── */}
          {resetModal && (
            <Card className="border-[var(--color-brand)]/40 shadow-elevated">
              <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 w-full">
                  <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block">
                    Set temporary password for {resetModal.employeeName}
                  </label>
                  <Input
                    value={newTempPw}
                    onChange={(e) => setNewTempPw(e.target.value)}
                    placeholder="New temp password (min 4 characters)"
                  />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button onClick={handleApproveReset} variant="default" className="flex-1 sm:flex-none">
                    Confirm & Update
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setResetModal(null);
                      setNewTempPw("");
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Missing Today Alert Banner ── */}
          {missingToday.length > 0 && (
            <Card className="border-[var(--color-alert)]/30 bg-[var(--color-surface-alert)] shadow-sm">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-alert)] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--color-alert)]"></span>
                    </span>
                    <h3 className="text-sm font-bold text-[var(--color-alert)] flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" /> Missing Today
                    </h3>
                  </div>
                  <Badge variant="destructive">{missingToday.length} missing</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {missingToday.map((n) => (
                    <div
                      key={n}
                      className="flex items-center gap-2 bg-[var(--color-surface-default)] border border-[var(--color-border)] rounded-full px-3 py-1.5 shadow-xs"
                    >
                      <div className="w-6 h-6 rounded-full bg-[var(--color-surface-alert)] flex items-center justify-center text-[var(--color-alert)] text-[10px] font-bold">
                        {n[0]}
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-[var(--color-text-secondary)]">{n}</span>
                      <button
                        onClick={() => setLeaveModal(n)}
                        className="text-[10px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-progress)] ml-1 transition-colors px-1.5 py-0.5 rounded hover:bg-[var(--color-surface-raised)]"
                      >
                        mark leave
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Mark Leave Modal ── */}
          {leaveModal && (
            <Card className="border-[var(--color-progress)]/40 shadow-elevated">
              <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 w-full">
                  <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block">
                    Mark {leaveModal} as on leave for today
                  </label>
                  <Input
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    placeholder="Reason (e.g., Sick leave, Vacation, Training)"
                  />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button onClick={() => handleMarkLeave(leaveModal)} variant="default" className="flex-1 sm:flex-none">
                    Confirm Leave
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setLeaveModal(null);
                      setLeaveReason("");
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Compact Widgets Row ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
            {/* Streak Leaderboard */}
            <Card className="shadow-sm border border-[var(--color-border)]">
              <CardHeader className="pb-3 border-b border-[var(--color-border)]">
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-[var(--color-text-primary)]">
                  <Flame className="w-4 h-4 text-[var(--color-progress)]" />
                  <span>Streak Leaderboard</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3 space-y-2 max-h-72 overflow-y-auto">
                {sortedByStreak.map((name, i) => (
                  <div
                    key={name}
                    className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-[var(--color-surface-raised)] transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "text-xs font-bold w-5 text-center font-mono",
                          i === 0 && "text-[var(--color-progress)]",
                          i === 1 && "text-[var(--color-text-secondary)]",
                          i === 2 && "text-[var(--color-progress)] opacity-80",
                          i > 2 && "text-[var(--color-text-muted)]"
                        )}
                      >
                        {i === 0 ? "1" : i === 1 ? "2" : i === 2 ? "3" : `${i + 1}`}
                      </span>
                      <div className="w-7 h-7 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)] text-xs font-bold shadow-xs">
                        {name[0]}
                      </div>
                      <span className="text-xs font-medium text-[var(--color-text-secondary)]">{name.split(" ")[0]}</span>
                    </div>
                    <span
                      className={cn(
                        "text-xs font-bold font-mono tabular-nums flex items-center gap-1",
                        streakMap[name] > 0 ? "text-[var(--color-progress)]" : "text-[var(--color-text-muted)]"
                      )}
                    >
                      {streakMap[name] || 0}d {streakMap[name] > 0 && <Flame className="w-3.5 h-3.5" />}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Needs Attention */}
            <Card className="shadow-sm border border-[var(--color-border)]">
              <CardHeader className="pb-3 border-b border-[var(--color-border)]">
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-[var(--color-text-primary)]">
                  <AlertTriangle className="w-4 h-4 text-[var(--color-alert)]" />
                  <span>Needs Attention</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3 space-y-2">
                {needsAttention.length === 0 ? (
                  <p className="text-xs text-[var(--color-text-muted)] py-6 text-center">All team members on track!</p>
                ) : (
                  needsAttention.map((n) => (
                    <div
                      key={n.name}
                      className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-[var(--color-surface-raised)] transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[var(--color-surface-alert)] text-[var(--color-alert)] flex items-center justify-center text-xs font-bold shadow-xs">
                          {n.name[0]}
                        </div>
                        <span className="text-xs font-medium text-[var(--color-text-secondary)]">{n.name}</span>
                      </div>
                      <span className="text-[11px] font-mono text-[var(--color-alert)] tabular-nums font-semibold">
                        {n.streak}d streak
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Mini Leaderboard Tabs */}
            <Card className="shadow-sm border border-[var(--color-border)]">
              <CardHeader className="pb-3 border-b border-[var(--color-border)]">
                <div className="flex gap-1 p-0.5 bg-[var(--color-surface-raised)] rounded-lg border border-[var(--color-border)] w-fit">
                  {(["streak", "completion", "xp", "entries"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setLbTab(tab)}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-[10px] font-bold transition-all capitalize",
                        lbTab === tab
                          ? "bg-[var(--color-surface-default)] text-[var(--color-text-primary)] shadow-xs"
                          : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                      )}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="pt-3 space-y-2">
                {[...employees]
                  .sort((a, b) => {
                    if (lbTab === "streak") return (streakMap[b.name] || 0) - (streakMap[a.name] || 0);
                    if (lbTab === "xp") return (b.xp || 0) - (a.xp || 0);
                    if (lbTab === "entries") return (b.totalEntries || 0) - (a.totalEntries || 0);
                    return (b.totalEntries || 0) - (a.totalEntries || 0);
                  })
                  .slice(0, 5)
                  .map((emp, i) => (
                    <div key={emp.name} className="flex items-center justify-between py-1 px-2 rounded-lg">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[11px] font-mono font-bold w-4 text-[var(--color-text-muted)]">
                          {i + 1}
                        </span>
                        <span className="text-xs font-medium text-[var(--color-text-secondary)]">{emp.name.split(" ")[0]}</span>
                      </div>
                      <span className="text-xs font-mono font-semibold text-[var(--color-text-primary)] tabular-nums">
                        {lbTab === "streak" && `${streakMap[emp.name] || 0}d`}
                        {lbTab === "xp" && `${emp.xp || 0} XP`}
                        {lbTab === "entries" && `${emp.totalEntries || 0} entries`}
                        {lbTab === "completion" && `${emp.totalEntries || 0} entries`}
                      </span>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>

          {/* ── Team Entries Review Table ── */}
          <Card className="shadow-sm border border-[var(--color-border)] overflow-hidden">
            <CardHeader className="px-4 sm:px-6 py-4 border-b border-[var(--color-border)]">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base font-bold text-[var(--color-text-primary)]">Team Submissions</CardTitle>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Filter, inspect, and evaluate team progress</p>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  {filteredEntries.length} {filteredEntries.length === 1 ? "entry" : "entries"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
              {/* Filters Bar */}
              <div className="flex flex-wrap gap-2.5 p-3 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
                <div className="relative flex-1 min-w-[200px] sm:min-w-[280px]">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                  <Input
                    placeholder="Search project, task, or description..."
                    value={fSearch}
                    onChange={(e) => setFSearch(e.target.value)}
                    className="pl-9 h-9 bg-[var(--color-surface-default)]"
                  />
                </div>
                <select
                  value={fUser}
                  onChange={(e) => setFUser(e.target.value)}
                  className="h-9 min-w-[130px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-default)] px-3 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-focus)] transition-all"
                >
                  <option value="">All engineers</option>
                  {teamNames.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <select
                  value={fProject}
                  onChange={(e) => setFProject(e.target.value)}
                  className="h-9 min-w-[130px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-default)] px-3 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-focus)] transition-all"
                >
                  <option value="">All projects</option>
                  {PROJECTS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={fDate}
                  onChange={(e) => setFDate(e.target.value)}
                  className="h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-default)] px-3 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-focus)] transition-all"
                />
                <select
                  value={fRange}
                  onChange={(e) => setFRange(e.target.value)}
                  className="h-9 min-w-[110px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-default)] px-3 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-focus)] transition-all"
                >
                  <option value="all">All time</option>
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                </select>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] uppercase tracking-wider font-semibold border-b border-[var(--color-border)]">
                      <th className="py-3 px-4 whitespace-nowrap">Date</th>
                      <th className="py-3 px-4 whitespace-nowrap">Engineer</th>
                      <th className="py-3 px-4 whitespace-nowrap">Project</th>
                      <th className="py-3 px-4 whitespace-nowrap">Task</th>
                      <th className="py-3 px-4 min-w-[180px]">Description</th>
                      <th className="py-3 px-4 whitespace-nowrap text-right">Plan</th>
                      <th className="py-3 px-4 whitespace-nowrap text-right">Act</th>
                      <th className="py-3 px-4 whitespace-nowrap text-right">Comp</th>
                      <th className="py-3 px-4 whitespace-nowrap">Complexity</th>
                      <th className="py-3 px-4 whitespace-nowrap">Rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {filteredEntries.map((e) => (
                      <tr
                        key={e.id}
                        className="hover:bg-[var(--color-surface-raised)]/60 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono text-[var(--color-text-muted)] whitespace-nowrap">{e.Date}</td>
                        <td className="py-3 px-4 font-medium text-[var(--color-text-primary)] whitespace-nowrap">
                          {e.EmployeeName}
                        </td>
                        <td className="py-3 px-4 font-medium text-[var(--color-text-secondary)] whitespace-nowrap">
                          {e.Project}
                        </td>
                        <td className="py-3 px-4 text-[var(--color-text-secondary)] whitespace-nowrap">{e.Task}</td>
                        <td className="py-3 px-4 max-w-[240px] truncate text-[var(--color-text-muted)]" title={e.Description}>
                          {e.Description || "—"}
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums text-right text-[var(--color-text-secondary)]">
                          {e.PlannedQty}
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums text-right text-[var(--color-text-secondary)]">
                          {e.ActualQty}
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums text-right font-semibold text-[var(--color-text-primary)]">
                          {e.CompletionPct}%
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                              COMPLEXITY_COLORS[e.Complexity] || ""
                            )}
                          >
                            {e.Complexity}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <select
                            value={e.Rating || ""}
                            onChange={(ev) => handleRate(e.id, ev.target.value)}
                            className="bg-[var(--color-surface-default)] border border-[var(--color-border)] rounded-md text-[11px] px-2 py-1 outline-none font-medium focus:border-[var(--color-border-focus)] transition-all"
                          >
                            <option value="">Pending</option>
                            {RATING_OPTIONS.map((r) => (
                              <option key={r.value} value={r.value}>
                                {r.value} · {r.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                    {filteredEntries.length === 0 && (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-[var(--color-text-muted)] text-sm">
                          No submissions found matching these filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* ── Live Activity Stream ── */}
          <Card className="shadow-sm border border-[var(--color-border)]">
            <CardHeader className="px-4 sm:px-6 py-4 border-b border-[var(--color-border)]">
              <CardTitle className="flex items-center justify-between text-base font-bold text-[var(--color-text-primary)]">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[var(--color-progress)]" />
                  <span>Live Team Activity</span>
                </div>
                <span className="text-xs font-normal text-[var(--color-text-muted)]">Real-time team telemetry</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {announcements.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {announcements.slice(0, 15).map((ann) => (
                    <div
                      key={ann.id}
                      className="flex items-start gap-3 p-3 rounded-xl bg-[var(--color-surface-raised)]/50 border border-[var(--color-border)]/50 hover:bg-[var(--color-surface-raised)] transition-colors"
                    >
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                          ann.Type === "entry" && "bg-[var(--color-completion)]",
                          ann.Type === "leave" && "bg-[var(--color-progress)]",
                          ann.Type === "badge" && "bg-[var(--color-brand)]",
                          ann.Type === "system" && "bg-[var(--color-brand)]"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] leading-snug">
                          <span className="font-semibold text-[var(--color-text-primary)]">{ann.EmployeeName}</span>{" "}
                          {ann.Message}
                        </p>
                        {ann.Timestamp && (
                          <span className="text-[10px] text-[var(--color-text-muted)] font-mono mt-0.5 block">
                            {new Date(ann.Timestamp).toLocaleString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[var(--color-text-muted)] text-center py-6">No activity logged yet today.</p>
              )}
            </CardContent>
          </Card>

          {/* ── AI Insights Grid (Weekly Report & Deep Team Analytics) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* AI Weekly Report */}
            <Card className="shadow-sm border border-[var(--color-border)]">
              <CardHeader className="px-5 py-4 border-b border-[var(--color-border)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[var(--color-brand)]" />
                    <CardTitle className="text-sm font-bold text-[var(--color-text-primary)]">AI Weekly Report</CardTitle>
                    <Badge variant="outline" className="text-[10px] text-[var(--color-brand)] border-[var(--color-brand)]/30">
                      GPT-OSS-20B
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={loadWeeklyReport}
                    loading={loadingReport}
                    className="text-xs h-8 gap-1.5"
                  >
                    ✦ Analyze
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                {loadingReport ? (
                  <div className="space-y-3 py-2">
                    <div className="h-4 bg-[var(--color-surface-raised)] rounded skeleton-shimmer w-3/4" />
                    <div className="h-3 bg-[var(--color-surface-raised)] rounded skeleton-shimmer w-full" />
                    <div className="h-3 bg-[var(--color-surface-raised)] rounded skeleton-shimmer w-5/6" />
                  </div>
                ) : weeklyReport ? (
                  <div className="space-y-3.5">
                    <div className="p-3.5 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
                      <p className="text-xs font-bold text-[var(--color-text-primary)]">{weeklyReport.headline}</p>
                      <p className="text-xs text-[var(--color-text-secondary)] mt-1.5 leading-relaxed">
                        {weeklyReport.teamPerformance}
                      </p>
                    </div>

                    {weeklyReport.topPerformers?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-[var(--color-completion)] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Trophy className="w-3 h-3" /> Top Performers
                        </p>
                        {weeklyReport.topPerformers.map((p: any, i: number) => (
                          <div key={i} className="text-xs py-1 flex items-start gap-2">
                            <span className="text-[var(--color-completion)]">•</span>
                            <span>
                              <strong className="text-[var(--color-text-primary)]">{p.name}</strong>: {p.reason}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {weeklyReport.actionableInsights?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-[var(--color-brand)] uppercase tracking-wider mb-1.5">
                          💡 Actionable Insights
                        </p>
                        {weeklyReport.actionableInsights.map((insight: string, i: number) => (
                          <div key={i} className="text-xs py-0.5 text-[var(--color-text-secondary)] flex items-start gap-2">
                            <span className="text-[var(--color-brand)]">•</span>
                            <span>{insight}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--color-text-muted)] text-center py-6">
                    Click Analyze to generate team performance intelligence.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Deep Team Analytics (DeepSeek V4) */}
            <Card className="shadow-sm border border-[var(--color-border)]">
              <CardHeader className="px-5 py-4 border-b border-[var(--color-border)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[var(--color-progress)]" />
                    <CardTitle className="text-sm font-bold text-[var(--color-text-primary)]">Deep Team Analytics</CardTitle>
                    <Badge variant="outline" className="text-[10px] text-[var(--color-progress)] border-[var(--color-progress)]/30">
                      DeepSeek V4
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={loadTeamAnalytics}
                    loading={loadingAnalytics}
                    className="text-xs h-8 gap-1.5"
                  >
                    ⬢ Deep Analyze
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                {loadingAnalytics ? (
                  <div className="space-y-3 py-2">
                    <div className="h-4 bg-[var(--color-surface-raised)] rounded skeleton-shimmer w-3/4" />
                    <div className="h-3 bg-[var(--color-surface-raised)] rounded skeleton-shimmer w-full" />
                    <div className="h-3 bg-[var(--color-surface-raised)] rounded skeleton-shimmer w-5/6" />
                  </div>
                ) : teamAnalytics ? (
                  <div className="space-y-3.5">
                    <div className="p-3.5 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
                      <p className="text-xs text-[var(--color-text-primary)] leading-relaxed">{teamAnalytics.insights}</p>
                    </div>

                    {teamAnalytics.patterns?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-[var(--color-brand)] uppercase tracking-wider mb-1.5">
                          🔍 Patterns Detected
                        </p>
                        {teamAnalytics.patterns.map((p: any, i: number) => (
                          <div key={i} className="text-xs py-1">
                            <span className="font-semibold text-[var(--color-text-primary)]">{p.pattern}</span>
                            <span className="text-[var(--color-text-muted)] ml-1.5">— {p.impact}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {teamAnalytics.recommendations?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-[var(--color-completion)] uppercase tracking-wider mb-1.5">
                          💡 Recommendations
                        </p>
                        {teamAnalytics.recommendations.map((r: string, i: number) => (
                          <p key={i} className="text-xs text-[var(--color-text-secondary)] py-0.5">
                            • {r}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--color-text-muted)] text-center py-6">
                    Click Deep Analyze to run AI pattern detection on your project workflow.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* ═══════════ MY EOD TAB ═══════════ */}
      {activeTab === "myeod" && (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
          {!todayMyEntry && !myOnLeave && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowLeaveForm(!showLeaveForm)}>
                Mark Leave for Today
              </Button>
            </div>
          )}

          {showLeaveForm && (
            <Card className="border-[var(--color-border)] shadow-elevated">
              <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 w-full">
                  <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block">
                    Reason (optional)
                  </label>
                  <Input
                    value={leaveReasonSelf}
                    onChange={(e) => setLeaveReasonSelf(e.target.value)}
                    placeholder="e.g., Sick leave, Vacation"
                  />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button onClick={handleMarkLeaveSelf} variant="default" className="flex-1 sm:flex-none">
                    Confirm Leave
                  </Button>
                  <Button variant="ghost" onClick={() => setShowLeaveForm(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {myOnLeave ? (
            <Card className="border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-sm">
              <CardContent className="p-12 text-center">
                <div className="text-3xl mb-3">📅</div>
                <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-1">Marked on Leave Today</h3>
                <p className="text-xs text-[var(--color-text-muted)]">No EOD submission required for today.</p>
              </CardContent>
            </Card>
          ) : todayMyEntry ? (
            <Card className="shadow-sm border border-[var(--color-border)]">
              <CardHeader className="border-b border-[var(--color-border)] pb-4">
                <CardTitle className="flex items-center gap-2 text-[var(--color-completion)] text-base font-bold">
                  <CheckCircle2 className="w-5 h-5" /> Today's EOD Submitted
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
                    <div className="text-2xl font-bold font-mono text-[var(--color-text-primary)]">
                      {todayMyEntry.PlannedQty}
                    </div>
                    <div className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mt-1">
                      Planned
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--color-surface-completion)] border border-[var(--color-completion)]/20">
                    <div className="text-2xl font-bold font-mono text-[var(--color-completion)]">
                      {todayMyEntry.ActualQty}
                    </div>
                    <div className="text-[10px] font-semibold text-[var(--color-completion)] uppercase tracking-wider mt-1">
                      Actual
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--color-surface-brand)] border border-[var(--color-brand)]/20">
                    <div className="text-2xl font-bold font-mono text-[var(--color-brand)]">
                      {todayMyEntry.CompletionPct}%
                    </div>
                    <div className="text-[10px] font-semibold text-[var(--color-brand)] uppercase tracking-wider mt-1">
                      Completion
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-sm border border-[var(--color-border)]">
              <CardHeader className="border-b border-[var(--color-border)] pb-4">
                <CardTitle className="flex items-center justify-between text-base font-bold">
                  <div className="flex items-center gap-2 text-[var(--color-text-primary)]">
                    <Target className="w-4 h-4 text-[var(--color-brand)]" />
                    <span>Today's EOD Entry</span>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono text-[var(--color-progress)] border-[var(--color-progress)]/40">
                    +10 XP Reward
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 sm:p-6 space-y-5">
                {workItems.map((item: any, i: number) => (
                  <div
                    key={i}
                    className="p-4 sm:p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
                        Work Item #{i + 1}
                      </span>
                      {workItems.length > 1 && (
                        <button
                          onClick={() => setWorkItems(workItems.filter((_: any, j: number) => j !== i))}
                          className="text-[var(--color-text-muted)] hover:text-[var(--color-alert)] p-1 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block">
                          Project
                        </label>
                        <select
                          value={item.projectName}
                          onChange={(e) => updateItem(i, "projectName", e.target.value)}
                          className="w-full h-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-default)] px-3 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-focus)] transition-all"
                        >
                          <option value="">Select project...</option>
                          {PROJECTS.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block">
                          Task
                        </label>
                        <Input
                          value={item.task}
                          onChange={(e) => updateItem(i, "task", e.target.value)}
                          placeholder="e.g., Isometric drafting, Stress analysis"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block">
                          Description
                        </label>
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(i, "description", e.target.value)}
                          placeholder="Specific deliverables, line numbers, or drawings..."
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block">
                          Planned Qty
                        </label>
                        <Input
                          type="number"
                          value={item.plannedQty || ""}
                          onChange={(e) => updateItem(i, "plannedQty", Number(e.target.value))}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block">
                          Actual Qty
                        </label>
                        <Input
                          type="number"
                          value={item.actualQty || ""}
                          onChange={(e) => updateItem(i, "actualQty", Number(e.target.value))}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block">
                          Complexity
                        </label>
                        <select
                          value={item.complexity}
                          onChange={(e) => updateItem(i, "complexity", e.target.value)}
                          className="w-full h-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-default)] px-3 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-focus)] transition-all"
                        >
                          <option>Low</option>
                          <option>Moderate</option>
                          <option>High</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block">
                          Calculated Progress
                        </label>
                        <div className="h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-default)] flex items-center justify-between font-mono text-xs">
                          <span>Completion</span>
                          <span className="font-bold text-[var(--color-text-primary)]">{item.completionPercent}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <Button
                  variant="outline"
                  onClick={() =>
                    setWorkItems([
                      ...workItems,
                      {
                        projectName: "",
                        task: "",
                        description: "",
                        plannedQty: 0,
                        actualQty: 0,
                        completionPercent: 0,
                        complexity: "Moderate",
                        remarks: "",
                      },
                    ])
                  }
                  className="w-full border-dashed"
                >
                  + Add Another Work Item
                </Button>

                <div>
                  <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block">
                    Overall Remarks
                  </label>
                  <textarea
                    value={overallRemarks}
                    onChange={(e) => setOverallRemarks(e.target.value)}
                    placeholder="Team coordination notes, blockers, or highlights..."
                    className="w-full h-20 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-default)] px-3.5 py-2.5 text-xs text-[var(--color-text-primary)] resize-none outline-none focus:border-[var(--color-border-focus)] transition-all"
                  />
                </div>

                <Button onClick={handleSubmitEod} loading={submitting} className="w-full" size="lg">
                  Submit EOD Entry → +10 XP
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ═══════════ MY QUIZ TAB ═══════════ */}
      {activeTab === "myquiz" && (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
          <Card className="shadow-sm border border-[var(--color-border)]">
            <CardHeader className="border-b border-[var(--color-border)] pb-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[var(--color-brand)]" />
                  <CardTitle className="text-base font-bold text-[var(--color-text-primary)]">
                    AI Piping Engineering Quiz
                  </CardTitle>
                </div>
                <div className="flex gap-1 p-0.5 bg-[var(--color-surface-raised)] rounded-lg border border-[var(--color-border)]">
                  {(["play", "history"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setQuizTab(tab)}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-xs font-semibold transition-all capitalize",
                        quizTab === tab
                          ? "bg-[var(--color-surface-default)] text-[var(--color-text-primary)] shadow-xs"
                          : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                      )}
                    >
                      {tab === "play" ? "Play Quiz" : `History (${quizHistory.length})`}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 sm:p-6">
              {quizStats && (
                <div className="flex gap-3 mb-5 flex-wrap">
                  <div className="px-3 py-1.5 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-xs font-semibold">
                    <span className="text-[var(--color-text-muted)]">Score:</span>{" "}
                    <span className="text-[var(--color-text-primary)] font-mono">
                      {quizStats.correct}/{quizStats.total}
                    </span>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-xs font-semibold">
                    <span className="text-[var(--color-text-muted)]">Accuracy:</span>{" "}
                    <span className="text-[var(--color-text-primary)] font-mono">{quizStats.accuracy}%</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-xs font-semibold">
                    <span className="text-[var(--color-text-muted)]">Answered:</span>{" "}
                    <span className="text-[var(--color-text-primary)] font-mono">{quizStats.uniqueQuestions}</span>
                  </div>
                </div>
              )}

              {quizTab === "play" ? (
                generatingQuiz ? (
                  <div className="flex flex-col items-center gap-3 py-10">
                    <div className="w-8 h-8 rounded-full border-2 border-[var(--color-brand)] border-t-transparent animate-spin" />
                    <span className="text-xs text-[var(--color-brand)] font-medium">Generating piping technical question...</span>
                  </div>
                ) : quiz?.limitReached ? (
                  <div className="text-center py-8">
                    <div className="text-3xl mb-2">🎯</div>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">Daily Question Quota Completed</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">Check back tomorrow for fresh questions!</p>
                  </div>
                ) : quiz && quiz.options ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      {quiz.difficulty && (
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                            quiz.difficulty === "Easy" && "bg-[var(--color-surface-completion)] text-[var(--color-completion)] border-[var(--color-completion)]/30",
                            quiz.difficulty === "Medium" && "bg-[var(--color-surface-progress)] text-[var(--color-progress)] border-[var(--color-progress)]/30",
                            quiz.difficulty === "Hard" && "bg-[var(--color-surface-alert)] text-[var(--color-alert)] border-[var(--color-alert)]/30"
                          )}
                        >
                          {quiz.difficulty}
                        </span>
                      )}
                      {quiz.remaining !== undefined && (
                        <span className="ml-auto text-xs text-[var(--color-text-muted)] font-mono">
                          {quiz.remaining} questions left today
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold leading-relaxed text-[var(--color-text-primary)]">
                      {quiz.question}
                    </p>
                    <div className="grid sm:grid-cols-2 gap-2.5">
                      {Object.entries(quiz.options).map(([key, val]) => {
                        const isSelected = quizAnswer === key;
                        const isCorrect = quizResult && key === quizResult.correctAnswer;
                        const isWrong = quizResult && isSelected && !quizResult.correct;
                        return (
                          <button
                            key={key}
                            onClick={() => handleQuizAnswer(key)}
                            disabled={!!quizResult}
                            className={cn(
                              "p-3 rounded-xl text-left text-xs font-medium transition-all duration-150 border",
                              !quizResult && "hover:border-[var(--color-brand)]/50 hover:bg-[var(--color-surface-raised)] cursor-pointer",
                              !!quizResult && "cursor-default",
                              isCorrect && "border-[var(--color-completion)]/50 bg-[var(--color-surface-completion)] text-[var(--color-completion)]",
                              isWrong && "border-[var(--color-alert)]/50 bg-[var(--color-surface-alert)] text-[var(--color-alert)]",
                              !isSelected && !isCorrect && !isWrong && "border-[var(--color-border)] bg-[var(--color-surface-default)]"
                            )}
                          >
                            <span className="font-bold text-[var(--color-text-muted)] mr-1.5 font-mono">{key}.</span>
                            {String(val)}
                          </button>
                        );
                      })}
                    </div>
                    {quizResult && (
                      <div className="space-y-3 pt-2">
                        <div
                          className={cn(
                            "p-3 rounded-xl text-xs font-semibold",
                            quizResult.correct
                              ? "bg-[var(--color-surface-completion)] text-[var(--color-completion)]"
                              : "bg-[var(--color-surface-alert)] text-[var(--color-alert)]"
                          )}
                        >
                          {quizResult.correct
                            ? `✅ Correct answer! (+${quizResult.xp} XP)`
                            : `❌ Incorrect. The correct answer was: ${quizResult.correctAnswer}`}
                        </div>
                        {quizResult.explanation && (
                          <div className="p-3.5 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
                            <p className="text-[10px] font-bold text-[var(--color-brand)] uppercase tracking-wider mb-1">
                              Explanation
                            </p>
                            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                              {quizResult.explanation}
                            </p>
                          </div>
                        )}
                        <Button onClick={handleGenerateQuiz} className="w-full">
                          ✦ Next Question
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Sharpen piping codes, metallurgy, and ASME standard skills.
                    </p>
                    <Button onClick={handleGenerateQuiz}>✦ Generate Question</Button>
                  </div>
                )
              ) : (
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {quizHistory.length === 0 ? (
                    <p className="text-xs text-[var(--color-text-muted)] text-center py-8">No questions answered yet.</p>
                  ) : (
                    quizHistory.map((h) => (
                      <div
                        key={h.id}
                        className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-default)] space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-medium text-[var(--color-text-primary)] leading-snug flex-1">
                            {h.Question}
                          </p>
                          <Badge variant={h.IsCorrect ? "default" : "destructive"} className="text-[10px] font-mono">
                            {h.IsCorrect ? "Correct" : "Missed"}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-[10px]">
                          {(["A", "B", "C", "D"] as const).map((k) => (
                            <span
                              key={k}
                              className={cn(
                                "px-2 py-0.5 rounded font-mono",
                                k === h.CorrectAnswer
                                  ? "bg-[var(--color-surface-completion)] text-[var(--color-completion)] font-bold"
                                  : k === h.UserAnswer
                                  ? "bg-[var(--color-surface-alert)] text-[var(--color-alert)]"
                                  : "bg-[var(--color-surface-raised)] text-[var(--color-text-muted)]"
                              )}
                            >
                              {k}. {h[`Option${k}`] || ""}
                            </span>
                          ))}
                        </div>
                        {h.Explanation && (
                          <p className="text-[11px] text-[var(--color-text-muted)] bg-[var(--color-surface-raised)] rounded-lg p-2.5 leading-relaxed">
                            💡 {h.Explanation}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Floating Chatbot ── */}
      <div className="fixed bottom-6 right-6 z-50">
        {chatOpen && (
          <div className="mb-3 w-80 sm:w-96 bg-[var(--color-surface-default)] rounded-2xl shadow-elevated border border-[var(--color-border)] overflow-hidden animate-scale-in">
            <div className="p-3.5 bg-[var(--color-brand)] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                <span className="text-xs font-bold">Piping Assistant</span>
                <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded-full font-mono">DeepSeek V4</span>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="h-72 overflow-y-auto p-3.5 space-y-3">
              {chatMessages.map((msg, i) => (
                <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[85%] px-3.5 py-2 rounded-xl text-xs leading-relaxed",
                      msg.role === "user"
                        ? "bg-[var(--color-brand)] text-white rounded-br-xs"
                        : "bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-bl-xs"
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border)] px-3 py-2 rounded-xl rounded-bl-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)] typing-dot-1" />
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)] typing-dot-2" />
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)] typing-dot-3" />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="p-3 border-t border-[var(--color-border)] bg-[var(--color-surface-default)]">
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleChat()}
                  placeholder="Ask about ASME B31.3, materials..."
                  className="flex-1 h-9 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)] transition-all"
                />
                <Button
                  onClick={handleChat}
                  disabled={!chatInput.trim() || chatLoading}
                  size="sm"
                  className="h-9 w-9 p-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className={cn(
            "w-12 h-12 rounded-2xl shadow-elevated flex items-center justify-center transition-all duration-200",
            chatOpen
              ? "bg-[var(--color-surface-default)] border border-[var(--color-border)] text-[var(--color-text-primary)] rotate-90"
              : "bg-[var(--color-brand)] text-white hover:brightness-110 shadow-lg shadow-[var(--color-brand)]/20"
          )}
        >
          {chatOpen ? <X className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
