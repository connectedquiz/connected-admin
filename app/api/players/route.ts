// connected-admin/app/api/players/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";

// GET /api/players?search=query
// Returns players from Firestore users collection.
// Email is fetched from Firebase Auth for each player — only called in admin context.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.toLowerCase() ?? "";

    const db   = getAdminDb();
    const auth = getAdminAuth();
    const snap = await db.collection("users").get();

    // Build list and enrich with email from Firebase Auth
    const players = await Promise.all(
      snap.docs.map(async (doc) => {
        const data = doc.data();
        let email  = data.email ?? "";

        // Fetch email from Auth if not stored in Firestore doc
        if (!email) {
          try {
            const authUser = await auth.getUser(doc.id);
            email = authUser.email ?? "";
          } catch { /* user may be deleted from Auth but doc still exists */ }
        }

        return {
          uid:                     doc.id,
          displayName:             data.displayName,
          email,
          easySubscriptionStatus:  data.easySubscriptionStatus,
          hardSubscriptionStatus:  data.hardSubscriptionStatus,
          masterSubscriptionStatus: data.masterSubscriptionStatus,
        };
      })
    );

    // Filter by search (name, email, or UID)
    const filtered = search
      ? players.filter((p) =>
          p.displayName?.toLowerCase().includes(search) ||
          p.email?.toLowerCase().includes(search) ||
          p.uid.toLowerCase().includes(search)
        )
      : players;

    // Sort: named players first, then unnamed, alphabetically within each group
    filtered.sort((a, b) => {
      const aName = a.displayName?.toLowerCase() ?? "";
      const bName = b.displayName?.toLowerCase() ?? "";
      if (!aName && bName)  return 1;
      if (aName  && !bName) return -1;
      return aName.localeCompare(bName);
    });

    return NextResponse.json({ players: filtered });
  } catch (error) {
    console.error("Failed to fetch players:", error);
    return NextResponse.json({ error: "Failed to fetch players" }, { status: 500 });
  }
}