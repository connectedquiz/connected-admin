import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

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

// POST /api/quizzes — create a new quiz
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { quizId, date, type, difficulty, clues } = body;

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

    const quiz = { quizId, date, type, difficulty, clues };
    await db.collection("quizzes").doc(quizId).set(quiz);

    return NextResponse.json({ success: true, quizId });
  } catch (error) {
    console.error("Failed to create quiz:", error);
    return NextResponse.json(
      { error: "Failed to create quiz" },
      { status: 500 }
    );
  }
}