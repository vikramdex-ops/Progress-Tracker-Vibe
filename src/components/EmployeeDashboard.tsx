import { useState, useEffect, useCallback } from "react";
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
import CelebrationModal from "./CelebrationModal";
import type { WorkItem, EodEntry, GamificationData } from "@/lib/types";
import {
  Send, Plus, Trash2, Check, Star, Flame, Trophy, Target,
  TrendingUp, Clock, Calendar, Award, Zap, BookOpen, X,
} from "lucide-react";

const blankItem: WorkItem = {
  projectName: "", task: "", description: "", plannedQty: 0, actualQty: 0,
  completionPercent: 0, complexity: "Moderate", remarks: "",
};

export default function EmployeeDashboard() {
  const { user, refreshUser } = useAuth();
  const today = new Date().toISOString().split("T")[0];

  const [entries, setEntries] = useState<EodEntry[]>([]);
  const [gamification, setGamification] = useState<GamificationData | null>(null);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([{ ...blankItem }]);
  const [overallRemarks, setOverallRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [celebration, setCelebration] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "entries">("overview");
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
    { role: "assistant", content: "👋 Hi! I'm your piping engineering assistant. Ask me anything about codes, standards, design, or calculations!" },
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
    const valid = workItems.filter((w) => w.projectName && w.task);
    if (!valid.length) return;
    setSubmitting(true);
    try {
      const res: any = await entriesApi.create({
        EmployeeName: user?.name,
        Date: today,
        workItems: valid,
        OverallRemarks: overallRemarks,
      });
      setCelebration({ xp: res.xp?.amount || 10, streak: (gamification?.currentStreak || 0) + 1 });
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
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkLeave = async () => {
    try {
      await leavesApi.create({ EmployeeName: user?.name, Date: today, Reason: leaveReason, MarkedBy: user?.name });
      setShowLeaveForm(false);
      setLeaveReason("");
      loadData();
    } catch (e: any) {
      alert(e.message);
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
          <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
          <span className="text-sm text-[var(--color-text-muted)]">Loading your dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-14 py-6 lg:py-8 space-y-5 lg:space-y-7">
      {celebration && (
        <CelebrationModal xp={celebration.xp} streak={celebration.streak} onClose={() => setCelebration(null)} />
      )}

      {/* ── Top Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5 stagger-children">
        {[
          { icon: <Star className="w-5 h-5" />, label: "Total XP", value: `${gamification?.xp || 0}`, color: "amber", gradient: "from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/10" },
          { icon: <Award className="w-5 h-5" />, label: levelInfo.title, value: `Level ${levelInfo.level}`, color: "indigo", gradient: "from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/10" },
          { icon: <Flame className="w-5 h-5" />, label: "Current Streak", value: `${gamification?.currentStreak || 0} day${(gamification?.currentStreak || 0) !== 1 ? "s" : ""}`, color: "orange", gradient: "from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/10" },
          { icon: <Check className="w-5 h-5" />, label: "Total Entries", value: `${gamification?.totalEntries || 0}`, color: "emerald", gradient: "from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/10" },
        ].map((stat) => (
          <Card key={stat.label} className={cn("bg-gradient-to-br card-hover shadow-sm border border-[var(--color-border)]/40 p-4 lg:p-5", stat.gradient)}>
            <div className="flex items-center gap-3 lg:gap-4">
              <div className={cn("w-11 h-11 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm",
                stat.color === "amber" && "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
                stat.color === "indigo" && "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
                stat.color === "orange" && "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
                stat.color === "emerald" && "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
              )}>
                {stat.icon}
              </div>
              <div className="min-w-0">
                <div className="text-xl lg:text-2xl font-extrabold text-[var(--color-text-primary)] tabular-nums leading-none">{stat.value}</div>
                <div className="text-[10px] lg:text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest leading-tight mt-1">{stat.label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1.5 p-1 bg-[var(--color-surface-hover)] rounded-xl w-fit border border-[var(--color-border)]/50">
        {[
          { id: "overview" as const, label: "Overview", icon: <Target className="w-4 h-4" /> },
          { id: "entries" as const, label: "EOD Entry", icon: <Send className="w-4 h-4" /> },
        ].map((t) => (
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

      {/* ═══════════════════════════ OVERVIEW ═══════════════════════════ */}
      {activeTab === "overview" && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 stagger-children">
          {/* Today's Mission — full width */}
          <Card className={cn(
            "lg:col-span-3 border-amber-200/60 dark:border-amber-800/30 p-0 overflow-hidden",
            "bg-gradient-to-r from-amber-50/80 via-orange-50/40 to-amber-50/60 dark:from-amber-950/15 dark:via-orange-950/10 dark:to-amber-950/15"
          )}>
            <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 flex-shrink-0">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-bold text-amber-600 uppercase tracking-[0.15em] mb-0.5">Today's Mission</div>
                <div className="text-lg font-bold text-[var(--color-text-primary)]">
                  {todayEntry || onLeaveToday ? "✅ Mission Complete!" : "Complete today's EOD entry"}
                </div>
                <div className="text-sm text-amber-500 font-semibold mt-0.5">
                  {todayEntry || onLeaveToday ? "+10 XP earned" : "+10 XP reward"}
                </div>
              </div>
              {!todayEntry && !onLeaveToday && (
                <div className="flex gap-2.5">
                  <div className="px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/30 text-center">
                    <div className="text-[11px] font-bold text-emerald-600">⚡ Early Bird</div>
                    <div className="text-[10px] text-emerald-500 font-medium">+5 XP before 5 PM</div>
                  </div>
                  <div className="px-4 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/30 text-center">
                    <div className="text-[11px] font-bold text-indigo-600">🎯 100% Plan</div>
                    <div className="text-[10px] text-indigo-500 font-medium">+20 XP bonus</div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Progress Ring */}
          <Card className="flex flex-col items-center justify-center card-hover shadow-sm border border-[var(--color-border)]/40">
            <CardHeader className="w-full"><CardTitle className="text-sm lg:text-[15px] font-bold">THIS WEEK</CardTitle></CardHeader>
            <CardContent className="pb-2">
              <ProgressRing value={weeklyCompletion} size={140} strokeWidth={10} />
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="card-hover shadow-sm border border-[var(--color-border)]/40">
            <CardHeader><CardTitle className="text-sm lg:text-[15px] font-bold">Quick Stats</CardTitle></CardHeader>
            <CardContent className="space-y-3.5">
              {[
                { emoji: "🔥", label: "Current Streak", val: `${gamification?.currentStreak || 0} day${(gamification?.currentStreak || 0) !== 1 ? "s" : ""}` },
                { emoji: "⭐", label: "Total XP", val: `${gamification?.xp || 0}` },
                { emoji: "🏆", label: "Best Streak", val: `${gamification?.longestStreak || 0} day${(gamification?.longestStreak || 0) !== 1 ? "s" : ""}` },
                { emoji: "📊", label: "Entries", val: `${gamification?.totalEntries || 0}` },
              ].map((s) => (
                <div key={s.label} className="flex justify-between items-center">
                  <span className="text-sm text-[var(--color-text-secondary)]">{s.emoji} {s.label}</span>
                  <span className="font-bold text-sm text-[var(--color-text-primary)] tabular-nums">{s.val}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Level Progression */}
          <Card className="card-hover shadow-sm border border-[var(--color-border)]/40">
            <CardHeader><CardTitle className="text-sm lg:text-[15px] font-bold">Level Progression</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/20 flex-shrink-0">
                  {levelInfo.level}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-bold text-[var(--color-text-primary)] leading-tight">{levelInfo.title}</div>
                  <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">Level {levelInfo.level}</div>
                  <Progress value={levelInfo.progress} color="secondary" className="mt-2.5" />
                </div>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] font-medium">
                {Math.round(levelInfo.nextLevelXp - levelInfo.currentXp)} XP to Level {levelInfo.level + 1}
              </p>
            </CardContent>
          </Card>

          {/* Badges — full width */}
          <Card className="lg:col-span-3 card-hover shadow-sm border border-[var(--color-border)]/40 overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" /> YOUR ACHIEVEMENTS
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 lg:px-8 pb-6 lg:pb-8">
              {gamification?.badges && gamification.badges.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-8 gap-3 lg:gap-4">
                  {gamification.badges.map((b) => (
                    <div
                      key={b.id}
                      className={cn(
                        "p-3.5 rounded-2xl border text-center transition-all duration-200 card-hover cursor-default",
                        b.IsNew
                          ? "border-amber-300/60 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800/30 shadow-sm shadow-amber-200/30"
                          : "border-[var(--color-border)] bg-[var(--color-surface-hover)]"
                      )}
                    >
                      <div className="text-2xl mb-1.5">
                        {b.BadgeName?.includes("Streak") ? "🔥" : b.BadgeName?.includes("Entry") || b.BadgeName?.includes("100") ? "🏆" : b.BadgeName?.includes("Early") ? "⚡" : "⭐"}
                      </div>
                      <div className="text-[10px] font-semibold text-[var(--color-text-secondary)] leading-tight">{b.BadgeName}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--color-text-muted)] text-center py-8">No badges yet. Keep going!</p>
              )}
            </CardContent>
          </Card>

          {/* AI Engineering Quiz — full width */}
          <Card className="lg:col-span-3 card-hover shadow-sm bg-gradient-to-r from-indigo-50 to-purple-50/30 dark:from-indigo-950/20 dark:to-purple-950/10 border border-indigo-200/60 dark:border-indigo-800/30 overflow-hidden">
            <CardContent className="p-5 lg:p-7">
              {/* Header with tabs */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-indigo-500" />
                  </div>
                  <span className="text-[10px] font-bold tracking-[0.15em] text-[var(--color-text-muted)] uppercase">🤖 AI PIPING QUIZ</span>
                </div>
                <div className="flex gap-1 p-0.5 bg-[var(--color-surface-hover)] rounded-lg">
                  {(["play", "history"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setQuizTab(tab)}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-[10px] font-bold transition-all",
                        quizTab === tab ? "bg-indigo-500 text-white shadow-sm" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
                      )}
                    >
                      {tab === "play" ? "🎯 Play" : `📖 History (${quizHistory.length})`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stats bar */}
              {quizStats && (
                <div className="flex gap-3 mb-4 flex-wrap">
                  <div className="px-3 py-1.5 rounded-lg bg-[var(--color-surface-hover)] text-[10px] font-semibold">
                    <span className="text-[var(--color-text-muted)]">Score:</span>{" "}
                    <span className="text-[var(--color-text-primary)]">{quizStats.correct}/{quizStats.total}</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-[var(--color-surface-hover)] text-[10px] font-semibold">
                    <span className="text-[var(--color-text-muted)]">Accuracy:</span>{" "}
                    <span className="text-[var(--color-text-primary)]">{quizStats.accuracy}%</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-[var(--color-surface-hover)] text-[10px] font-semibold">
                    <span className="text-[var(--color-text-muted)]">Unique:</span>{" "}
                    <span className="text-[var(--color-text-primary)]">{quizStats.uniqueQuestions}</span>
                  </div>
                </div>
              )}

              {/* Play Tab */}
              {quizTab === "play" && (
                generatingQuiz ? (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <div className="w-8 h-8 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                    <span className="text-sm text-indigo-500 font-medium">AI is generating your question...</span>
                    <span className="text-xs text-[var(--color-text-muted)]">Powered by MiniMax M3</span>
                  </div>
                ) : quiz?.limitReached ? (
                  <div className="text-center py-6">
                    <div className="text-3xl mb-2">🎯</div>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">Daily Limit Reached</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">You've answered {quiz.count}/{quiz.limit} questions today. Come back tomorrow!</p>
                    <div className="mt-3 flex justify-center">
                      <button onClick={() => setQuizTab("history")} className="px-4 py-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 text-xs font-semibold">
                        📖 Review History
                      </button>
                    </div>
                  </div>
                ) : quiz && quiz.options ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      {quiz.difficulty && (
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[9px] font-bold",
                          quiz.difficulty === "Easy" && "bg-emerald-100 text-emerald-600",
                          quiz.difficulty === "Medium" && "bg-amber-100 text-amber-600",
                          quiz.difficulty === "Hard" && "bg-red-100 text-red-500",
                        )}>{quiz.difficulty}</span>
                      )}
                      {quiz.category && (
                        <span className="px-2 py-0.5 rounded-full bg-[var(--color-surface-hover)] text-[9px] font-semibold text-[var(--color-text-muted)]">
                          {quiz.category}
                        </span>
                      )}
                      {quiz.remaining !== undefined && (
                        <span className="ml-auto px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-[9px] font-bold text-indigo-600">
                          {quiz.remaining} left today
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--color-text-primary)] leading-relaxed font-semibold">{quiz.question}</p>
                    <div className="grid grid-cols-2 gap-2">
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
                              !quizResult && "hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 cursor-pointer",
                              !!quizResult && "cursor-default",
                              isCorrect && "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400",
                              isWrong && "border-red-400 bg-red-50 dark:bg-red-950/20 text-red-600",
                              !isSelected && !isCorrect && !isWrong && "border-[var(--color-border)] bg-[var(--color-surface)]",
                            )}
                          >
                            <span className="text-[10px] font-bold text-[var(--color-text-muted)] mr-1.5">{key}.</span>
                            {String(val)}
                          </button>
                        );
                      })}
                    </div>
                    {quizResult && (
                      <div className="space-y-2 animate-slide-up">
                        <div className={cn(
                          "p-3 rounded-xl text-sm font-medium",
                          quizResult.correct ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600" : "bg-red-50 dark:bg-red-950/20 text-red-500",
                        )}>
                          {quizResult.correct ? `✅ Correct! +${quizResult.xp} XP earned` : `❌ Wrong! The correct answer is ${quizResult.correctAnswer}.`}
                        </div>
                        {quizResult.explanation && (
                          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/30">
                            <p className="text-xs font-bold text-blue-600 mb-1">💡 EXPLANATION</p>
                            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{quizResult.explanation}</p>
                          </div>
                        )}
                        <button
                          onClick={handleGenerateQuiz}
                          className="w-full py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold transition-colors"
                        >
                          🔄 Next Question
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-6">
                    <p className="text-sm text-[var(--color-text-muted)]">Test your piping engineering knowledge</p>
                    <button
                      onClick={handleGenerateQuiz}
                      className="px-6 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold transition-colors shadow-sm"
                    >
                      ✨ Generate Question
                    </button>
                  </div>
                )
              )}

              {/* History Tab */}
              {quizTab === "history" && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {quizHistory.length === 0 ? (
                    <p className="text-sm text-[var(--color-text-muted)] text-center py-8">No questions answered yet. Start playing!</p>
                  ) : (
                    quizHistory.map((h) => (
                      <div key={h.id} className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm text-[var(--color-text-primary)] font-medium leading-snug flex-1">{h.Question}</p>
                          <div className="flex gap-1 flex-shrink-0">
                            <span className={cn(
                              "px-1.5 py-0.5 rounded text-[8px] font-bold",
                              h.IsCorrect ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-500",
                            )}>{h.IsCorrect ? "✓" : "✗"}</span>
                            {h.Difficulty && (
                              <span className={cn(
                                "px-1.5 py-0.5 rounded text-[8px] font-bold",
                                h.Difficulty === "Easy" && "bg-emerald-50 text-emerald-500",
                                h.Difficulty === "Medium" && "bg-amber-50 text-amber-500",
                                h.Difficulty === "Hard" && "bg-red-50 text-red-400",
                              )}>{h.Difficulty}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-[10px]">
                          {(["A", "B", "C", "D"] as const).map((k) => {
                            const isCorrect = k === h.CorrectAnswer;
                            const isUser = k === h.UserAnswer;
                            return (
                              <span key={k} className={cn(
                                "px-2 py-0.5 rounded font-medium",
                                isCorrect && "bg-emerald-100 text-emerald-700",
                                isUser && !isCorrect && "bg-red-100 text-red-600",
                                !isCorrect && !isUser && "bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]",
                              )}>{k}. {h[`Option${k}`] || ""}</span>
                            );
                          })}
                        </div>
                        {h.Explanation && (
                          <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed bg-blue-50/50 dark:bg-blue-950/10 rounded-lg px-2.5 py-2">💡 {h.Explanation}</p>
                        )}
                        <div className="flex items-center gap-2 text-[9px] text-[var(--color-text-muted)]">
                          {h.AnsweredAt && <span>{new Date(h.AnsweredAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</span>}
                          {h.XpEarned > 0 && <span className="text-amber-500 font-bold">+{h.XpEarned} XP</span>}
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
            <Card className="lg:col-span-3 card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" /> LIVE FEED
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {announcements.slice(0, 10).map((ann) => (
                    <div key={ann.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-[var(--color-surface-hover)] transition-colors">
                      <div className={cn(
                        "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
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
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ═══════════════════════════ EOD ENTRY TAB ═══════════════════════════ */}
      {activeTab === "entries" && (
        <div className="max-w-4xl space-y-6 animate-fade-in">
          {/* Leave button */}
          {!todayEntry && !onLeaveToday && (
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
                  <Input value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} placeholder="e.g., Sick leave" />
                </div>
                <Button onClick={handleMarkLeave} className="bg-orange-500 hover:bg-orange-600">Confirm Leave</Button>
                <Button variant="ghost" onClick={() => setShowLeaveForm(false)}><X className="w-4 h-4" /></Button>
              </CardContent>
            </Card>
          )}

          {onLeaveToday ? (
            <Card className="border-orange-200/60 dark:border-orange-800/30 bg-gradient-to-br from-orange-50/50 to-amber-50/30 dark:from-orange-950/10 dark:to-amber-950/5">
              <CardContent className="p-12 text-center">
                <Calendar className="w-14 h-14 text-orange-300 dark:text-orange-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">On Leave Today</h3>
                <p className="text-sm text-[var(--color-text-muted)]">No EOD submission needed for today.</p>
              </CardContent>
            </Card>
          ) : todayEntry ? (
            /* Already submitted today */
            <>
            <Card className="card-hover overflow-hidden">
              <CardHeader className="px-6 py-5 lg:px-8">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-emerald-600 lg:text-lg">
                    <Check className="w-5 h-5" /> Today's Entry Submitted
                  </CardTitle>
                  <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5 font-mono">
                    <Clock className="w-3 h-3" /> {todayEntry.FilledAt}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="px-6 lg:px-8 pb-6 lg:pb-8">
                <div className="grid grid-cols-3 gap-5 lg:gap-7 text-center mb-5">
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/15">
                    <div className="text-2xl font-bold text-amber-500 tabular-nums">{todayEntry.PlannedQty}</div>
                    <div className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider mt-1">Planned</div>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/15">
                    <div className="text-2xl font-bold text-emerald-500 tabular-nums">{todayEntry.ActualQty}</div>
                    <div className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider mt-1">Actual</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--color-surface-hover)]">
                    <div className="text-2xl font-bold text-[var(--color-text-primary)] tabular-nums">{todayEntry.CompletionPct}%</div>
                    <div className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider mt-1">Completion</div>
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-[var(--color-surface-hover)] border border-[var(--color-border)]/50 text-sm">
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
              <Card className="border-indigo-200/50 dark:border-indigo-800/30 animate-slide-up overflow-hidden">
                <CardContent className="p-5 flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                  <span className="text-sm text-indigo-500 font-medium">AI is analyzing your entry...</span>
                </CardContent>
              </Card>
            )}
            {eodInsights && !loadingInsights && (
              <Card className="border-indigo-200/50 dark:border-indigo-800/30 bg-gradient-to-r from-indigo-50/50 to-purple-50/30 dark:from-indigo-950/10 dark:to-purple-950/5 animate-slide-up overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-indigo-600">
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
                      eodInsights.productivityScore >= 7 ? "bg-emerald-500" : eodInsights.productivityScore >= 4 ? "bg-amber-500" : "bg-red-500",
                    )}>{eodInsights.productivityScore}/10</div>
                    <div>
                      <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase">Productivity Score</p>
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">{eodInsights.summary}</p>
                    </div>
                  </div>
                  {eodInsights.highlights?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase">Highlights</p>
                      {eodInsights.highlights.map((h: string, i: number) => (
                        <p key={i} className="text-xs text-[var(--color-text-secondary)] pl-3">✅ {h}</p>
                      ))}
                    </div>
                  )}
                  {eodInsights.suggestions?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-amber-600 uppercase">Suggestions</p>
                      {eodInsights.suggestions.map((s: string, i: number) => (
                        <p key={i} className="text-xs text-[var(--color-text-secondary)] pl-3">💡 {s}</p>
                      ))}
                    </div>
                  )}
                  {eodInsights.complexityAnalysis && (
                    <p className="text-[11px] text-[var(--color-text-muted)] bg-[var(--color-surface-hover)] rounded-lg px-3 py-2">
                      📊 {eodInsights.complexityAnalysis}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
            </>
          ) : (
            /* EOD Form */
            <Card className="shadow-sm border border-[var(--color-border)]/40 overflow-hidden">
              <CardHeader className="px-5 py-4 lg:px-8 lg:py-5">
                <CardTitle className="flex items-center gap-2 text-base lg:text-lg font-bold">
                  <Send className="w-4 h-4" /> TODAY'S EOD ENTRY
                  <span className="ml-auto text-sm font-bold text-amber-500 normal-case tracking-normal">+10 XP</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 px-5 lg:px-8 pb-5 lg:pb-7">
                {workItems.map((item, i) => (
                  <div
                    key={i}
                    className="p-4 lg:p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-hover)]/50 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                        Work Item {i + 1}
                      </h4>
                      {workItems.length > 1 && (
                        <button
                          onClick={() => setWorkItems(workItems.filter((_, j) => j !== i))}
                          className="text-[var(--color-text-muted)] hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 lg:gap-5">
                      <div>
                        <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block">Project</label>
                        <select
                          value={item.projectName}
                          onChange={(e) => updateItem(i, "projectName", e.target.value)}
                          className="w-full h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm text-[var(--color-text-primary)] focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 outline-none transition-all"
                        >
                          <option value="">Select project...</option>
                          {PROJECTS.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block">Task</label>
                        <Input value={item.task} onChange={(e) => updateItem(i, "task", e.target.value)} placeholder="e.g., Isometric drafting" />
                      </div>
                      <div className="md:col-span-2">
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Description</label>
                          <button
                            type="button"
                            onClick={() => handleAutoDescribe(i)}
                            disabled={!item.task || autoDescribeIdx === i}
                            className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 disabled:opacity-40 flex items-center gap-1"
                          >
                            {autoDescribeIdx === i ? (
                              <><div className="w-3 h-3 rounded-full border border-indigo-400 border-t-transparent animate-spin" /> Generating...</>
                            ) : ("✨ AI Auto-Describe")}
                          </button>
                        </div>
                        <Input value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} placeholder="Brief description or click AI Auto-Describe..." />
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
                        <select
                          value={item.complexity}
                          onChange={(e) => updateItem(i, "complexity", e.target.value)}
                          className="w-full h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm text-[var(--color-text-primary)] focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 outline-none transition-all"
                        >
                          <option>Low</option>
                          <option>Moderate</option>
                          <option>High</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block">
                          Completion: {item.completionPercent}%
                        </label>
                        <Progress value={item.completionPercent} color="accent" className="mt-1" />
                      </div>
                    </div>
                  </div>
                ))}

                <Button
                  variant="outline"
                  onClick={() => setWorkItems([...workItems, { ...blankItem }])}
                  className="w-full border-dashed"
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Another Project
                </Button>

                <div>
                  <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block">Overall Remarks</label>
                  <textarea
                    value={overallRemarks}
                    onChange={(e) => setOverallRemarks(e.target.value)}
                    placeholder="Any additional notes..."
                    className="w-full h-24 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 outline-none resize-none transition-all"
                  />
                </div>

                <Button onClick={handleSubmit} disabled={submitting} className="w-full" size="lg">
                  <Send className="w-4 h-4 mr-2" /> {submitting ? "Submitting..." : "SUBMIT EOD ENTRY → +10 XP"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* History */}
          {entries.length > 0 && (
            <Card className="shadow-sm border border-[var(--color-border)]/40 overflow-hidden">
              <CardHeader className="px-5 py-4 lg:px-8 lg:py-5"><CardTitle className="text-base lg:text-lg font-bold">My History</CardTitle></CardHeader>
              <CardContent className="px-5 lg:px-8 pb-5 lg:pb-7">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider border-b border-[var(--color-border)]">
                        <th className="pb-3 font-semibold pr-4">Date</th>
                        <th className="pb-3 font-semibold pr-4">Project</th>
                        <th className="pb-3 font-semibold pr-4">Task</th>
                        <th className="pb-3 font-semibold pr-4">Planned</th>
                        <th className="pb-3 font-semibold pr-4">Actual</th>
                        <th className="pb-3 font-semibold pr-4">Complete</th>
                        <th className="pb-3 font-semibold">Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.slice(0, 30).map((e) => (
                        <tr key={e.id} className="border-b border-[var(--color-border)]/30 hover:bg-[var(--color-surface-hover)] transition-colors">
                          <td className="py-3 pr-4 font-mono text-xs text-[var(--color-text-muted)]">{e.Date}</td>
                          <td className="py-3 pr-4 font-medium text-[var(--color-text-secondary)]">{e.Project}</td>
                          <td className="py-3 pr-4 text-[var(--color-text-secondary)]">{e.Task}</td>
                          <td className="py-3 pr-4 font-mono tabular-nums">{e.PlannedQty}</td>
                          <td className="py-3 pr-4 font-mono tabular-nums">{e.ActualQty}</td>
                          <td className="py-3 pr-4 font-mono tabular-nums font-medium">{e.CompletionPct}%</td>
                          <td className="py-3">
                            {e.Rating ? (
                              <Badge variant={e.Rating === "E" ? "success" : e.Rating === "N" ? "destructive" : "secondary"}>
                                {e.Rating}
                              </Badge>
                            ) : (
                              <span className="text-[var(--color-text-muted)]">—</span>
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
          <div className="mb-3 w-80 lg:w-[400px] bg-[var(--color-surface)] rounded-2xl shadow-2xl border border-[var(--color-border)] overflow-hidden animate-slide-up">
            <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">🤖</span>
                <span className="text-xs font-bold">Piping Assistant</span>
                <span className="text-[8px] bg-white/20 px-1.5 py-0.5 rounded-full">DeepSeek V4</span>
              </div>
              <button onClick={() => setChatOpen(false)} className="text-white/80 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="h-72 overflow-y-auto p-3 space-y-3">
              {chatMessages.map((msg, i) => (
                <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-indigo-500 text-white rounded-br-md"
                      : "bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] rounded-bl-md",
                  )}>{msg.content}</div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-[var(--color-surface-hover)] px-3 py-2 rounded-2xl rounded-bl-md">
                    <div className="flex gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)] animate-bounce" style={{animationDelay:"0ms"}} /><div className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)] animate-bounce" style={{animationDelay:"150ms"}} /><div className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)] animate-bounce" style={{animationDelay:"300ms"}} /></div>
                  </div>
                </div>
              )}
            </div>
            <div className="p-3 border-t border-[var(--color-border)]">
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleChat()}
                  placeholder="Ask about piping codes, standards..."
                  className="flex-1 h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:border-indigo-400"
                />
                <button
                  onClick={handleChat}
                  disabled={!chatInput.trim() || chatLoading}
                  className="w-9 h-9 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white flex items-center justify-center disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className={cn(
            "w-14 h-14 rounded-2xl shadow-lg flex items-center justify-center transition-all duration-300",
            chatOpen
              ? "bg-[var(--color-surface)] border border-[var(--color-border)] rotate-90"
              : "bg-gradient-to-br from-indigo-500 to-purple-600 hover:scale-110",
          )}
        >
          {chatOpen ? <X className="w-5 h-5 text-[var(--color-text-primary)]" /> : <span className="text-2xl">💬</span>}
        </button>
      </div>
    </div>
  );
}
