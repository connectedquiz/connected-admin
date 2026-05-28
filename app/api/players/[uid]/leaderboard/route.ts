// connected-admin/app/api/players/[uid]/leaderboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

// GET /api/players/[uid]/leaderboard?poolKey=easy_2026-04&poolId=pool_1
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;
    const { searchParams } = new URL(request.url);
    const poolKey = searchParams.get("poolKey");
    const poolId  = searchParams.get("poolId");

    if (!poolKey || !poolId) {
      return NextResponse.json({ error: "poolKey and poolId required" }, { status: 400 });
    }

    const db  = getAdminDb();
    const doc = await db
      .collection("leaderboards").doc(poolKey)
      .collection("pools").doc(poolId)
      .collection("players").doc(uid)
      .get();

    if (!doc.exists) {
      return NextResponse.json({ monthlyTotal: 0, displayName: "" });
    }

    return NextResponse.json({
      monthlyTotal: doc.data()?.monthlyTotal ?? 0,
      displayName:  doc.data()?.displayName  ?? "",
    });
  } catch (error) {
    console.error("Failed to fetch leaderboard entry:", error);
    return NextResponse.json({ error: "Failed to fetch leaderboard entry" }, { status: 500 });
  }
}

// PUT /api/players/[uid]/leaderboard — update score directly
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid }               = await params;
    const { poolKey, poolId, monthlyTotal, displayName } = await request.json();

    if (!poolKey || !poolId || monthlyTotal === undefined) {
      return NextResponse.json({ error: "poolKey, poolId, and monthlyTotal required" }, { status: 400 });
    }

    const db = getAdminDb();

    // Update the player's score in the pool
    await db
      .collection("leaderboards").doc(poolKey)
      .collection("pools").doc(poolId)
      .collection("players").doc(uid)
      .set({
        monthlyTotal: Number(monthlyTotal),
        displayName:  displayName ?? "Player",
        updatedByAdmin: true,
        adminUpdatedAt: new Date().toISOString(),
      }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update leaderboard score:", error);
    return NextResponse.json({ error: "Failed to update leaderboard score" }, { status: 500 });
  }
}