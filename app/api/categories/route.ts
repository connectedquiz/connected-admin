import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { DEFAULT_CATEGORIES } from "@/lib/quiz-types";

// GET /api/categories — fetch the current category list.
// Falls back to DEFAULT_CATEGORIES if the config doc doesn't exist yet
// (nothing is written on GET — the doc is only created the first time
// someone actually adds a custom category via POST).
export async function GET() {
  try {
    const db = getAdminDb();
    const doc = await db.collection("config").doc("categories").get();

    if (!doc.exists) {
      return NextResponse.json({ categories: DEFAULT_CATEGORIES });
    }

    const list = (doc.data()?.list as string[] | undefined) ?? DEFAULT_CATEGORIES;
    return NextResponse.json({ categories: list });
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

// POST /api/categories — add a new category to the list.
// Case-insensitive dedupe; keeps the list alphabetized for a predictable
// dropdown order in the editor.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category } = body as { category: string };
    const trimmed = category?.trim();

    if (!trimmed) {
      return NextResponse.json(
        { error: "Category name required" },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const docRef = db.collection("config").doc("categories");
    const doc = await docRef.get();
    const existing = doc.exists
      ? ((doc.data()?.list as string[] | undefined) ?? DEFAULT_CATEGORIES)
      : DEFAULT_CATEGORIES;

    if (existing.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      // Already present — no-op, just return the current list
      return NextResponse.json({ categories: existing });
    }

    const updated = [...existing, trimmed].sort((a, b) => a.localeCompare(b));
    await docRef.set({ list: updated });

    return NextResponse.json({ categories: updated });
  } catch (error) {
    console.error("Failed to add category:", error);
    return NextResponse.json(
      { error: "Failed to add category" },
      { status: 500 }
    );
  }
}
