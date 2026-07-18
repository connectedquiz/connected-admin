// connected-admin/lib/quiz-types.ts

export type Difficulty = "easy" | "hard" | "master";
export type QuizType = 5 | 10 | 30 | 50;

export interface Clue {
  clueText: string;
  acceptedAnswers: string[];
  requiresExactMatch: boolean;
}

// "draft"    — quiz exists but is not yet fully filled in (any amount of progress, including zero)
// "complete" — every clue slot exists, has clue text, and has at least one accepted answer
export type QuizStatus = "draft" | "complete";

export interface Quiz {
  quizId: string;
  date: string;
  type: QuizType;
  difficulty: Difficulty;
  clues: Clue[];
  status: QuizStatus;
  updatedAt: number; // unix ms — last successful server write, used for cross-device draft recovery
}

export function buildQuizId(
  date: string,
  type: QuizType,
  difficulty: Difficulty
): string {
  return `${date}-${type}-${difficulty}`;
}

// Single source of truth for what counts as "complete." Used both client-side
// (for instant UI feedback) and server-side (API routes recompute this rather
// than trusting the client, so status can never drift or be spoofed).
export function computeQuizStatus(type: QuizType, clues: Clue[]): QuizStatus {
  if (clues.length !== type) return "draft";
  if (clues.some((c) => !c.clueText.trim())) return "draft";
  if (clues.some((c) => c.acceptedAnswers.length === 0)) return "draft";
  return "complete";
}

export const QUIZ_TYPES: QuizType[] = [5, 10, 30, 50];
export const DIFFICULTIES: Difficulty[] = ["easy", "hard", "master"];

export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: "#4CAF50",
  hard: "#CC3333",
  master: "#7B3F9E",
};

// Draft = purple (mirrors the "mixed / in-between state" purple used elsewhere
// in the design system — here it means "authoring in progress" rather than
// "mixed purchase status," but the visual language is intentionally the same).
// Complete = green, matching "unlocked / done" everywhere else in the app.
export const STATUS_COLORS: Record<QuizStatus, string> = {
  draft: "#7B3F9E",
  complete: "#4CAF50",
};

export const STATUS_LABELS: Record<QuizStatus, string> = {
  draft: "Draft",
  complete: "Complete",
};

// Paragraph / Page / Chapter / Tome — the literary hierarchy
export const TYPE_LABELS: Record<number, string> = {
  5:  "Paragraph (5)",
  10: "Page (10)",
  30: "Chapter (30)",
  50: "Tome (50)",
};

// Short labels for compact UI (calendar cells, legend, etc.)
export const TYPE_SHORT_LABELS: Record<number, string> = {
  5:  "¶",   // paragraph symbol — perfect for the brand
  10: "Pg",
  30: "Ch",
  50: "T",
};

// Full standalone names (no clue count) for headings and filters
export const TYPE_NAMES: Record<number, string> = {
  5:  "Paragraph",
  10: "Page",
  30: "Chapter",
  50: "Tome",
};