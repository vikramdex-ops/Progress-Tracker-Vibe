/* ─────────────────────────────────────────────────────────
 * Team Analysis Engine
 *
 * A deterministic, 100% client-side logic engine that powers
 * the team-lead "Weekly Report" and "Team Analytics" panels.
 * Replaces the previous AI/API-key-backed calls so no network,
 * API key, or external service is involved. Everything is
 * computed from the already-loaded dashboard dataset
 * (employees + EOD entries + leaves) and the module is
 * structured for easy expansion — export new pure functions
 * and wire them into the panel.
 * ───────────────────────────────────────────────────────── */

export interface WeeklyReport {
  headline: string;
  teamPerformance: string;
  topPerformers: { name: string; reason: string }[];
  needsAttention: { name: string; reason: string }[];
  actionableInsights: string[];
  weekSummary: string;
}

export interface TeamAnalytics {
  insights: string;
  patterns: { pattern: string; impact: string }[];
  recommendations: string[];
}

export interface AnalysisRow {
  name: string;
  entries: number;
  avgCompletion: number;
  streak: number;
  xp: number;
  missedDays: number;
  trend: string;
}

const DAY_MS = 86_400_000;

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString().split("T")[0];
}

function num(v: any, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function roundPct(n: number): string {
  return `${Math.round(n)}%`;
}

/** One row per employee, summed over the trailing 7 days. */
function computeRows(employees: any[], entries: any[]): AnalysisRow[] {
  const weekStart = isoDaysAgo(7);
  const twoWeekStart = isoDaysAgo(14);
  return employees
    .map((emp) => {
      const name = emp?.name;
      if (!name) return null as any;
      const own = entries.filter((e) => e.EmployeeName === name);
      const thisWeek = own.filter((e) => String(e.Date) >= weekStart);
      const lastWeek = own.filter((e) => String(e.Date) >= twoWeekStart && String(e.Date) < weekStart);
      const avg =
        thisWeek.length > 0 ? thisWeek.reduce((s, e) => s + num(e.CompletionPct), 0) / thisWeek.length : 0;
      const trend =
        thisWeek.length > lastWeek.length
          ? "improving"
          : thisWeek.length < lastWeek.length
            ? "declining"
            : "stable";
      return {
        name,
        entries: thisWeek.length,
        avgCompletion: Math.round(avg),
        streak: num(emp.currentStreak),
        xp: num(emp.xp),
        missedDays: Math.max(0, 5 - thisWeek.length),
        trend,
      };
    })
    .filter(Boolean);
}

export function generateWeeklyReport(employees: any[], entries: any[], leaves: any[]): WeeklyReport {
  const rows = computeRows(employees, entries);
  const totalEntries = rows.reduce((s, r) => s + r.entries, 0);
  const avgCompletion =
    rows.length > 0
      ? Math.round(rows.reduce((s, r) => s + r.avgCompletion, 0) / rows.length)
      : 0;
  const activeSubmitters = new Set(
    entries.filter((e) => String(e.Date) >= isoDaysAgo(7)).map((e) => e.EmployeeName)
  ).size;

  const byScore = [...rows].sort((a, b) => b.xp - a.xp || b.entries - a.entries);
  const leadRow = byScore.find((r) => r.entries > 0);
  const topPerformers = byScore
    .filter((r) => r.entries > 0)
    .slice(0, 3)
    .map((r) => ({
      name: r.name,
      reason: `${r.entries} entry${r.entries === 1 ? "" : "s"} at ${roundPct(r.avgCompletion)} average completion, ${r.streak}-day streak`,
    }));

  const byMissed = [...rows].sort((a, b) => a.entries - b.entries);
  const needsAttention = byMissed
    .filter((r) => r.entries === 0)
    .slice(0, 3)
    .map((r) => ({ name: r.name, reason: "No EOD entries in the last 7 days — worth a check-in" }));

  const headline =
    totalEntries > 0
      ? `Solid week — ${totalEntries} entries logged · ${roundPct(avgCompletion)} average completion`
      : "No weekly activity yet — kick off submissions for a strong week";

  const teamPerformance = `Across ${rows.length} team members, ${totalEntries} EOD entries were logged in the last 7 days with an average completion of ${roundPct(avgCompletion)}. ${leadRow?.name ?? "Nobody"} led the volume with ${leadRow?.entries ?? 0} entries.`;

  const actionableInsights: string[] = [];
  const unrated = entries.filter((e) => !e.Rating && e.FilledAt).length;
  if (unrated > 0)
    actionableInsights.push(`Close the feedback loop — ${unrated} entr${unrated === 1 ? "y is" : "ies are"} still awaiting a rating.`);
  if (needsAttention.length > 0)
    actionableInsights.push(`${needsAttention.length} member${needsAttention.length === 1 ? "" : "s"} submitted nothing this week — schedule a 1:1 to clear blockers.`);
  if (avgCompletion < 90)
    actionableInsights.push(`Average completion is ${roundPct(avgCompletion)} — check for shared blockers on under-delivered items.`);
  if (actionableInsights.length === 0)
    actionableInsights.push("Momentum is strong across the team — consider a stretch goal for next week.");

  const weekSummary = `Weekly totals: ${totalEntries} entries · ${activeSubmitters} active submitters · ${roundPct(avgCompletion)} average completion.`;

  return {
    headline,
    teamPerformance,
    topPerformers,
    needsAttention,
    actionableInsights: actionableInsights.slice(0, 3),
    weekSummary,
  };
}

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function analyzeTeamData(employees: any[], entries: any[], leaves: any[]): TeamAnalytics {
  const rows = computeRows(employees, entries);
  const weekStart = isoDaysAgo(7);
  const weekEntries = entries.filter((e) => String(e.Date) >= weekStart);
  const total = entries.length;
  const unrated = entries.filter((e) => !e.Rating && e.FilledAt).length;
  const ratedCoverage = total > 0 ? Math.round(((total - unrated) / total) * 100) : 0;
  const avgCompletion =
    rows.length > 0
      ? Math.round(rows.reduce((s, r) => s + r.avgCompletion, 0) / rows.length)
      : 0;

  const byDow: Record<number, number[]> = {};
  weekEntries.forEach((e) => {
    const raw = String(e.Date);
    const d = new Date(raw.includes("T") ? raw : `${raw}T00:00:00`);
    const dow = d.getDay();
    (byDow[dow] = byDow[dow] || []).push(num(e.CompletionPct));
  });
  const dowStats = Object.entries(byDow).map(([dow, arr]: any) => ({
    dow: Number(dow),
    avg: arr.reduce((s: number, x: number) => s + x, 0) / arr.length,
    count: arr.length,
  }));
  const worstDow = dowStats.length > 0 ? [...dowStats].sort((a, b) => a.avg - b.avg)[0] : null;
  const zeroEntry = rows.filter((r) => r.entries === 0).length;

  const patterns: TeamAnalytics["patterns"] = [];
  if (worstDow && worstDow.avg < 75)
    patterns.push({
      pattern: `${WEEKDAY_NAMES[worstDow.dow]} sees the weakest completion`,
      impact: `Only ${roundPct(worstDow.avg)} average completion on ${WEEKDAY_NAMES[worstDow.dow]} across ${worstDow.count} entries — probe for a recurring blocker.`,
    });
  if (unrated > 0)
    patterns.push({
      pattern: "Rating backlog is growing",
      impact: `${unrated} entry ${unrated === 1 ? "is" : "s are"} unrated (${ratedCoverage}% coverage) — employees lose feedback momentum.`,
    });
  if (zeroEntry > 0)
    patterns.push({
      pattern: `${zeroEntry} member${zeroEntry === 1 ? " is" : "s are"} disengaged this week`,
      impact: "No submissions means invisible progress — early intervention preserves streaks.",
    });
  if (patterns.length === 0)
    patterns.push({
      pattern: "Submission pattern is healthy",
      impact: `Full participation with ${roundPct(avgCompletion)} average completion — no anomalies detected.`,
    });

  const recommendations: string[] = [];
  if (unrated > 0) recommendations.push("Dedicate a 15-minute daily review slot to clear the rating backlog early.");
  if (zeroEntry > 0) recommendations.push("Reach out to members with zero activity before their streak resets.");
  if (avgCompletion < 90) recommendations.push("Re-prioritize under-completed items at the next stand-up and reassign blockers.");
  if (recommendations.length === 0) recommendations.push("Keep the current cadence and start planning next week's stretch goals.");

  const top = [...rows].sort((a, b) => b.xp - a.xp)[0];
  const insights =
    `The team logged ${weekEntries.length} entries over the last 7 days at ${roundPct(avgCompletion)} average completion with ${ratedCoverage}% rating coverage. ` +
    `${top && top.entries > 0 ? `${top.name} leads the week with ${top.entries} entries. ` : ""}` +
    `${zeroEntry > 0 ? `${zeroEntry} member${zeroEntry === 1 ? " is" : "s are"} yet to submit this week. ` : "Participation is consistent across the week. "}` +
    "Computed instantly from the live dataset — no external service involved.";

  return {
    insights,
    patterns: patterns.slice(0, 3),
    recommendations: recommendations.slice(0, 3),
  };
}