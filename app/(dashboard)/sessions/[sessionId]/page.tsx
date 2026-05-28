"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface GameSession {
  sessionId: string;
  uid: string;
  quizId: string;
  difficulty: string;
  startTimeUTC: string;
  lastActiveTimeUTC?: string;
  endTimeUTC?: string;
  currentClueIndex: number;
  currentScore: number;
  isComplete: boolean;
  isFirstAttempt: boolean;
  flagged: boolean;
  flagReasons: string[];
  reviewed?: boolean;
  reviewNote?: string;
}

export default function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();

  const [session, setSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [reviewNote, setReviewNote] = useState("");

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        setSession(data.session);
        setReviewNote(data.session?.reviewNote ?? "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [sessionId]);

  async function handleClearFlag() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flagged: false,
          reviewed: true,
          reviewNote,
        }),
      });
      if (!res.ok) throw new Error("Failed to clear flag");
      router.push("/sessions");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
      setSaving(false);
    }
  }

  async function handleMarkReviewed() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewed: true,
          reviewNote,
        }),
      });
      if (!res.ok) throw new Error("Failed to mark reviewed");
      setSession((prev) => prev ? { ...prev, reviewed: true, reviewNote } : prev);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-gray-500 text-sm">Loading session…</p>;
  if (!session) return <p className="text-red-400 text-sm">Session not found.</p>;

  const duration =
    session.startTimeUTC && session.endTimeUTC
      ? Math.round(
          (new Date(session.endTimeUTC).getTime() -
            new Date(session.startTimeUTC).getTime()) /
            1000
        )
      : null;

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push("/sessions")}
          className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
        >
          ← Flagged sessions
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Session review</h1>
          <code className="text-xs font-mono text-gray-500">{sessionId}</code>
        </div>
      </div>

      {/* Flag reasons */}
      <section className="bg-red-900/20 border border-red-800/50 rounded-xl p-5 mb-5">
        <h2 className="text-red-400 font-semibold mb-3">Flag reasons</h2>
        <div className="flex flex-wrap gap-2">
          {session.flagReasons?.map((reason) => (
            <span
              key={reason}
              className="px-3 py-1 bg-red-900/40 border border-red-700/50 text-red-300 text-sm rounded-full"
            >
              {reason}
            </span>
          ))}
        </div>
      </section>

      {/* Session details */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-5">
        <h2 className="text-gray-300 font-semibold mb-4">Session details</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Detail label="Player UID">
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono text-gray-400 break-all">
                {session.uid}
              </code>
              <Link
                href={`/players/${session.uid}`}
                className="text-purple-400 hover:text-purple-300 text-xs whitespace-nowrap"
              >
                View player →
              </Link>
            </div>
          </Detail>
          <Detail label="Quiz ID">
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono text-gray-400">
                {session.quizId}
              </code>
              <Link
                href={`/quizzes/${session.quizId}/edit`}
                className="text-purple-400 hover:text-purple-300 text-xs whitespace-nowrap"
              >
                View quiz →
              </Link>
            </div>
          </Detail>
          <Detail label="Score">
            <span className="text-gray-100 font-semibold">
              {session.currentScore ?? "—"}
            </span>
          </Detail>
          <Detail label="Difficulty">
            <span className="text-gray-300 capitalize">
              {session.difficulty}
            </span>
          </Detail>
          <Detail label="Clue reached">
            <span className="text-gray-300">
              {session.currentClueIndex ?? "—"}
            </span>
          </Detail>
          <Detail label="Complete">
            <span
              className={
                session.isComplete ? "text-green-400" : "text-gray-500"
              }
            >
              {session.isComplete ? "Yes" : "No"}
            </span>
          </Detail>
          <Detail label="First attempt">
            <span
              className={
                session.isFirstAttempt ? "text-green-400" : "text-yellow-400"
              }
            >
              {session.isFirstAttempt ? "Yes" : "No"}
            </span>
          </Detail>
          <Detail label="Duration">
            <span className="text-gray-300">
              {duration != null ? `${duration}s` : "—"}
            </span>
          </Detail>
          <Detail label="Started">
            <span className="text-gray-400 text-xs">
              {session.startTimeUTC
                ? new Date(session.startTimeUTC).toLocaleString()
                : "—"}
            </span>
          </Detail>
          <Detail label="Ended">
            <span className="text-gray-400 text-xs">
              {session.endTimeUTC
                ? new Date(session.endTimeUTC).toLocaleString()
                : "—"}
            </span>
          </Detail>
        </div>
      </section>

      {/* Review note */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-5">
        <h2 className="text-gray-300 font-semibold mb-3">Review note</h2>
        <textarea
          value={reviewNote}
          onChange={(e) => setReviewNote(e.target.value)}
          rows={3}
          placeholder="Optional note about this session…"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
        />
      </section>

      {/* Status */}
      {session.reviewed && (
        <p className="text-green-400 text-sm mb-4">
          ✓ This session has been marked as reviewed.
        </p>
      )}
      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={handleClearFlag}
          disabled={saving}
          className="px-5 py-2.5 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Clear flag — false positive
        </button>
        <button
          onClick={handleMarkReviewed}
          disabled={saving || !!session.reviewed}
          className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-gray-200 text-sm font-semibold rounded-lg transition-colors"
        >
          {session.reviewed ? "Reviewed ✓" : "Mark reviewed (keep flag)"}
        </button>
        <button
          onClick={() => router.push("/sessions")}
          className="px-5 py-2.5 bg-gray-900 border border-gray-700 hover:bg-gray-800 text-gray-400 text-sm rounded-lg transition-colors"
        >
          Back
        </button>
      </div>
    </div>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      {children}
    </div>
  );
}