import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { Quiz, AnswerIndexEntry, normalizeAnswer } from "@/lib/quiz-types";

// GET /api/quizzes/answer-index — flattened list of every accepted answer
// across every quiz, for the live reuse/duplicate checker in QuizForm.
// Deliberately lightweight: only the fields the checker actually displays,
// not full quiz documents — this stays cheap to fetch even at 700-900+
// clues, since it's one array of small objects rather than nested quiz docs.
export async function GET() {
  try {
    const db = getAdminDb();
    const snapshot = await db.collection("quizzes").get();
    const entries: AnswerIndexEntry[] = [];

    snapshot.docs.forEach((doc) => {
      const quiz = doc.data() as Quiz;
      (quiz.clues ?? []).forEach((clue) => {
        (clue.acceptedAnswers ?? []).forEach((answer) => {
          entries.push({
            normalized: normalizeAnswer(answer),
            answer,
            clueText: clue.clueText,
            quizId: quiz.quizId,
            date: quiz.date,
            difficulty: quiz.difficulty,
            category: clue.category?.trim() || "Uncategorized",
          });
        });
      });
    });

    return NextResponse.json({ entries });
  } catch (error) {
    console.error("Failed to build answer index:", error);
    return NextResponse.json(
      { error: "Failed to build answer index" },
      { status: 500 }
    );
  }
}
