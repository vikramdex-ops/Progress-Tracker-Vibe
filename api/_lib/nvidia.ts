const NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

function getApiKey(): string {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) throw new Error("NVIDIA_API_KEY not configured");
  return key;
}

/**
 * Generate a piping engineering MCQ question via NVIDIA MiniMax M3.
 * @param previousQuestions - questions already asked to this employee (to avoid repeats)
 * @returns structured question with options, correct answer, explanation
 */
export async function generateQuizQuestion(previousQuestions: string[] = []) {
  const apiKey = getApiKey();

  const excludeSection = previousQuestions.length > 0
    ? `\nIMPORTANT: Do NOT generate any of these previously asked questions:\n${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}\n`
    : "";

  const systemPrompt = `You are a senior piping engineering professor creating exam-quality MCQ questions for piping designers and engineers (junior to senior level).

Generate EXACTLY ONE multiple-choice question following these rules:
- Topic: Piping engineering (design, stress analysis, codes & standards, materials, supports, process, safety, layout, testing, equipment, construction, specialized)
- Difficulty: Easy, Medium, or Hard (vary it)
- Provide 4 options (A, B, C, D) where exactly ONE is correct
- The question must be specific, practical, and test real engineering knowledge
- NOT generic or vague — must have a definite correct answer
- Include a crisp 1-2 sentence explanation of WHY the correct answer is right

${excludeSection}

Respond in EXACTLY this JSON format (no markdown, no code fences, just raw JSON):
{
  "question": "The question text here",
  "options": {
    "A": "Option A text",
    "B": "Option B text",
    "C": "Option C text",
    "D": "Option D text"
  },
  "correctAnswer": "B",
  "difficulty": "Medium",
  "category": "Stress Analysis",
  "explanation": "Clear explanation of why B is correct and why others are wrong."
}`;

  const payload = {
    model: "minimaxai/minimax-m3",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: "Generate a piping engineering MCQ question. Make it practical and specific." },
    ],
    temperature: 0.9,
    top_p: 0.95,
    max_tokens: 1024,
    stream: false,
  };

  const response = await fetch(NVIDIA_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`NVIDIA API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content in NVIDIA API response");

  // Parse the JSON from the response (handle markdown code fences if present)
  let cleaned = content.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }

  try {
    const parsed = JSON.parse(cleaned);
    // Validate structure
    if (!parsed.question || !parsed.options || !parsed.correctAnswer || !parsed.explanation) {
      throw new Error("Invalid question structure from AI");
    }
    // Validate correct answer is one of A/B/C/D
    if (!["A", "B", "C", "D"].includes(parsed.correctAnswer)) {
      throw new Error("Invalid correct answer from AI");
    }
    return {
      question: parsed.question,
      options: {
        A: String(parsed.options.A || ""),
        B: String(parsed.options.B || ""),
        C: String(parsed.options.C || ""),
        D: String(parsed.options.D || ""),
      },
      correctAnswer: parsed.correctAnswer,
      difficulty: parsed.difficulty || "Medium",
      category: parsed.category || "Piping Engineering",
      explanation: parsed.explanation,
    };
  } catch (parseErr) {
    throw new Error(`Failed to parse AI response: ${parseErr}`);
  }
}

/**
 * Generate a piping engineering fact/tip (for non-quiz contexts)
 */
export async function generatePipingFact() {
  const apiKey = getApiKey();

  const payload = {
    model: "minimaxai/minimax-m3",
    messages: [
      {
        role: "system",
        content: "You are a senior piping engineer. Generate ONE interesting, practical piping engineering fact or tip. Keep it to 1-2 sentences. Be specific and actionable. No generic advice.",
      },
      {
        role: "user",
        content: "Give me a piping engineering fact or tip.",
      },
    ],
    temperature: 0.8,
    top_p: 0.95,
    max_tokens: 256,
    stream: false,
  };

  const response = await fetch(NVIDIA_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(`NVIDIA API error ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "Keep learning — every day makes you a better piping engineer.";
}
