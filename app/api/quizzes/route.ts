import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { computeQuizStatus, Clue, QuizType, Difficulty } from "@/lib/quiz-types";

// GET /api/quizzes — fetch all quizzes
export async function GET() {
  try {
    const db = getAdminDb();
    const snapshot = await db
      .collection("quizzes")
      .orderBy("date", "desc")
      .get();

    const quizzes = snapshot.docs.map((doc) => doc.data());
    return NextResponse.json({ quizzes });
  } catch (error) {
    console.error("Failed to fetch quizzes:", error);
    return NextResponse.json(
      { error: "Failed to fetch quizzes" },
      { status: 500 }
    );
  }
}

// POST /api/quizzes — create a new quiz.
// Deliberately permissive: this fires the moment the author has typed
// *anything* real, not just when every clue/answer is filled in. Status is
// always computed server-side from the actual content, never trusted from
// the client, so a quiz can never be mis-marked complete.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { quizId, date, type, difficulty, clues } = body as {
      quizId: string;
      date: string;
      type: QuizType;
      difficulty: Difficulty;
      clues: Clue[];
    };

    if (!quizId || !date || !type || !difficulty || !clues) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const db = getAdminDb();

    // Check for duplicate
    const existing = await db.collection("quizzes").doc(quizId).get();
    if (existing.exists) {
      return NextResponse.json(
        { error: `Quiz ${quizId} already exists` },
        { status: 409 }
      );
    }

    const status = computeQuizStatus(type, clues);
    const updatedAt = Date.now();

    const quiz = { quizId, date, type, difficulty, clues, status, updatedAt };
    await db.collection("quizzes").doc(quizId).set(quiz);

    return NextResponse.json({ success: true, quizId, status, updatedAt });
  } catch (error) {
    console.error("Failed to create quiz:", error);
    return NextResponse.json(
      { error: "Failed to create quiz" },
      { status: 500 }
    );
  }
}