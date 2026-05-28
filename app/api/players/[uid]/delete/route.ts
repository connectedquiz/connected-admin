import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';

/**
 * connected-admin/app/api/players/[uid]/delete/route.ts
 *
 * DELETE /api/players/[uid]/delete
 *
 * Completely removes a player from the system:
 *   1. Deletes all /users/{uid}/quizRecords/* sub-collection documents
 *   2. Deletes /users/{uid} Firestore document
 *   3. Deletes the Firebase Auth account
 *
 * Called from the player detail page confirm-delete flow.
 * Requires admin session cookie (enforced by middleware/proxy.ts).
 *
 * Returns 200 on success, 400 if uid missing, 500 on error.
 *
 * NOTE: Next.js 15 changed route params to be async (Promise).
 * params must be awaited before destructuring — this was the root
 * cause of the "[uid] not found" error on Vercel.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  // ── CRITICAL: await params before use (Next.js 15 requirement) ──────────
  const { uid } = await params;

  if (!uid) {
    return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
  }

  const db   = getAdminDb();
  const auth = getAdminAuth();

  try {
    // ── Step 1: Delete quizRecords sub-collection ─────────────────────────
    // Firestore does NOT auto-delete sub-collections when a parent doc is deleted.
    // We must delete them manually, in batches of 500 (Firestore batch limit).
    const quizRecordsRef = db
      .collection('users')
      .doc(uid)
      .collection('quizRecords');

    let quizRecordCount = 0;
    let snapshot = await quizRecordsRef.limit(500).get();

    while (!snapshot.empty) {
      const batch = db.batch();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      quizRecordCount += snapshot.docs.length;
      snapshot = await quizRecordsRef.limit(500).get();
    }

    // ── Step 2: Delete /users/{uid} Firestore document ────────────────────
    await db.collection('users').doc(uid).delete();

    // ── Step 3: Delete Firebase Auth account ─────────────────────────────
    // Do this last — if Firestore deletion fails we still have the Auth
    // account and can retry. If Auth deletion fails after Firestore is gone,
    // the orphaned Auth account is harmless (no user doc = invisible to app).
    try {
      await auth.deleteUser(uid);
    } catch (authError: any) {
      // auth/user-not-found is fine — account may already be deleted
      if (authError?.errorInfo?.code !== 'auth/user-not-found') {
        throw authError;
      }
    }

    console.log(
      `[Admin] Player deleted: ${uid} ` +
      `(${quizRecordCount} quiz records removed)`
    );

    return NextResponse.json({
      success: true,
      uid,
      quizRecordsDeleted: quizRecordCount
    });

  } catch (error: any) {
    console.error(`[Admin] Failed to delete player ${uid}:`, error);
    return NextResponse.json(
      { error: error?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}