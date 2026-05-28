// connected-admin/app/api/players/[uid]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";

// GET /api/players/[uid]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;
    const db      = getAdminDb();
    const auth    = getAdminAuth();

    const doc = await db.collection("users").doc(uid).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    // Enrich with email from Firebase Auth
    let email = doc.data()?.email ?? "";
    if (!email) {
      try {
        const authUser = await auth.getUser(uid);
        email = authUser.email ?? "";
      } catch { /* no auth record */ }
    }

    return NextResponse.json({ player: { uid: doc.id, email, ...doc.data() } });
  } catch (error) {
    console.error("Failed to fetch player:", error);
    return NextResponse.json({ error: "Failed to fetch player" }, { status: 500 });
  }
}

// PUT /api/players/[uid]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;
    const body    = await request.json();

    const allowed = [
      "displayName",
      "timeZone",
      "easySubscriptionStatus",
      "easySubscriptionExpiry",
      "hardSubscriptionStatus",
      "hardSubscriptionExpiry",
      "masterSubscriptionStatus",   // ← new
      "masterSubscriptionExpiry",   // ← new
      "purchasedMonths",
      "unlockedQuizzes",
    ];

    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) update[key] = body[key];
    }

    // Remove null expiry fields rather than writing null
    for (const key of ["easySubscriptionExpiry", "hardSubscriptionExpiry", "masterSubscriptionExpiry"]) {
      if (update[key] === null) delete update[key];
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const db = getAdminDb();
    await db.collection("users").doc(uid).update(update);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update player:", error);
    return NextResponse.json({ error: "Failed to update player" }, { status: 500 });
  }
}