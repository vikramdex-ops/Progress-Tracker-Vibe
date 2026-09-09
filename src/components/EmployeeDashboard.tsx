import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { entriesApi, gamificationApi, leavesApi, announcementsApi, quizApi, calendarApi, aiInsightsApi, deepseekApi } from "@/lib/api";
import { PROJECTS, COMPLEXITY_COLORS } from "@/lib/constants";
import { calculateLevel, cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ProgressRing } from "@/components/ui/progress-ring";
import { StatCard } from "@/components/ui/stat-card";
import { useNotification } from "@/components/ui/primitives";
import CelebrationModal from "./CelebrationModal";
import { FirstEodOnboarding } from "./OnboardingHint";
import type { WorkItem, EodEntry, GamificationData } from "@/lib/types";
import {
  Send, Plus, Trash2, Check, Star, Flame, Trophy, Target,
  TrendingUp, Clock, Calendar, Award, Zap, BookOpen, X, MessageSquare, Sparkles,
} from "lucide-react";

const blankItem: WorkItem = {
  projectName: "", task: "", description: "", plannedQty: 0, actualQty: 0,
  completionPercent: 0, complexity: "Moderate", remarks: "",
};

export default function EmployeeDashboard() {
  const { user, refreshUser } = useAuth();
  const { notify } = useNotification();
  const today = new Date().toISOString().split("T")[0];

  const [entries, setEntries] = useState<EodEntry[]>([]);
  const [gamification, setGamification] = useState<GamificationData | null>(null);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([{ ...blankItem }]);
  const [overallRemarks, setOverallRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [celebration, setCelebration] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "entries">(
    () => (new URLSearchParams(window.location.search).get("tab") === "entries" ? "entries" : "overview")
  );
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveReason, setLeaveReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [quiz, setQuiz] = useState<any>(null);
  const [quizAnswer, setQuizAnswer] = useState("");
  const [quizResult, setQuizResult] = useState<{ correct: boolean; xp: number; explanation: string; correctAnswer: string } | null>(null);
  const [quizStats, setQuizStats] = useState<any>(null);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [quizHistory, setQuizHistory] = useState<any[]>([]);
  const [quizTab, setQuizTab] = useState<"play" | "history">("play");
  const [eodInsights, setEodInsights] = useState<any>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [autoDescribeIdx, setAutoDescribeIdx] = useState<number | null>(null);
  // Chatbot
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([
    { role: "assistant", content: "👋 Hi! I'm your piping engineering assistant. Ask me anything about ASME B31.3, piping design, stress analysis, or calculations!" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [calendar, setCalendar] = useState<any[]>([]);

  const todayEntry = entries.find((e) => e.Date === today);
  const weekEntries = entries.filter((e) => {
    const d = new Date(e.Date);
    const w = new Date();
    w.setDate(w.getDate() - 7);
    return d >= w;
  });

  const weeklyCompletion =
    weekEntries.length > 0
      ? Math.round(weekEntries.reduce((s, e) => s + (e.CompletionPct || 0), 0) / weekEntries.length)
      : 0;

  const levelInfo = gamification
    ? calculateLevel(gamification.xp)
    : { level: 1, currentXp: 0, nextLevelXp: 50, progress: 0, title: "Piping Trainee" };

  const loadData = useCallback(async () => {
    try {
      const [eRes, gRes, lRes, annRes, qStats, calRes, qHist] = await Promise.all([
        entriesApi.list({ employee: user?.name || "" }) as any,
        gamificationApi.get(user?.name || "") as any,
        leavesApi.list({ date: today }) as any,
        announcementsApi.list() as any,
        quizApi.stats(user?.name || "") as any,
        calendarApi.list() as any,
        quizApi.history(user?.name || "") as any,
      ]);
      setEntries(Array.isArray(eRes) ? eRes.sort((a: any, b: any) => b.Date?.localeCompare(a.Date)) : []);
      if (gRes) {
        setGamification(gRes);
        refreshUser({
          ...user!,
          xp: gRes.xp,
          level: gRes.level,
          levelTitle: gRes.levelTitle,
          currentStreak: gRes.currentStreak,
          longestStreak: gRes.longestStreak,
          totalEntries: gRes.totalEntries,
        });
      }
      setLeaves(Array.isArray(lRes) ? lRes : []);
      setAnnouncements(Array.isArray(annRes) ? annRes : []);
      if (qStats) setQuizStats(qStats);
      setCalendar(Array.isArray(calRes) ? calRes : []);
      setQuizHistory(Array.isArray(qHist) ? qHist : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user?.name]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ── Tab state ↔ URL (?tab=…) — enables deep links from the test-mode HUD ── */
  const [searchParams, setSearchParams] = useSearchParams();
  const switchTab = (tab: "overview" | "entries") => {
    setActiveTab(tab);
    setSearchParams(tab === "overview" ? {} : { tab }, { replace: true });
  };
  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "entries" || t === "overview") setActiveTab(t);
  }, [searchParams]);

  const updateItem = (i: number, field: keyof WorkItem, val: any) => {
    const items = [...workItems];
    items[i] = { ...items[i], [field]: val };
    if (field === "plannedQty" || field === "actualQty") {
      const p = field === "plannedQty" ? Number(val) : items[i].plannedQty;
      const a = field === "actualQty" ? Number(val) : items[i].actualQty;
      items[i].completionPercent = p > 0 ? Math.min(999, Math.round((a / p) * 100)) : 0;
    }
    setWorkItems(items);
  };

  const handleSubmit = async () => {
    const valid = workItems.filter((w) => w.projectName.trim() && w.task.trim());
    if (!valid.length) {
      notify({
        title: "Incomplete Work Items",
        description: "Please select a project and provide a task description before submitting.",
        variant: "warning",
      });
      return;
    }
    setSubmitting(true);
    try {
      const res: any = await entriesApi.create({
        EmployeeName: user?.name,
        Date: today,
        workItems: valid,
        OverallRemarks: overallRemarks,
      });
      setCelebration({ xp: res.xp?.amount || 10, streak: (gamification?.currentStreak || 0) + 1 });
      notify({
        title: "EOD Report Submitted",
        description: "Your daily progress entry was saved and XP has been credited.",
        variant: "success",
      });
      await loadData();
      setWorkItems([{ ...blankItem }]);
      setOverallRemarks("");
      // Fetch AI insights
      setLoadingInsights(true);
      try {
        const insights = await aiInsightsApi.eodInsights(user?.name || "", valid);
        setEodInsights(insights);
      } catch {
        // Non-critical
      } finally {
        setLoadingInsights(false);
      }
    } catch (e: any) {
      notify({
        title: "Submission Error",
        description: e.message || "Failed to submit EOD report.",
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkLeave = async () => {
    try {
      await leavesApi.create({ EmployeeName: user?.name, Date: today, Reason: leaveReason, MarkedBy: user?.name });
      setShowLeaveForm(false);
      setLeaveReason("");
      notify({
        title: "Leave Marked",
        description: "Leave recorded for today. Your streak is safeguarded.",
        variant: "info",
      });
      loadData();
    } catch (e: any) {
      notify({
        title: "Leave Error",
        description: e.message || "Failed to mark leave.",
        variant: "error",
      });
    }
  };

  const onLeaveToday = leaves.some((l) => l.EmployeeName === user?.name && l.Date === today);

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
      const gRes: any = await gamificationApi.get(user?.name || "");
      if (gRes) setGamification(gRes);
    } catch (e: any) {
      console.error(e);
    }
  };

  // ── Auto-Describe ──
  const handleAutoDescribe = async (idx: number) => {
    const item = workItems[idx];
    if (!item.task) return;
    setAutoDescribeIdx(idx);
    try {
      const res: any = await deepseekApi.autoDescribe({
        task: item.task,
        project: item.projectName,
        plannedQty: item.plannedQty,
        actualQty: item.actualQty,
        complexity: item.complexity,
      });
      updateItem(idx, "description", res.description || "");
    } catch (e) {
      console.error(e);
    } finally {
      setAutoDescribeIdx(null);
    }
  };

  // ── Chat ──
  const handleChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setChatLoading(true);
    try {
      const res: any = await deepseekApi.chat(userMsg);
      setChatMessages((prev) => [...prev, { role: "assistant", content: res.answer || "I couldn't process that question." }]);
    } catch (e: any) {
      setChatMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleGenerateQuiz = async () => {
    setGeneratingQuiz(true);
    setQuiz(null);
    setQuizAnswer("");
    setQuizResult(null);
    try {
      const res: any = await quizApi.generate(user?.name || "");
      if (res.limitReached) {
        setQuiz({ limitReached: true, count: res.count, limit: res.limit });
      } else {
        setQuiz(res);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setGeneratingQuiz(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--color-border-focus)] border-t-transparent animate-spin" />
          <span className="text-sm text-[var(--color-text-muted)]">Loading your dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 py-5 sm:py-6 lg:py-8 space-y-4 sm:space-y-5 lg:space-y-7">
      {celebration && (
        <CelebrationModal xp={celebration.xp} streak={celebration.streak} onClose={() => setCelebration(null)} />
      )}
      {!todayEntry && !onLeaveToday && entries.length === 0 && <FirstEodOnboarding />}

      {/* ── Top Stats Row — using refined StatCard compound ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
        <StatCard
          icon={<Star className="w-5 h-5 text-[var(--color-progress)]" />}
          label="Total XP"
          value={gamification?.xp || 0}
          color="progress"
          subtitle="All-time points"
        />
        <StatCard
          icon={<Award className="w-5 h-5 text-[var(--color-brand)]" />}
          label={levelInfo.title}
          value={`Level ${levelInfo.level}`}
          color="brand"
          subtitle={`${Math.max(0, Math.round(levelInfo.nextLevelXp - levelInfo.currentXp))} XP to next tier`}
        />
        <StatCard
          icon={<Flame className="w-5 h-5 text-[var(--color-progress)]" />}
          label="Active Streak"
          value={`${gamification?.currentStreak || 0} Day${(gamification?.currentStreak || 0) !== 1 ? "s" : ""}`}
          color="progress"
          subtitle={`Best: ${gamification?.longestStreak || 0} days`}
        />
        <StatCard
          icon={<Check className="w-5 h-5 text-[var(--color-completion)]" />}
          label="Total Reports"
          value={gamification?.totalEntries || 0}
          color="completion"
          subtitle="Verified EOD logs"
        />
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1.5 p-1 bg-[var(--color-surface-raised)] rounded-xl border border-[var(--color-border)] shadow-xs">
          {[
            { id: "overview" as const, label: "Dashboard Overview", icon: <Target className="w-4 h-4" /> },
            { id: "entries" as const, label: "EOD Entry Form", icon: <Send className="w-4 h-4" /> },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer",
                activeTab === t.id
                  ? "bg-[var(--color-surface-default)] text-[var(--color-text-primary)] shadow-xs font-semibold border border-[var(--color-border)]"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-default)]/50"
              )}
            >
              {t.icon}
              <span>{t.label}</span>
              {t.id === "entries" && !todayEntry && !onLeaveToday && (
                <span className="w-2 h-2 rounded-full bg-[var(--color-progress)] animate-pulse-subtle" />
              )}
            </button>
          ))}
        </div>

        <div className="text-xs font-mono text-[var(--color-text-tertiary)] flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          <span>Today: {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
        </div>
      </div>

      {/* ═══════════════════════════ OVERVIEW ═══════════════════════════ */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5 xl:gap-6 stagger-children">
          {/* Today's Mission — full width card */}
          <Card className={cn(
            "lg:col-span-3 border-[var(--color-amber-200)] dark:border-[var(--color-amber-800)] p-0 overflow-hidden shadow-card",
            "bg-[var(--color-surface-progress)]"
          )}>
            <div className="p-5 sm:p-6 lg:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="w-12 h-12 rounded-xl bg-[var(--color-progress)] flex items-center justify-center shadow-sm text-white flex-shrink-0">
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[var(--color-progress)] uppercase tracking-[0.15em]">Daily Mission</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-surface-default)] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                      Due 6:00 PM IST
                    </span>
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-[var(--color-text-primary)] mt-0.5">
                    {todayEntry ? "Daily Progress Logged Successfully" : onLeaveToday ? "On Approved Leave Today" : "Submit Today's Engineering Progress"}
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    {todayEntry
                      ? `Submitted at ${todayEntry.FilledAt || "today"} · +10 XP earned`
                      : onLeaveToday
                      ? "Streak safely paused for today"
                      : "Record planned vs actual quantities to earn XP and extend your momentum"}
                  </p>
                </div>
              </div>

              {!todayEntry && !onLeaveToday ? (
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="px-3.5 py-2 rounded-xl bg-[var(--color-surface-completion)] border border-[var(--color-emerald-200)] dark:border-[var(--color-emerald-800)] text-left shadow-2xs">
                    <div className="text-[11px] font-bold text-[var(--color-completion)]">Early Bird</div>
                    <div className="text-[10px] text-[var(--color-text-secondary)] font-medium">+5 XP before 5 PM</div>
                  </div>
                  <div className="px-3.5 py-2 rounded-xl bg-[var(--color-surface-brand)] border border-[var(--color-brand-200)] dark:border-[var(--color-brand-800)] text-left shadow-2xs">
                    <div className="text-[11px] font-bold text-[var(--color-brand)]">100% Plan</div>
                    <div className="text-[10px] text-[var(--color-text-secondary)] font-medium">+20 XP bonus</div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => switchTab("entries")}
                    className="cursor-pointer shadow-sm"
                  >
                    Log Progress →
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge variant="success" dot>
                    Complete (+10 XP)
                  </Badge>
                </div>
              )}
            </div>
          </Card>

          {/* Progress Ring — Weekly Completion */}
          <Card className="flex flex-col items-center justify-between p-6 bg-[var(--color-surface-default)] shadow-card border border-[var(--color-border)]">
            <CardHeader className="w-full p-0 mb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-[var(--color-text-primary)]">Weekly Completion</CardTitle>
                <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">Rolling 7-day average</p>
              </div>
              <span className="text-xs font-mono text-[var(--color-text-tertiary)]">{weekEntries.length} days active</span>
            </CardHeader>
            <CardContent className="p-0 flex flex-col items-center justify-center my-2">
              <ProgressRing value={weeklyCompletion} size={136} strokeWidth={9} subtitle="Avg %" color="progress" />
            </CardContent>
            <div className="w-full text-center text-xs text-[var(--color-text-secondary)] pt-3 border-t border-[var(--color-border)]">
              {weeklyCompletion >= 80 ? "🔥 Excellent pacing this week" : weeklyCompletion > 0 ? "Targeting 100% completion" : "No entries yet this week"}
            </div>
          </Card>

          {/* Quick Stats */}
          <Card className="p-6 bg-[var(--color-surface-default)] shadow-card border border-[var(--color-border)]">
            <CardHeader className="p-0 mb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-[var(--color-text-primary)]">Performance Pulse</CardTitle>
                <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">Streak and activity status</p>
              </div>
            </CardHeader>
            <CardContent className="p-0 space-y-3.5">
              {[
                { label: "Active Streak", val: `${gamification?.currentStreak || 0} Days`, color: "bg-[var(--color-progress)]", icon: <Flame className="w-3.5 h-3.5 text-white" /> },
                { label: "Longest Streak Record", val: `${gamification?.longestStreak || 0} Days`, color: "bg-[var(--color-brand)]", icon: <Trophy className="w-3.5 h-3.5 text-white" /> },
                { label: "Total Points Accumulated", val: `${gamification?.xp || 0} XP`, color: "bg-[var(--color-progress)]", icon: <Star className="w-3.5 h-3.5 text-white" /> },
                { label: "Verified Submissions", val: `${gamification?.totalEntries || 0}`, color: "bg-[var(--color-completion)]", icon: <Check className="w-3.5 h-3.5 text-white" /> },
              ].map((s) => (
                <div key={s.label} className="flex justify-between items-center py-1 border-b border-[var(--color-border)] last:border-b-0">
                  <div className="flex items-center gap-2.5">
                    <div className={cn("w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0", s.color)}>
                      {s.icon}
                    </div>
                    <span className="text-xs text-[var(--color-text-secondary)] font-medium">{s.label}</span>
                  </div>
                  <span className="font-bold text-xs text-[var(--color-text-primary)] tabular-nums">{s.val}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Level Progression */}
          <Card className="p-6 bg-[var(--color-surface-default)] shadow-card border border-[var(--color-border)]">
            <CardHeader className="p-0 mb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-[var(--color-text-primary)]">Rank & Tier</CardTitle>
                <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">Engineering milestone rank</p>
              </div>
              <Badge variant="secondary">Level {levelInfo.level}</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-13 h-13 rounded-2xl bg-[var(--color-surface-brand)] border border-[var(--color-brand-200)] dark:border-[var(--color-brand-800)] flex items-center justify-center text-[var(--color-brand)] font-black text-xl shadow-xs flex-shrink-0">
                  {levelInfo.level}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-extrabold text-[var(--color-text-primary)] tracking-tight leading-tight truncate">
                    {levelInfo.title}
                  </div>
                  <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    {gamification?.xp || 0} XP earned
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-[var(--color-text-tertiary)]">
                  <span>Level {levelInfo.level}</span>
                  <span className="font-semibold text-[var(--color-text-primary)]">{levelInfo.progress}%</span>
                  <span>Level {levelInfo.level + 1}</span>
                </div>
                <Progress value={levelInfo.progress} color="secondary" size="default" />
              </div>

              <p className="text-xs text-[var(--color-text-secondary)] mt-3.5 leading-relaxed bg-[var(--color-surface-raised)] p-2.5 rounded-lg border border-[var(--color-border)] text-center">
                <strong>{Math.max(0, Math.round(levelInfo.nextLevelXp - levelInfo.currentXp))} XP</strong> required to achieve Level {levelInfo.level + 1}
              </p>
            </CardContent>
          </Card>

          {/* Badges — full width */}
          <Card className="lg:col-span-3 p-6 bg-[var(--color-surface-default)] shadow-card border border-[var(--color-border)] overflow-hidden">
            <CardHeader className="p-0 mb-4 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-progress)] flex items-center justify-center text-[var(--color-progress)]">
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-[var(--color-text-primary)]">Earned Badges & Distinctions</CardTitle>
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">Milestone trophies unlocked through consistent excellence</p>
                </div>
              </div>
              <span className="text-xs font-mono text-[var(--color-text-tertiary)]">
                {gamification?.badges?.length || 0} Unlocked
              </span>
            </CardHeader>
            <CardContent className="p-0">
              {gamification?.badges && gamification.badges.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {gamification.badges.map((b) => (
                    <div
                      key={b.id}
                      className={cn(
                        "p-3 rounded-xl border text-center transition-all duration-200 card-interactive cursor-default",
                        b.IsNew
                          ? "border-[var(--color-amber-200)] dark:border-[var(--color-amber-800)] bg-[var(--color-surface-progress)] shadow-xs"
                          : "border-[var(--color-border)] bg-[var(--color-surface-raised)]"
                      )}
                    >
                      <div className="text-2xl mb-1.5">
                        {b.BadgeName?.includes("Streak") ? "🔥" : b.BadgeName?.includes("Entry") || b.BadgeName?.includes("100") ? "🏆" : b.BadgeName?.includes("Early") ? "⚡" : "⭐"}
                      </div>
                      <div className="text-[11px] font-semibold text-[var(--color-text-primary)] leading-tight truncate">{b.BadgeName}</div>
                      <div className="text-[9px] text-[var(--color-text-tertiary)] mt-0.5">Badge Earned</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-[var(--color-surface-raised)] rounded-xl border border-dashed border-[var(--color-border)]">
                  <Trophy className="w-8 h-8 text-[var(--color-text-tertiary)] mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-semibold text-[var(--color-text-secondary)]">No badges unlocked yet</p>
                  <p className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5">Submit 3 consecutive EODs or complete 100% of planned work to unlock your first trophy!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Engineering Quiz — full width */}
          <Card className="lg:col-span-3 bg-[var(--color-surface-default)] shadow-card border border-[var(--color-border)] overflow-hidden">
            <CardContent className="p-5 lg:p-7">
              {/* Header with tabs */}
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-brand)] flex items-center justify-center text-[var(--color-brand)]">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-[var(--color-text-primary)]">Technical Domain Challenge</span>
                    <p className="text-xs text-[var(--color-text-tertiary)]">Piping engineering standards & codes</p>
                  </div>
                </div>
                <div className="flex gap-1 p-0.5 bg-[var(--color-surface-raised)] rounded-lg border border-[var(--color-border)]">
                  {(["play", "history"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setQuizTab(tab)}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
                        quizTab === tab ? "bg-[var(--color-surface-default)] text-[var(--color-brand)] shadow-xs border border-[var(--color-border)]" : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]",
                      )}
                    >
                      {tab === "play" ? "Challenge" : `Past Attempts (${quizHistory.length})`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stats bar */}
              {quizStats && (
                <div className="flex gap-2.5 mb-4 flex-wrap">
                  <div className="px-3 py-1 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-xs font-medium">
                    <span className="text-[var(--color-text-tertiary)]">Score:</span>{" "}
                    <span className="text-[var(--color-text-primary)] font-bold">{quizStats.correct}/{quizStats.total}</span>
                  </div>
                  <div className="px-3 py-1 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-xs font-medium">
                    <span className="text-[var(--color-text-tertiary)]">Accuracy:</span>{" "}
                    <span className="text-[var(--color-text-primary)] font-bold">{quizStats.accuracy}%</span>
                  </div>
                  <div className="px-3 py-1 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-xs font-medium">
                    <span className="text-[var(--color-text-tertiary)]">Completed:</span>{" "}
                    <span className="text-[var(--color-text-primary)] font-bold">{quizStats.uniqueQuestions} unique</span>
                  </div>
                </div>
              )}

              {/* Play Tab */}
              {quizTab === "play" && (
                generatingQuiz ? (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <div className="w-8 h-8 rounded-full border-2 border-[var(--color-brand)] border-t-transparent animate-spin" />
                    <span className="text-sm text-[var(--color-brand)] font-medium">Generating technical question…</span>
                    <span className="text-xs text-[var(--color-text-tertiary)]">Tailored to ASME B31.3 & process piping standards</span>
                  </div>
                ) : quiz?.limitReached ? (
                  <div className="text-center py-6 bg-[var(--color-surface-raised)] rounded-xl border border-[var(--color-border)]">
                    <div className="text-3xl mb-2">🎯</div>
                    <p className="text-sm font-bold text-[var(--color-text-primary)]">Daily Challenge Limit Reached</p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">You have answered {quiz.count}/{quiz.limit} questions today. More will unlock tomorrow!</p>
                    <div className="mt-3 flex justify-center">
                      <button onClick={() => setQuizTab("history")} className="px-4 py-2 rounded-lg bg-[var(--color-brand)] text-white text-xs font-medium cursor-pointer">
                        Review Answer History
                      </button>
                    </div>
                  </div>
                ) : quiz && quiz.options ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      {quiz.difficulty && (
                        <span className={cn(
                          "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider",
                          quiz.difficulty === "Easy" && "bg-[var(--color-surface-completion)] text-[var(--color-completion)] border border-[var(--color-emerald-200)] dark:border-[var(--color-emerald-800)]",
                          quiz.difficulty === "Medium" && "bg-[var(--color-surface-progress)] text-[var(--color-progress)] border border-[var(--color-amber-200)] dark:border-[var(--color-amber-800)]",
                          quiz.difficulty === "Hard" && "bg-[var(--color-surface-alert)] text-[var(--color-alert)] border border-[var(--color-red-200)] dark:border-[var(--color-red-800)]",
                        )}>{quiz.difficulty}</span>
                      )}
                      {quiz.category && (
                        <span className="px-2 py-0.5 rounded-md bg-[var(--color-surface-raised)] text-[10px] font-semibold text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                          {quiz.category}
                        </span>
                      )}
                      {quiz.remaining !== undefined && (
                        <span className="ml-auto text-[11px] font-medium text-[var(--color-brand)]">
                          {quiz.remaining} attempts remaining today
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--color-text-primary)] leading-relaxed font-semibold">{quiz.question}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                              "p-3 rounded-xl text-left text-sm font-medium transition-all duration-200 border",
                              !quizResult && "hover:border-[var(--color-brand)] hover:bg-[var(--color-surface-raised)] cursor-pointer",
                              !!quizResult && "cursor-default",
                              isCorrect && "border-[var(--color-emerald-200)] dark:border-[var(--color-emerald-800)] bg-[var(--color-surface-completion)] text-[var(--color-completion)] font-bold",
                              isWrong && "border-[var(--color-red-200)] dark:border-[var(--color-red-800)] bg-[var(--color-surface-alert)] text-[var(--color-alert)]",
                              !isSelected && !isCorrect && !isWrong && "border-[var(--color-border)] bg-[var(--color-surface-default)] text-[var(--color-text-secondary)]",
                            )}
                          >
                            <span className="text-xs font-bold text-[var(--color-text-tertiary)] mr-2">{key}.</span>
                            <span>{String(val)}</span>
                          </button>
                        );
                      })}
                    </div>
                    {quizResult && (
                      <div className="space-y-2.5 pt-2">
                        <div className={cn(
                          "p-3 rounded-xl text-sm font-medium border",
                          quizResult.correct
                            ? "bg-[var(--color-surface-completion)] text-[var(--color-completion)] border-[var(--color-emerald-200)] dark:border-[var(--color-emerald-800)]"
                            : "bg-[var(--color-surface-alert)] text-[var(--color-alert)] border-[var(--color-red-200)] dark:border-[var(--color-red-800)]",
                        )}>
                          {quizResult.correct ? `Correct! +${quizResult.xp} XP earned` : `Incorrect. The correct answer is ${quizResult.correctAnswer}.`}
                        </div>
                        {quizResult.explanation && (
                          <div className="p-3.5 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
                            <p className="text-xs font-bold text-[var(--color-brand)] mb-1 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5" /> Technical Explanation
                            </p>
                            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{quizResult.explanation}</p>
                          </div>
                        )}
                        <Button
                          onClick={handleGenerateQuiz}
                          className="w-full cursor-pointer"
                        >
                          Next Question →
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <p className="text-sm text-[var(--color-text-secondary)]">Test and build your domain mastery with questions on piping codes and specifications.</p>
                    <Button
                      onClick={handleGenerateQuiz}
                      className="cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 mr-2" /> Start Technical Challenge
                    </Button>
                  </div>
                )
              )}

              {/* History Tab */}
              {quizTab === "history" && (
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {quizHistory.length === 0 ? (
                    <p className="text-sm text-[var(--color-text-tertiary)] text-center py-8">No challenges answered yet. Start a session!</p>
                  ) : (
                    quizHistory.map((h) => (
                      <div key={h.id} className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs sm:text-sm text-[var(--color-text-primary)] font-medium leading-snug flex-1">{h.Question}</p>
                          <div className="flex gap-1.5 flex-shrink-0">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold",
                              h.IsCorrect ? "bg-[var(--color-surface-completion)] text-[var(--color-completion)]" : "bg-[var(--color-surface-alert)] text-[var(--color-alert)]",
                            )}>{h.IsCorrect ? "Correct" : "Missed"}</span>
                          </div>
                        </div>
                        {h.Explanation && (
                          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed bg-[var(--color-surface-default)] rounded-lg p-2.5 border border-[var(--color-border)]">
                            {h.Explanation}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-tertiary)]">
                          {h.AnsweredAt && <span>{new Date(h.AnsweredAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</span>}
                          {h.XpEarned > 0 && <span className="text-[var(--color-progress)] font-bold">+{h.XpEarned} XP</span>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Announcements Live Feed — full width */}
          {announcements.length > 0 && (
            <Card className="lg:col-span-3 p-6 bg-[var(--color-surface-default)] shadow-card border border-[var(--color-border)]">
              <CardHeader className="p-0 mb-4 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-progress)] flex items-center justify-center text-[var(--color-progress)]">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-[var(--color-text-primary)]">Live Team Pulse</CardTitle>
                    <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">Real-time milestones and submission stream</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {announcements.slice(0, 10).map((ann) => (
                    <div key={ann.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-[var(--color-surface-raised)] transition-colors border border-transparent hover:border-[var(--color-border)]">
                      <div className={cn(
                        "w-2 h-2 rounded-full mt-2 flex-shrink-0 animate-pulse-subtle",
                        ann.Type === "entry" && "bg-[var(--color-completion)]",
                        ann.Type === "leave" && "bg-[var(--color-progress)]",
                        ann.Type === "badge" && "bg-[var(--color-progress)]",
                        ann.Type === "system" && "bg-[var(--color-brand)]",
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] leading-snug">
                          <strong className="font-semibold text-[var(--color-text-primary)]">{ann.EmployeeName}</strong>
                          {" "}{ann.Message}
                        </p>
                        {ann.Timestamp && (
                          <span className="text-[10px] text-[var(--color-text-tertiary)] font-mono block mt-0.5">
                            {new Date(ann.Timestamp).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ═══════════════════════════ EOD ENTRY TAB ═══════════════════════════ */}          {activeTab === "entries" && (
        <div className="max-w-4xl lg:max-w-5xl space-y-5 sm:space-y-6 animate-fade-in">
          {/* Leave button */}
          {!todayEntry && !onLeaveToday && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowLeaveForm(!showLeaveForm)}>
                📅 Mark Leave for Today
              </Button>
            </div>
          )}

          {showLeaveForm && (
            <Card className="border-[var(--color-amber-200)] ">
              <CardContent className="p-5 flex gap-3 items-end">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block">Reason (optional)</label>
                  <Input value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} placeholder="e.g., Sick leave" />
                </div>
                <Button onClick={handleMarkLeave} className="bg-[var(--color-progress)] hover:brightness-90">Confirm Leave</Button>
                <Button variant="ghost" onClick={() => setShowLeaveForm(false)}><X className="w-4 h-4" /></Button>
              </CardContent>
            </Card>
          )}

          {onLeaveToday ? (
            <Card className="border-[var(--color-amber-200)] bg-[var(--color-surface-progress)]">
              <CardContent className="p-12 text-center">
                <Calendar className="w-14 h-14 text-[var(--color-progress)] mx-auto mb-4" />
                <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">On Leave Today</h3>
                <p className="text-sm text-[var(--color-text-muted)]">No EOD submission needed for today.</p>
              </CardContent>
            </Card>
          ) : todayEntry ? (
            /* Already submitted today */
            <>
            <Card className=" overflow-hidden">
              <CardHeader className="px-6 py-5 lg:px-8">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-[var(--color-completion)] lg:text-lg">
                    <Check className="w-5 h-5" /> Today's Entry Submitted
                  </CardTitle>
                  <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5 font-mono">
                    <Clock className="w-3 h-3" /> {todayEntry.FilledAt}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="px-6 lg:px-8 pb-6 lg:pb-8">
                <div className="grid grid-cols-3 gap-5 lg:gap-7 text-center mb-5">
                  <div className="p-3 rounded-xl bg-[var(--color-surface-progress)]">
                    <div className="text-2xl font-bold text-[var(--color-progress)] tabular-nums">{todayEntry.PlannedQty}</div>
                    <div className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider mt-1">Planned</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--color-surface-completion)]">
                    <div className="text-2xl font-bold text-[var(--color-completion)] tabular-nums">{todayEntry.ActualQty}</div>
                    <div className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider mt-1">Actual</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--color-surface-raised)]">
                    <div className="text-2xl font-bold text-[var(--color-text-primary)] tabular-nums">{todayEntry.CompletionPct}%</div>
                    <div className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider mt-1">Completion</div>
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-sm">
                  <span className="font-semibold text-[var(--color-text-secondary)]">{todayEntry.Project}</span>
                  <span className="text-[var(--color-text-muted)] mx-2">·</span>
                  <span className="text-[var(--color-text-secondary)]">{todayEntry.Task}</span>
                </div>
                {todayEntry.Rating && (
                  <div className="mt-3 text-sm text-[var(--color-text-muted)]">
                    Rating:{" "}
                    <Badge variant={todayEntry.Rating === "E" ? "success" : todayEntry.Rating === "N" ? "destructive" : "secondary"}>
                      {todayEntry.Rating}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
            {/* AI EOD Insights */}
            {loadingInsights && (
              <Card className="border-[var(--color-brand-200)]  overflow-hidden">
                <CardContent className="p-5 flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full border-2 border-[var(--color-brand-200)] border-t-transparent animate-spin" />
                  <span className="text-sm text-[var(--color-brand)] font-medium">AI is analyzing your entry...</span>
                </CardContent>
              </Card>
            )}
            {eodInsights && !loadingInsights && (
              <Card className="border-[var(--color-brand-200)] bg-[var(--color-surface-brand)]  overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-[var(--color-brand-600)]">
                    🤖 AI Insights
                    <span className="ml-auto text-xs font-normal text-[var(--color-text-muted)] normal-case">
                      Powered by GPT-OSS-20B
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm",
                      eodInsights.productivityScore >= 7 ? "bg-[var(--color-completion)]" : eodInsights.productivityScore >= 4 ? "bg-[var(--color-progress)]" : "bg-[var(--color-alert)]",
                    )}>{eodInsights.productivityScore}/10</div>
                    <div>
                      <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase">Productivity Score</p>
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">{eodInsights.summary}</p>
                    </div>
                  </div>
                  {eodInsights.highlights?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-[var(--color-completion)] uppercase">Highlights</p>
                      {eodInsights.highlights.map((h: string, i: number) => (
                        <p key={i} className="text-xs text-[var(--color-text-secondary)] pl-3">✅ {h}</p>
                      ))}
                    </div>
                  )}
                  {eodInsights.suggestions?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-[var(--color-progress)] uppercase">Suggestions</p>
                      {eodInsights.suggestions.map((s: string, i: number) => (
                        <p key={i} className="text-xs text-[var(--color-text-secondary)] pl-3">💡 {s}</p>
                      ))}
                    </div>
                  )}
                  {eodInsights.complexityAnalysis && (
                    <p className="text-[11px] text-[var(--color-text-muted)] bg-[var(--color-surface-raised)] rounded-lg px-3 py-2">
                      📊 {eodInsights.complexityAnalysis}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
            </>
          ) : (
            /* EOD Form */
            <Card className="shadow-card border border-[var(--color-border)] bg-[var(--color-surface-default)] overflow-hidden">
              <CardHeader className="px-5 py-4 lg:px-8 lg:py-5 border-b border-[var(--color-border)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-progress)] flex items-center justify-center text-[var(--color-progress)]">
                      <Send className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base lg:text-lg font-bold">Daily Engineering Progress Log</CardTitle>
                      <p className="text-xs text-[var(--color-text-tertiary)]">Record tasks, planned vs actual output, and complexity</p>
                    </div>
                  </div>
                  <Badge variant="default" dot>+10 XP Base Reward</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 px-4 sm:px-6 lg:px-8 py-6">
                {workItems.map((item, i) => (
                  <div
                    key={i}
                    className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] space-y-4 shadow-2xs"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[var(--color-brand)] text-white text-[10px] font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <h4 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider">
                          Project Work Item #{i + 1}
                        </h4>
                      </div>
                      {workItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setWorkItems(workItems.filter((_, j) => j !== i))}
                          className="text-[var(--color-text-tertiary)] hover:text-[var(--color-alert)] transition-colors p-1.5 rounded-lg hover:bg-[var(--color-surface-alert)] cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 lg:gap-5">
                      <div>
                        <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block">Project Name *</label>
                        <select
                          value={item.projectName}
                          onChange={(e) => updateItem(i, "projectName", e.target.value)}
                          className="w-full h-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-default)] px-3.5 text-sm text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-border-focus)]/30 focus:border-[var(--color-border-focus)] outline-none transition-all cursor-pointer"
                        >
                          <option value="">Select project...</option>
                          {PROJECTS.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block">Task Description *</label>
                        <Input
                          value={item.task}
                          onChange={(e) => updateItem(i, "task", e.target.value)}
                          placeholder="e.g., Isometric drafting, line sizing..."
                        />
                      </div>
                      <div className="md:col-span-2">
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Detailed Remarks / Deliverables</label>
                          <button
                            type="button"
                            onClick={() => handleAutoDescribe(i)}
                            disabled={!item.task || autoDescribeIdx === i}
                            className="text-[11px] font-bold text-[var(--color-brand)] hover:brightness-110 disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
                          >
                            {autoDescribeIdx === i ? (
                              <><div className="w-3 h-3 rounded-full border border-[var(--color-brand)] border-t-transparent animate-spin" /> AI Generating...</>
                            ) : (<><Sparkles className="w-3 h-3" /> Auto-Generate Description</>)}
                          </button>
                        </div>
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(i, "description", e.target.value)}
                          placeholder="Brief technical summary or click Auto-Generate..."
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block">Planned Output Quantity</label>
                        <Input
                          type="number"
                          value={item.plannedQty || ""}
                          onChange={(e) => updateItem(i, "plannedQty", Number(e.target.value))}
                          placeholder="Planned count/hours"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block">Actual Accomplished Quantity</label>
                        <Input
                          type="number"
                          value={item.actualQty || ""}
                          onChange={(e) => updateItem(i, "actualQty", Number(e.target.value))}
                          placeholder="Actual achieved"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block">Task Complexity</label>
                        <select
                          value={item.complexity}
                          onChange={(e) => updateItem(i, "complexity", e.target.value)}
                          className="w-full h-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-default)] px-3.5 text-sm text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-border-focus)]/30 focus:border-[var(--color-border-focus)] outline-none transition-all cursor-pointer"
                        >
                          <option>Low</option>
                          <option>Moderate</option>
                          <option>High</option>
                        </select>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                            Completion Rate
                          </label>
                          <span className={cn(
                            "text-xs font-bold tabular-nums",
                            item.completionPercent >= 100 ? "text-[var(--color-completion)]" : "text-[var(--color-progress)]"
                          )}>
                            {item.completionPercent}%
                          </span>
                        </div>
                        <Progress
                          value={item.completionPercent}
                          color={item.completionPercent >= 100 ? "accent" : "primary"}
                          size="default"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setWorkItems([...workItems, { ...blankItem }])}
                  className="w-full border-dashed cursor-pointer py-3"
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Another Work Item
                </Button>

                <div>
                  <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block">Overall Notes / Observations</label>
                  <textarea
                    value={overallRemarks}
                    onChange={(e) => setOverallRemarks(e.target.value)}
                    placeholder="Any challenges, hold-ups, or notes for your team lead..."
                    className="w-full h-24 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:ring-2 focus:ring-[var(--color-border-focus)]/30 focus:border-[var(--color-border-focus)] outline-none resize-none transition-all"
                  />
                </div>

                <Button
                  type="button"
                  onClick={handleSubmit}
                  loading={submitting}
                  className="w-full shadow-md cursor-pointer text-base py-3"
                  size="lg"
                >
                  <Send className="w-4 h-4 mr-2" /> Submit Daily EOD (+10 XP)
                </Button>
              </CardContent>
            </Card>
          )}

          {/* History */}
          {entries.length > 0 && (
            <Card className="shadow-card border border-[var(--color-border)] bg-[var(--color-surface-default)] overflow-hidden">
              <CardHeader className="px-5 py-4 lg:px-8 lg:py-5 border-b border-[var(--color-border)] flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base lg:text-lg font-bold text-[var(--color-text-primary)]">Submission History</CardTitle>
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">Your verified log of daily EOD reports</p>
                </div>
                <span className="text-xs font-mono text-[var(--color-text-tertiary)]">{entries.length} Total Logs</span>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-wider bg-[var(--color-surface-raised)] border-b border-[var(--color-border)]">
                        <th className="py-3 px-4 font-semibold">Date</th>
                        <th className="py-3 px-4 font-semibold">Project</th>
                        <th className="py-3 px-4 font-semibold">Task</th>
                        <th className="py-3 px-4 font-semibold text-right">Planned</th>
                        <th className="py-3 px-4 font-semibold text-right">Actual</th>
                        <th className="py-3 px-4 font-semibold text-right">Rate</th>
                        <th className="py-3 px-4 font-semibold text-center">Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.slice(0, 30).map((e, idx) => (
                        <tr
                          key={e.id}
                          className={cn(
                            "border-b border-[var(--color-border)] hover:bg-[var(--color-surface-raised)] transition-colors",
                            idx % 2 === 1 && "bg-[var(--color-surface-raised)]/40"
                          )}
                        >
                          <td className="py-3 px-4 font-mono text-xs text-[var(--color-text-secondary)] whitespace-nowrap">{e.Date}</td>
                          <td className="py-3 px-4 font-semibold text-[var(--color-text-primary)]">{e.Project}</td>
                          <td className="py-3 px-4 text-[var(--color-text-secondary)] max-w-xs truncate">{e.Task}</td>
                          <td className="py-3 px-4 font-mono tabular-nums text-right text-[var(--color-text-secondary)]">{e.PlannedQty}</td>
                          <td className="py-3 px-4 font-mono tabular-nums text-right text-[var(--color-text-secondary)]">{e.ActualQty}</td>
                          <td className="py-3 px-4 font-mono tabular-nums font-semibold text-right text-[var(--color-text-primary)]">{e.CompletionPct}%</td>
                          <td className="py-3 px-4 text-center">
                            {e.Rating ? (
                              <Badge variant={e.Rating === "E" ? "success" : e.Rating === "N" ? "destructive" : "secondary"}>
                                {e.Rating}
                              </Badge>
                            ) : (
                              <span className="text-xs text-[var(--color-text-tertiary)]">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Floating Chatbot ── */}
      <div className="fixed bottom-6 right-6 z-50">
        {chatOpen && (
          <div className="mb-3 w-80 sm:w-96 bg-[var(--color-surface-default)] rounded-2xl shadow-card-hover border border-[var(--color-border)] overflow-hidden rise-in">
            <div className="p-3.5 bg-[var(--color-brand)] text-white flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold">Piping Knowledge Copilot</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-completion)] animate-pulse" />
                  </div>
                  <span className="text-[10px] text-white/80 block leading-none">ASME B31.3 & Standards</span>
                </div>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="text-white/80 hover:text-white p-1 cursor-pointer transition-colors"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="h-72 overflow-y-auto p-3.5 space-y-3 bg-[var(--color-surface-raised)]/30">
              {chatMessages.map((msg, i) => (
                <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs",
                    msg.role === "user"
                      ? "bg-[var(--color-brand)] text-white rounded-br-xs"
                      : "bg-[var(--color-surface-default)] text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-bl-xs",
                  )}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-[var(--color-surface-default)] border border-[var(--color-border)] px-4 py-3 rounded-2xl rounded-bl-xs flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand)] animate-typing-dot-1" />
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand)] animate-typing-dot-2" />
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand)] animate-typing-dot-3" />
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-[var(--color-surface-default)] border-t border-[var(--color-border)]">
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleChat()}
                  placeholder="Ask piping questions, calculations..."
                  className="flex-1 h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-input)] text-xs sm:text-sm outline-none focus:border-[var(--color-border-focus)] transition-all"
                />
                <button
                  onClick={handleChat}
                  disabled={!chatInput.trim() || chatLoading}
                  className="w-9 h-9 rounded-xl bg-[var(--color-brand)] hover:brightness-105 active:scale-95 text-white flex items-center justify-center disabled:opacity-40 cursor-pointer transition-all shadow-xs"
                  aria-label="Send message"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => setChatOpen(!chatOpen)}
          className={cn(
            "w-13 h-13 rounded-2xl shadow-card-hover flex items-center justify-center transition-all duration-300 cursor-pointer",
            chatOpen
              ? "bg-[var(--color-surface-default)] border border-[var(--color-border)] text-[var(--color-text-primary)] rotate-90"
              : "bg-[var(--color-brand)] text-white hover:brightness-105 hover:shadow-[var(--shadow-glow-brand)]",
          )}
          aria-label={chatOpen ? "Close chat" : "Open piping assistant"}
        >
          {chatOpen ? <X className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
