// connected-admin/lib/quiz-types.ts

export type Difficulty = "easy" | "hard" | "master";
export type QuizType = 5 | 10 | 30 | 50;

export interface Clue {
  clueText: string;
  acceptedAnswers: string[];
  requiresExactMatch: boolean;
}

export interface Quiz {
  quizId: string;
  date: string;
  type: QuizType;
  difficulty: Difficulty;
  clues: Clue[];
}

export function buildQuizId(
  date: string,
  type: QuizType,
  difficulty: Difficulty
): string {
  return `${date}-${type}-${difficulty}`;
}

export const QUIZ_TYPES: QuizType[] = [5, 10, 30, 50];
export const DIFFICULTIES: Difficulty[] = ["easy", "hard", "master"];

export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: "#4CAF50",
  hard: "#CC3333",
  master: "#7B3F9E",
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
