"use client";

// connected-admin/app/(dashboard)/quizzes/page.tsx

import { useEffect, useState } from "react";
import Link from "next/link";
import { Quiz, Difficulty, DIFFICULTY_COLORS, TYPE_LABELS } from "@/lib/quiz-types";
import MonthCalendar from "./_components/MonthCalendar";

type ViewMode = "calendar" | "list";

export default function QuizzesPage() {
  const [quizzes,         setQuizzes]         = useState<Quiz[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [viewMode,        setViewMode]        = useState<ViewMode>("calendar");
  const [filterDifficulty, setFilterDifficulty] = useState<Difficulty | "all">("all");
  const [filterType,      setFilterType]      = useState<string>("all");

  // Calendar state
  const [calYear,      setCalYear]      = useState(() => new Date().getFullYear());
  const [calMonth,     setCalMonth]     = useState(() => new Date().getMonth() + 1);
  const [calDifficulty, setCalDifficulty] = useState<Difficulty>("easy");

  useEffect(() => {
    fetch("/api/quizzes")
      .then((r) => r.json())
      .then((data) => { setQuizzes(data.quizzes ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = quizzes.filter((q) => {
    if (filterDifficulty !== "all" && q.difficulty !== filterDifficulty) return false;
    if (filterType !== "all" && String(q.type) !== filterType) return false;
    return true;
  });

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Quizzes</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {loading ? "Loading…" : `${quizzes.length} total`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          <div className="flex bg-gray-800 rounded-lg p-1 gap-1">
            <button
              onClick={() => setViewMode("calendar")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                viewMode === "calendar"
                  ? "bg-purple-600 text-white"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              📅 Calendar
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                viewMode === "list"
                  ? "bg-purple-600 text-white"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              ☰ List
            </button>
          </div>
          <Link
            href="/quizzes/new"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            + New quiz
          </Link>
        </div>
      </div>

      {/* ── Calendar view ── */}
      {viewMode === "calendar" && (
        <div>
          {loading ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
              <p className="text-gray-500 text-sm">Loading quizzes…</p>
            </div>
          ) : (
            <MonthCalendar
              year={calYear}
              month={calMonth}
              difficulty={calDifficulty}
              quizzes={quizzes}
              onYearMonthChange={(y, m) => { setCalYear(y); setCalMonth(m); }}
              onDifficultyChange={setCalDifficulty}
            />
          )}
        </div>
      )}

      {/* ── List view ── */}
      {viewMode === "list" && (
        <>
          {/* Filters */}
          <div className="flex gap-3 mb-5 flex-wrap">
            <select
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value as Difficulty | "all")}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All difficulties</option>
              <option value="easy">Easy</option>
              <option value="hard">Hard</option>
              <option value="master">Master</option>
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All types</option>
              <option value="5">Paragraph (5)</option>
              <option value="10">Page (10)</option>
              <option value="30">Chapter (30)</option>
              <option value="50">Tome (50)</option>
            </select>
          </div>

          {/* Content */}
          {loading ? (
            <p className="text-gray-500 text-sm">Loading quizzes…</p>
          ) : filtered.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
              <p className="text-gray-500 text-sm">
                {quizzes.length === 0
                  ? "No quizzes yet. Create your first one!"
                  : "No quizzes match your filters."}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-left">
                      <th className="px-5 py-3 text-xs text-gray-500 font-medium">Quiz ID</th>
                      <th className="px-5 py-3 text-xs text-gray-500 font-medium">Date</th>
                      <th className="px-5 py-3 text-xs text-gray-500 font-medium">Difficulty</th>
                      <th className="px-5 py-3 text-xs text-gray-500 font-medium">Type</th>
                      <th className="px-5 py-3 text-xs text-gray-500 font-medium">Clues</th>
                      <th className="px-5 py-3 text-xs text-gray-500 font-medium">Status</th>
                      <th className="px-5 py-3 text-xs text-gray-500 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((quiz, i) => {
                      const color      = DIFFICULTY_COLORS[quiz.difficulty];
                      const clueCount  = quiz.clues?.length ?? 0;
                      const complete   = clueCount >= quiz.type;
                      const hasPartial = clueCount > 0 && !complete;
                      return (
                        <tr
                          key={quiz.quizId}
                          className={[
                            "border-b border-gray-800/50 hover:bg-gray-800/40 transition-colors",
                            i % 2 === 0 ? "" : "bg-gray-800/20",
                          ].join(" ")}
                        >
                          <td className="px-5 py-3">
                            <code className="text-xs font-mono text-gray-400">{quiz.quizId}</code>
                          </td>
                          <td className="px-5 py-3 text-gray-300">{quiz.date}</td>
                          <td className="px-5 py-3">
                            <span
                              className="px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                              style={{ backgroundColor: color + "22", color }}
                            >
                              {quiz.difficulty}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-gray-400">{TYPE_LABELS[quiz.type]}</td>
                          <td className="px-5 py-3 text-gray-400">
                            {clueCount} / {quiz.type}
                          </td>
                          <td className="px-5 py-3">
                            {complete ? (
                              <span className="text-xs font-semibold text-green-400">✓ Complete</span>
                            ) : hasPartial ? (
                              <span className="text-xs font-semibold text-yellow-400">⚠ In progress</span>
                            ) : (
                              <span className="text-xs text-gray-600">Empty</span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <Link
                              href={`/quizzes/${quiz.quizId}/edit`}
                              className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white rounded text-xs font-medium transition-colors"
                            >
                              Edit
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden space-y-3">
                {filtered.map((quiz) => {
                  const color      = DIFFICULTY_COLORS[quiz.difficulty];
                  const clueCount  = quiz.clues?.length ?? 0;
                  const complete   = clueCount >= quiz.type;
                  const hasPartial = clueCount > 0 && !complete;
                  return (
                    <div
                      key={quiz.quizId}
                      className="bg-gray-900 border border-gray-800 rounded-xl p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                          style={{ backgroundColor: color + "22", color }}
                        >
                          {quiz.difficulty}
                        </span>
                        <span className={[
                          "text-xs font-medium",
                          complete ? "text-green-400" : hasPartial ? "text-yellow-400" : "text-gray-600",
                        ].join(" ")}>
                          {complete ? "✓ Complete" : hasPartial ? `⚠ ${clueCount}/${quiz.type}` : "Empty"}
                        </span>
                      </div>
                      <code className="block text-xs font-mono text-gray-400 mb-1 break-all">
                        {quiz.quizId}
                      </code>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
                        <span>{quiz.date}</span>
                        <span className="text-gray-700">·</span>
                        <span>{TYPE_LABELS[quiz.type]}</span>
                      </div>
                      <Link
                        href={`/quizzes/${quiz.quizId}/edit`}
                        className="block w-full text-center py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Edit quiz
                      </Link>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
