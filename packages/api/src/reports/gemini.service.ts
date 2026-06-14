import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { GenerateReportNoteInput } from "@kichkintoy/shared";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const LEVEL_LABELS: Record<string, string> = {
  excellent: "excellent",
  good: "good",
  needs_support: "needs support",
  not_observed: "not observed",
  absent: "absent",
};

const INTEREST_LABELS: Record<string, string> = {
  high: "high interest",
  medium: "medium interest",
  low: "low interest",
  not_observed: "not observed",
};

type GenerationLanguage = "uz" | "ru";

const LANGUAGE_CONFIG: Record<
  GenerationLanguage,
  {
    languageName: string;
    placeholder: string;
    style: string;
    labels: Record<string, string>;
    levels: Record<string, string>;
    interests: Record<string, string>;
  }
> = {
  uz: {
    languageName: "Uzbek in Latin script",
    placeholder: "bola",
    style:
      "Use fluent, natural Uzbek Latin. Avoid Russian words and avoid literal translations. Write like a real Uzbek kindergarten teacher speaking respectfully to parents.",
    labels: {
      mood: "Kayfiyat",
      meal: "Ovqatlanish",
      sleep: "Uyqu",
      activity: "Faollik",
      health: "Sog'liq holati",
      class: "Mashg'ulot",
      strengths: "kuchli tomoni",
      needsPractice: "mashq kerak",
    },
    levels: {
      excellent: "a'lo",
      good: "yaxshi",
      needs_support: "qo'llab-quvvatlash kerak",
      not_observed: "kuzatilmadi",
      absent: "qatnashmadi",
    },
    interests: {
      high: "qiziqishi yuqori",
      medium: "qiziqishi o'rtacha",
      low: "qiziqishi past",
      not_observed: "qiziqishi kuzatilmadi",
    },
  },
  ru: {
    languageName: "Russian",
    placeholder: "ребёнок",
    style:
      "Use fluent, warm Russian. Write like an experienced kindergarten teacher speaking respectfully to parents.",
    labels: {
      mood: "Настроение",
      meal: "Питание",
      sleep: "Сон",
      activity: "Активность",
      health: "Самочувствие",
      class: "Занятие",
      strengths: "сильная сторона",
      needsPractice: "стоит потренировать",
    },
    levels: {
      excellent: "отлично",
      good: "хорошо",
      needs_support: "нужна поддержка",
      not_observed: "не наблюдалось",
      absent: "не участвовал(а)",
    },
    interests: {
      high: "высокий интерес",
      medium: "средний интерес",
      low: "низкий интерес",
      not_observed: "интерес не наблюдался",
    },
  },
};

@Injectable()
export class GeminiService {
  private readonly apiKey: string;

  constructor() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new ServiceUnavailableException(
        "AI generation is not configured (GEMINI_API_KEY missing).",
      );
    }
    this.apiKey = key;
  }

  async generateTeacherNote(input: GenerateReportNoteInput): Promise<string> {
    const config = LANGUAGE_CONFIG[input.language];
    const { placeholder } = config;

    const systemInstruction = `You are an experienced kindergarten teacher writing a daily note for parents.

Write in ${config.languageName}. ${config.style}
Use "${placeholder}" as the only placeholder for the child's name and never invent a real name.

The note must:
- be one complete parent-friendly paragraph, 5 to 7 natural sentences;
- be at least 80 words;
- sound warm, specific, and professional, not like a template;
- mention the child's mood, meals, sleep, activity, and class participation when those observations are provided;
- connect details smoothly instead of listing them mechanically;
- include one gentle encouragement or positive next step when class practice is provided;
- finish with a complete sentence;
- do not include a greeting or salutation;
- do not mention photos or videos;
- avoid exaggerated praise, emojis, headings, bullet points, and exclamation marks;
- avoid medical advice and do not add facts that were not provided;
- output only the final paragraph.`;

    const lines: string[] = [];

    if (input.mood) lines.push(`${config.labels.mood}: ${input.mood}`);

    for (const item of input.items ?? []) {
      const parts: string[] = [];
      if (item.title) parts.push(item.title);
      if (item.value) parts.push(item.value);
      if (item.note) parts.push(item.note);
      if (parts.length > 0) {
        lines.push(
          `${config.labels[item.itemType] ?? item.itemType}: ${parts.join(", ")}`,
        );
      }
    }

    for (const cp of input.classParticipation ?? []) {
      const parts: string[] = [
        config.levels[cp.level] ?? LEVEL_LABELS[cp.level] ?? cp.level,
        cp.interest
          ? (config.interests[cp.interest] ??
            INTEREST_LABELS[cp.interest] ??
            cp.interest)
          : "",
      ].filter(Boolean);
      if (cp.strengths) parts.push(`${config.labels.strengths}: ${cp.strengths}`);
      if (cp.needsPractice) {
        parts.push(`${config.labels.needsPractice}: ${cp.needsPractice}`);
      }
      lines.push(`${config.labels.class} — ${cp.subject}: ${parts.join(", ")}`);
    }

    const userMessage =
      lines.length > 0
        ? `Write the daily note from these observations:\n${lines.join("\n")}`
        : "Write a short warm daily note with no invented details.";

    const response = await fetch(`${GEMINI_API_URL}?key=${this.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [{ parts: [{ text: userMessage }] }],
        generationConfig: {
          temperature: 0.75,
          topP: 0.95,
          maxOutputTokens: 1000,
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new ServiceUnavailableException(
        `AI generation failed: ${response.status} ${body.slice(0, 200)}`,
      );
    }

    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };

    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

    if (!text) {
      throw new ServiceUnavailableException(
        "AI returned an empty response. Please try again.",
      );
    }

    if (isIncompleteNote(text)) {
      throw new ServiceUnavailableException(
        "AI returned an incomplete note. Please try again.",
      );
    }

    return text;
  }
}

function isIncompleteNote(text: string) {
  const normalized = text.trim();
  if (normalized.length < 220) return true;
  return !/[.!?。؟]$/.test(normalized);
}
