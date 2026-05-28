// connected-admin/app/api/sessions/route.ts
//
// GET /api/sessions — fetch all flagged sessions
//
// BUG FIX: The previous version combined .where("flagged", "==", true) with
// .orderBy("startTimeUTC", "desc"). Firestore requires a composite index for
// any query that filters on one field and orders by a different field. Without
// that index, Firestore throws an error which the catch block swallows silently,
// returning an empty array — making the sessions page appear blank even when
// flagged sessions exist in the database.
//
// Fix: remove .orderBy() from the Firestore query entirely and sort the results
// in JavaScript after fetching. This works perfectly for up to 200 sessions and
// requires zero Firestore index configuration.
//
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function GET() {
  try {
    const db = getAdminDb();
    const snapshot = await db
      .collection("sessions")
      .where("flagged", "==", true)
      // NOTE: No .orderBy() here — that combination requires a composite index.
      // We sort in JS below instead.
      .limit(200)
      .get();

    const sessions = snapshot.docs
      .map((doc) => ({
        sessionId: doc.id,
        ...doc.data(),
      }))
      // Sort by startTimeUTC descending — most recent flagged sessions first.
      // startTimeUTC is stored as a Unix seconds number, so numeric sort works.
      .sort((a: any, b: any) => (b.startTimeUTC ?? 0) - (a.startTimeUTC ?? 0));

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("[Admin] Failed to fetch sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}