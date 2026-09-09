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



