import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { computeQuizStatus, Clue, Quiz } from "@/lib/quiz-types";

// GET /api/quizzes/[quizId] — fetch one quiz
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const { quizId } = await params;
    const db = getAdminDb();
    const doc = await db.collection("quizzes").doc(quizId).get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    return NextResponse.json({ quiz: doc.data() });
  } catch (error) {
    console.error("Failed to fetch quiz:", error);
    return NextResponse.json(
      { error: "Failed to fetch quiz" },
      { status: 500 }
    );
  }
}

// PUT /api/quizzes/[quizId] — update a quiz's clues.
// This is the endpoint every autosave (debounced, interval, and the
// visibilitychange/pagehide flush) hits. It's deliberately permissive about
// content — partial/empty clues are fine — but status is always recomputed
// server-side from the doc's actual `type` + the submitted clues, so a quiz
// can never silently report itself "complete" when it isn't, and vice versa.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const { quizId } = await params;
    const body = await request.json();
    const { clues } = body as { clues: Clue[] };

    if (!clues) {
      return NextResponse.json(
        { error: "Missing clues" },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const docRef = db.collection("quizzes").doc(quizId);
    const existing = await docRef.get();

    if (!existing.exists) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const existingQuiz = existing.data() as Quiz;
    const status = computeQuizStatus(existingQuiz.type, clues);
    const updatedAt = Date.now();

    await docRef.update({ clues, status, updatedAt });

    return NextResponse.json({ success: true, status, updatedAt });
  } catch (error) {
    console.error("Failed to update quiz:", error);
    return NextResponse.json(
      { error: "Failed to update quiz" },
      { status: 500 }
    );
  }
}

// DELETE /api/quizzes/[quizId] — delete a quiz
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const { quizId } = await params;
    const db = getAdminDb();
    await db.collection("quizzes").doc(quizId).delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete quiz:", error);
    return NextResponse.json(
      { error: "Failed to delete quiz" },
      { status: 500 }
    );
  }
}