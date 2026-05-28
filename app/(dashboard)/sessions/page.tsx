"use client";

// connected-admin/app/(dashboard)/sessions/page.tsx

import { useEffect, useState } from "react";
import Link from "next/link";

interface FlaggedSession {
  sessionId: string;
  uid: string;
  quizId: string;
  difficulty: string;
  currentScore: number;
  startTimeUTC: string;
  endTimeUTC?: string;
  flagReasons: string[];
  reviewed?: boolean;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy:   "#4CAF50",
  hard:   "#E87070",
  master: "#9B6FD9",
};

export default function SessionsPage() {
  const [sessions, setSessions]         = useState<FlaggedSession[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showReviewed, setShowReviewed] = useState(false);

  useEffect(() => {
    fetch("/api/sessions")
      .then((r) => r.json())
      .then((data) => { setSessions(data.sessions ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered        = sessions.filter((s) => showReviewed ? true : !s.reviewed);
  const unreviewedCount = sessions.filter((s) => !s.reviewed).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Flagged Sessions</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {loading
              ? "Loading..."
              : `${unreviewedCount} unreviewed · ${sessions.length} total`}
          </p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showReviewed}
            onChange={(e) => setShowReviewed(e.target.checked)}
            className="w-4 h-4 accent-purple-500"
          />
          <span className="text-sm text-gray-400">Show reviewed</span>
        </label>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading sessions...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-500 text-sm">
            {sessions.length === 0
              ? "No flagged sessions. All clear!"
              : "No unreviewed sessions remaining."}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table — lg and up (1024px+) only.
              7 columns including wrapping flag-reason pills need this much width.
              Below lg the card layout takes over so Review is always visible. */}
          <div className="hidden lg:block bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left">
                  <th className="px-5 py-3 text-xs text-gray-500 font-medium">Player UID</th>
                  <th className="px-5 py-3 text-xs text-gray-500 font-medium">Quiz</th>
                  <th className="px-5 py-3 text-xs text-gray-500 font-medium">Score</th>
                  <th className="px-5 py-3 text-xs text-gray-500 font-medium">Flag reasons</th>
                  <th className="px-5 py-3 text-xs text-gray-500 font-medium">Started</th>
                  <th className="px-5 py-3 text-xs text-gray-500 font-medium">Status</th>
                  <th className="px-5 py-3 text-xs text-gray-500 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((session, i) => (
                  <tr
                    key={session.sessionId}
                    className={[
                      "border-b border-gray-800/50 hover:bg-gray-800/40 transition-colors",
                      i % 2 === 0 ? "" : "bg-gray-800/20",
                      session.reviewed ? "opacity-50" : "",
                    ].join(" ")}
                  >
                    <td className="px-5 py-3">
                      <code className="text-xs font-mono text-gray-500">{session.uid?.slice(0, 12)}...</code>
                    </td>
                    <td className="px-5 py-3">
                      <code className="text-xs font-mono text-gray-400">{session.quizId}</code>
                    </td>
                    <td className="px-5 py-3 text-gray-300 font-medium">{session.currentScore ?? "—"}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {session.flagReasons?.map((reason) => (
                          <span key={reason} className="px-2 py-0.5 bg-red-900/40 border border-red-800/50 text-red-400 text-xs rounded-full">
                            {reason}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {session.startTimeUTC ? new Date(session.startTimeUTC).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-5 py-3">
                      {session.reviewed ? (
                        <span className="text-xs text-gray-600">Reviewed</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-yellow-900/40 border border-yellow-800/50 text-yellow-400 text-xs rounded-full">Needs review</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/sessions/${session.sessionId}`} className="px-3 py-1.5 bg-red-900/50 hover:bg-red-800/60 text-red-300 rounded text-xs font-medium transition-colors whitespace-nowrap">
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards — below lg (under 1024px).
              Covers mobile, tablet, and medium-width desktop windows.
              Review button is always full-width and impossible to miss. */}
          <div className="lg:hidden space-y-3">
            {filtered.map((session) => {
              const diffColor = DIFFICULTY_COLORS[session.difficulty] ?? "#888888";
              const dateStr   = session.startTimeUTC ? new Date(session.startTimeUTC).toLocaleDateString() : "—";
              return (
                <div
                  key={session.sessionId}
                  className={["bg-gray-900 border border-gray-800 rounded-xl p-4", session.reviewed ? "opacity-60" : ""].join(" ")}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium capitalize" style={{ backgroundColor: diffColor + "22", color: diffColor }}>
                      {session.difficulty || "unknown"}
                    </span>
                    {session.reviewed ? (
                      <span className="text-xs text-gray-600">Reviewed</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-yellow-900/40 border border-yellow-800/50 text-yellow-400 text-xs rounded-full">Needs review</span>
                    )}
                  </div>

                  <code className="block text-xs font-mono text-gray-400 mb-1 break-all">{session.quizId}</code>

                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                    <code className="font-mono">{session.uid?.slice(0, 12)}...</code>
                    <span className="text-gray-700">·</span>
                    <span>{dateStr}</span>
                  </div>

                  <p className="text-sm text-gray-300 font-medium mb-3">
                    Score: {session.currentScore ?? "—"}
                  </p>

                  {session.flagReasons?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {session.flagReasons.map((reason) => (
                        <span key={reason} className="px-2 py-0.5 bg-red-900/40 border border-red-800/50 text-red-400 text-xs rounded-full">
                          {reason}
                        </span>
                      ))}
                    </div>
                  )}

                  <Link
                    href={`/sessions/${session.sessionId}`}
                    className="block w-full text-center py-2 bg-red-900/50 hover:bg-red-800/60 text-red-300 rounded-lg text-sm font-medium transition-colors"
                  >
                    Review session
                  </Link>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
