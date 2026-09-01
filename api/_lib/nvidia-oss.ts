const NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

function getApiKey(): string {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) throw new Error("NVIDIA_API_KEY not configured");
  return key;
}

async function callGPT(model: string, systemPrompt: string, userMessage: string, maxTokens = 4096) {
  const apiKey = getApiKey();
  const response = await fetch(NVIDIA_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
      top_p: 1,
      max_tokens: maxTokens,
      stream: false,
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`NVIDIA API error ${response.status}: ${err}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// ─── EOD Insights ──────────────────────────────────────────

export interface EodInsight {
  summary: string;
  productivityScore: number; // 1-10
  highlights: string[];
  suggestions: string[];
  complexityAnalysis: string;
}

export async function generateEodInsights(entries: any[], employeeName: string): Promise<EodInsight> {
  const systemPrompt = `You are a senior engineering manager analyzing a piping engineer's daily work entries. Be specific, practical, and constructive.

Analyze the entries and respond in EXACTLY this JSON format (no markdown, no code fences):
{
  "summary": "2-3 sentence summary of what was accomplished today",
  "productivityScore": 7,
  "highlights": ["Specific achievement 1", "Specific achievement 2"],
  "suggestions": ["Actionable improvement 1", "Actionable improvement 2"],
  "complexityAnalysis": "Analysis of task complexity and how it matches the engineer's level"
}

Rules:
- productivityScore: 1-10 (1=poor, 10=exceptional)
- highlights: max 3, be specific to the actual tasks
- suggestions: max 2, actionable and constructive
- complexityAnalysis: 1-2 sentences about task difficulty vs skill level
- Be encouraging but honest. Focus on engineering quality.`;

  const entriesText = entries.map((e, i) =>
    `Task ${i + 1}: ${e.Task || e.task || "N/A"}\n` +
    `Project: ${e.Project || e.projectName || "N/A"}\n` +
    `Description: ${e.Description || e.description || "N/A"}\n` +
    `Planned: ${e.PlannedQty || e.plannedQty || 0} | Actual: ${e.ActualQty || e.actualQty || 0}\n` +
    `Completion: ${e.CompletionPct || e.completionPercent || 0}%\n` +
    `Complexity: ${e.Complexity || e.complexity || "N/A"}\n` +
    `Remarks: ${e.Remarks || e.remarks || "None"}`
  ).join("\n\n");

  const content = await callGPT(
    "openai/gpt-oss-20b",
    systemPrompt,
    `Employee: ${employeeName}\nDate: ${new Date().toISOString().split("T")[0]}\n\nEntries:\n${entriesText}`,
    1024
  );

  try {
    let cleaned = content.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    }
    const parsed = JSON.parse(cleaned);
    return {
      summary: parsed.summary || "Entry analyzed.",
      productivityScore: Math.min(10, Math.max(1, parsed.productivityScore || 5)),
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights.slice(0, 3) : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 2) : [],
      complexityAnalysis: parsed.complexityAnalysis || "",
    };
  } catch {
    return {
      summary: content.substring(0, 300),
      productivityScore: 5,
      highlights: ["Entry submitted successfully"],
      suggestions: ["Keep up the consistent work"],
      complexityAnalysis: "Entry recorded for analysis.",
    };
  }
}

// ─── Weekly Report ──────────────────────────────────────────

export interface WeeklyReport {
  headline: string;
  teamPerformance: string;
  topPerformers: { name: string; reason: string }[];
  needsAttention: { name: string; reason: string }[];
  actionableInsights: string[];
  weekSummary: string;
}

export async function generateWeeklyReport(
  teamData: { name: string; entries: number; avgCompletion: number; streak: number; xp: number }[],
  totalEntries: number,
  totalTeamSize: number
): Promise<WeeklyReport> {
  const systemPrompt = `You are a senior engineering team analytics AI. Analyze the team's weekly performance data and provide actionable insights.

Respond in EXACTLY this JSON format (no markdown, no code fences):
{
  "headline": "One-line headline summarizing the week (e.g., 'Strong week with 85% team participation')",
  "teamPerformance": "2-3 sentence overall team performance analysis",
  "topPerformers": [{"name": "Name", "reason": "Specific reason for recognition"}],
  "needsAttention": [{"name": "Name", "reason": "Specific concern or pattern noticed"}],
  "actionableInsights": ["Insight 1 with specific action", "Insight 2 with specific action"],
  "weekSummary": "1-sentence engineering-focused summary"
}

Rules:
- topPerformers: max 3, based on entries count + completion rate + streak
- needsAttention: max 3, based on low entries, declining streak, or low completion
- actionableInsights: max 3, specific and implementable
- Be data-driven but empathetic. Focus on team dynamics.`;

  const teamText = teamData.map(t =>
    `${t.name}: ${t.entries} entries, ${t.avgCompletion}% avg completion, ${t.streak}d streak, ${t.xp} XP`
  ).join("\n");

  const content = await callGPT(
    "openai/gpt-oss-20b",
    systemPrompt,
    `Weekly Report — ${new Date().toISOString().split("T")[0]}\n` +
    `Team size: ${totalTeamSize} | Total entries this week: ${totalEntries}\n\n` +
    `Team Data:\n${teamText}`,
    2048
  );

  try {
    let cleaned = content.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    }
    const parsed = JSON.parse(cleaned);
    return {
      headline: parsed.headline || "Weekly report generated",
      teamPerformance: parsed.teamPerformance || "",
      topPerformers: Array.isArray(parsed.topPerformers) ? parsed.topPerformers.slice(0, 3) : [],
      needsAttention: Array.isArray(parsed.needsAttention) ? parsed.needsAttention.slice(0, 3) : [],
      actionableInsights: Array.isArray(parsed.actionableInsights) ? parsed.actionableInsights.slice(0, 3) : [],
      weekSummary: parsed.weekSummary || "",
    };
  } catch {
    return {
      headline: "Weekly performance analysis",
      teamPerformance: content.substring(0, 500),
      topPerformers: [],
      needsAttention: [],
      actionableInsights: [],
      weekSummary: "Analysis complete.",
    };
  }
}

// ─── Smart Leave Impact ─────────────────────────────────────

export async function analyzeLeaveImpact(
  employeeName: string,
  leaveDate: string,
  recentEntries: number,
  currentStreak: number
): Promise<{ impact: string; recommendation: string; streakRisk: "low" | "medium" | "high" }> {
  const systemPrompt = `You are an HR analytics AI. Analyze the impact of a planned leave.

Respond in EXACTLY this JSON format:
{
  "impact": "1-2 sentence impact assessment",
  "recommendation": "Brief recommendation for the team lead",
  "streakRisk": "low"
}

streakRisk: "low" (streak > 5), "medium" (streak 2-5), "high" (streak 0-1).`;

  const content = await callGPT(
    "openai/gpt-oss-20b",
    systemPrompt,
    `Employee: ${employeeName}\nLeave Date: ${leaveDate}\nRecent entries (last 7 days): ${recentEntries}\nCurrent streak: ${currentStreak} days`,
    256
  );

  try {
    let cleaned = content.trim();
    if (cleaned.startsWith("```")) cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(cleaned);
    return {
      impact: parsed.impact || "",
      recommendation: parsed.recommendation || "",
      streakRisk: ["low", "medium", "high"].includes(parsed.streakRisk) ? parsed.streakRisk : "low",
    };
  } catch {
    return { impact: "Leave recorded.", recommendation: "No issues.", streakRisk: "low" };
  }
}
