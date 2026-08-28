import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { entriesApi, gamificationApi, leavesApi } from "@/lib/api";
import { PROJECTS, COMPLEXITY_COLORS } from "@/lib/constants";
import { getFactForDate } from "@/lib/engineering-facts";
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

  const todayFact = getFactForDate(today);

  const loadData = useCallback(async () => {
    try {
      const [eRes, gRes, lRes] = await Promise.all([
        entriesApi.list({ employee: user?.name || "" }) as any,
        gamificationApi.get(user?.name || "") as any,
        leavesApi.list({ date: today }) as any,
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
    <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-8 space-y-7">
      {celebration && (
        <CelebrationModal xp={celebration.xp} streak={celebration.streak} onClose={() => setCelebration(null)} />
      )}

      {/* ── Top Stats Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger-children">
        {[
          { icon: <Star className="w-5 h-5" />, label: "Total XP", value: `${gamification?.xp || 0}`, color: "amber", gradient: "from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/10" },
          { icon: <Award className="w-5 h-5" />, label: levelInfo.title, value: `Level ${levelInfo.level}`, color: "indigo", gradient: "from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/10" },
          { icon: <Flame className="w-5 h-5" />, label: "Current Streak", value: `${gamification?.currentStreak || 0} day${(gamification?.currentStreak || 0) !== 1 ? "s" : ""}`, color: "orange", gradient: "from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/10" },
          { icon: <Check className="w-5 h-5" />, label: "Total Entries", value: `${gamification?.totalEntries || 0}`, color: "emerald", gradient: "from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/10" },
        ].map((stat) => (
          <Card key={stat.label} className={cn("bg-gradient-to-br card-hover p-4", stat.gradient)}>
            <div className="flex items-center gap-4">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0",
                stat.color === "amber" && "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
                stat.color === "indigo" && "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
                stat.color === "orange" && "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
                stat.color === "emerald" && "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
              )}>
                {stat.icon}
              </div>
              <div className="min-w-0">
                <div className="text-lg font-bold text-[var(--color-text-primary)] tabular-nums leading-tight">{stat.value}</div>
                <div className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider leading-tight mt-0.5">{stat.label}</div>
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
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 stagger-children">
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
          <Card className="flex flex-col items-center justify-center card-hover">
            <CardHeader className="w-full"><CardTitle>THIS WEEK</CardTitle></CardHeader>
            <CardContent className="pb-2">
              <ProgressRing value={weeklyCompletion} size={140} strokeWidth={10} />
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="card-hover">
            <CardHeader><CardTitle>Quick Stats</CardTitle></CardHeader>
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
          <Card className="card-hover">
            <CardHeader><CardTitle>Level Progression</CardTitle></CardHeader>
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
          <Card className="lg:col-span-3 card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" /> YOUR ACHIEVEMENTS
              </CardTitle>
            </CardHeader>
            <CardContent>
              {gamification?.badges && gamification.badges.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-3">
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

          {/* Engineering Fact — full width */}
          <Card className="lg:col-span-3 card-hover bg-gradient-to-r from-slate-50 to-blue-50/30 dark:from-slate-800/60 dark:to-slate-800/40 border-slate-200/60 dark:border-slate-700/40">
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
            <Card className="card-hover">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-emerald-600">
                    <Check className="w-5 h-5" /> Today's Entry Submitted
                  </CardTitle>
                  <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5 font-mono">
                    <Clock className="w-3 h-3" /> {todayEntry.FilledAt}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-5 text-center mb-5">
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
          ) : (
            /* EOD Form */
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-4 h-4" /> TODAY'S EOD ENTRY
                  <span className="ml-auto text-sm font-bold text-amber-500 normal-case tracking-normal">+10 XP</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {workItems.map((item, i) => (
                  <div
                    key={i}
                    className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-hover)]/50 space-y-4"
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
                    <div className="grid md:grid-cols-2 gap-4">
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
                        <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block">Description</label>
                        <Input value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} placeholder="Brief description of work done..." />
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
            <Card>
              <CardHeader><CardTitle>My History</CardTitle></CardHeader>
              <CardContent>
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
    </div>
  );
}
