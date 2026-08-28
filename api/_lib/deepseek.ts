const NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const MODEL = "deepseek-ai/deepseek-v4-flash-0731";

function getApiKey(): string {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) throw new Error("NVIDIA_API_KEY not configured");
  return key;
}

async function callDeepSeek(systemPrompt: string, userMessage: string, maxTokens = 4096) {
  const apiKey = getApiKey();
  const response = await fetch(NVIDIA_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
      top_p: 0.95,
      max_tokens: maxTokens,
      stream: false,
      extra_body: { chat_template_kwargs: { thinking: true, reasoning_effort: "high" } },
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`DeepSeek API error ${response.status}: ${err}`);
  }
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  return content;
}

// ─── EOD Auto-Describe ─────────────────────────────────────

export interface AutoDescription {
  description: string;
  suggestions: string[];
}

export async function generateEodDescription(
  taskName: string,
  projectName: string,
  plannedQty: number,
  actualQty: number,
  complexity: string
): Promise<AutoDescription> {
  const systemPrompt = `You are a piping engineering assistant helping engineers write professional EOD (End of Day) descriptions for their daily work entries.

Given a task name, project, quantities, and complexity level, generate a clear, professional 1-2 sentence description of what the engineer likely accomplished.

Also provide 2-3 alternative task names they might have been working on (related to the task).

Respond in EXACTLY this JSON format:
{
  "description": "Professional description of the work done",
  "suggestions": ["Related task 1", "Related task 2", "Related task 3"]
}

Keep descriptions specific to piping engineering (design, drafting, stress analysis, isometrics, MTO, etc.). Be concise but professional.`;

  const content = await callDeepSeek(
    systemPrompt,
    `Task: ${taskName}\nProject: ${projectName}\nPlanned: ${plannedQty}\nActual: ${actualQty}\nComplexity: ${complexity}`,
    512
  );

  try {
    let cleaned = content.trim();
    if (cleaned.startsWith("```")) cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(cleaned);
    return {
      description: parsed.description || `Completed ${taskName} for ${projectName}.`,
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 3) : [],
    };
  } catch {
    return {
      description: content.substring(0, 200) || `Completed ${taskName} tasks.`,
      suggestions: [],
    };
  }
}

// ─── Piping Engineering Chatbot ─────────────────────────────

export interface ChatResponse {
  answer: string;
  relatedTopics: string[];
}

export async function chatWithEngineer(
  message: string,
  context?: string
): Promise<ChatResponse> {
  const systemPrompt = `You are a senior piping engineering expert with 20+ years of experience across oil & gas, petrochemical, power plants, and FPSO projects. You are helping piping designers and engineers with their daily work.

Your expertise covers:
- Piping codes & standards (ASME B31.3, B31.1, B31.4, B31.8, API 570/574)
- Piping design (layout, routing, support, stress analysis)
- Isometric drafting and MTO (Material Take Off)
- Pipe specifications and material selection
- Equipment nozzle loads and thermal flexibility
- Process piping vs utility piping
- Pipe support types and spacing
- Hydrotest procedures and acceptance criteria
- Piping fabrication and installation
- Flange management and bolting
- Insulation and painting specifications

Rules:
1. Be specific and practical — give actionable advice
2. Reference relevant codes/standards when applicable
3. If asked about calculations, show the formula and steps
4. Keep answers concise (2-4 sentences max) unless asked for detail
5. Be encouraging but technically accurate
6. If unsure, say so — don't fabricate standards

Respond in EXACTLY this JSON format:
{
  "answer": "Your expert response (2-4 sentences, or longer if detailed explanation needed)",
  "relatedTopics": ["Related topic 1", "Related topic 2"]
}`;

  const userMsg = context
    ? `Context: ${context}\n\nQuestion: ${message}`
    : message;

  const content = await callDeepSeek(systemPrompt, userMsg, 2048);

  try {
    let cleaned = content.trim();
    if (cleaned.startsWith("```")) cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(cleaned);
    return {
      answer: parsed.answer || content.substring(0, 500),
      relatedTopics: Array.isArray(parsed.relatedTopics) ? parsed.relatedTopics.slice(0, 3) : [],
    };
  } catch {
    // If not JSON, return raw content
    return {
      answer: content.substring(0, 1000),
      relatedTopics: [],
    };
  }
}

// ─── Smart Team Analytics ───────────────────────────────────

export interface TeamAnalytics {
  insights: string;
  patterns: { pattern: string; impact: string }[];
  recommendations: string[];
  riskAlerts: string[];
}

export async function analyzeTeamPatterns(
  teamHistory: {
    name: string;
    entries: number;
    avgCompletion: number;
    streak: number;
    recentTrend: string;
    missedDays: number;
  }[],
  period: string
): Promise<TeamAnalytics> {
  const systemPrompt = `You are a team analytics AI with deep reasoning capabilities. Analyze the team's work patterns over time and identify trends, risks, and opportunities.

Respond in EXACTLY this JSON format:
{
  "insights": "2-3 sentence executive summary of team health and performance trends",
  "patterns": [{"pattern": "Specific pattern observed", "impact": "How it affects the team"}],
  "recommendations": ["Specific actionable recommendation 1", "Recommendation 2", "Recommendation 3"],
  "riskAlerts": ["Potential risk 1 with mitigation", "Risk 2 with mitigation"]
}

Rules:
- patterns: max 4, be specific to the actual data
- recommendations: max 3, implementable by the team lead
- riskAlerts: max 3, include both the risk and suggested mitigation
- Focus on engineering team dynamics and productivity
- Consider streak consistency as a proxy for team engagement`;

  const teamText = teamHistory.map(t =>
    `${t.name}: ${t.entries} entries, ${t.avgCompletion}% avg, ${t.streak}d streak, trend: ${t.recentTrend}, missed: ${t.missedDays}d`
  ).join("\n");

  const content = await callDeepSeek(
    systemPrompt,
    `Period: ${period}\nTeam Size: ${teamHistory.length}\n\nTeam Data:\n${teamText}`,
    2048
  );

  try {
    let cleaned = content.trim();
    if (cleaned.startsWith("```")) cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(cleaned);
    return {
      insights: parsed.insights || "",
      patterns: Array.isArray(parsed.patterns) ? parsed.patterns.slice(0, 4) : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 3) : [],
      riskAlerts: Array.isArray(parsed.riskAlerts) ? parsed.riskAlerts.slice(0, 3) : [],
    };
  } catch {
    return {
      insights: content.substring(0, 500),
      patterns: [],
      recommendations: [],
      riskAlerts: [],
    };
  }
}
