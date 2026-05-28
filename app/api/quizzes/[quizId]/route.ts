import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

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

// PUT /api/quizzes/[quizId] — update a quiz
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const { quizId } = await params;
    const body = await request.json();
    const { clues } = body;

    if (!clues) {
      return NextResponse.json(
        { error: "Missing clues" },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    await db.collection("quizzes").doc(quizId).update({ clues });

    return NextResponse.json({ success: true });
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