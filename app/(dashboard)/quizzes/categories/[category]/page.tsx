"use client";

// connected-admin/app/(dashboard)/quizzes/categories/[category]/page.tsx
//
// Detail view for a single category: every clue tagged with it, across
// every quiz, difficulty, and date, with a straight line back into the
// quiz it belongs to for editing. Reached by clicking a row in the
// Category coverage panel on the main quizzes page.

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Quiz,
  Difficulty,
  DIFFICULTY_COLORS,
  TYPE_NAMES,
} from "@/lib/quiz-types";

interface CategoryClueRow {
  quizId: string;
  date: string;
  difficulty: Difficulty;
  type: number;
  clueText: string;
  acceptedAnswers: string[];
}

export default function CategoryDetailPage() {
  const params = useParams<{ category: string }>();
  const router = useRouter();
  const categoryName = decodeURIComponent(params.category);

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading]  = useState(true);

  useEffect(() => {
    fetch("/api/quizzes")
      .then((r) => r.json())
      .then((data) => { setQuizzes(data.quizzes ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const rows = useMemo<CategoryClueRow[]>(() => {
    const matched: CategoryClueRow[] = [];
    quizzes.forEach((q) => {
      (q.clues ?? []).forEach((c) => {
        if (!c.clueText?.trim()) return;
        const cat = c.category?.trim() || "Uncategorized";
        if (cat !== categoryName) return;
        matched.push({
          quizId: q.quizId,
          date: q.date,
          difficulty: q.difficulty,
          type: q.type,
          clueText: c.clueText,
          acceptedAnswers: c.acceptedAnswers ?? [],
        });
      });
    });
    return matched.sort((a, b) => b.date.localeCompare(a.date));
  }, [quizzes, categoryName]);

  return (
    <div>
      <button
        onClick={() => router.push("/quizzes")}
        className="text-xs text-gray-500 hover:text-gray-300 mb-4 transition-colors"
      >
        ← Back to quizzes
      </button>

      <h1 className="text-2xl font-bold text-gray-100 mb-1">{categoryName}</h1>
      <p className="text-gray-500 text-sm mb-6">
        {loading ? "Loading…" : `${rows.length} clue${rows.length !== 1 ? "s" : ""} in this category`}
      </p>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-500 text-sm">No clues tagged with this category yet.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left">
                  <th className="px-5 py-3 text-xs text-gray-500 font-medium">Clue</th>
                  <th className="px-5 py-3 text-xs text-gray-500 font-medium">Answers</th>
                  <th className="px-5 py-3 text-xs text-gray-500 font-medium">Date</th>
                  <th className="px-5 py-3 text-xs text-gray-500 font-medium">Type</th>
                  <th className="px-5 py-3 text-xs text-gray-500 font-medium">Difficulty</th>
                  <th className="px-5 py-3 text-xs text-gray-500 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const color = DIFFICULTY_COLORS[row.difficulty];
                  return (
                    <tr
                      key={`${row.quizId}-${i}`}
                      className={[
                        "border-b border-gray-800/50 hover:bg-gray-800/40 transition-colors",
                        i % 2 === 0 ? "" : "bg-gray-800/20",
                      ].join(" ")}
                    >
                      <td className="px-5 py-3 text-gray-200 max-w-xs">{row.clueText}</td>
                      <td className="px-5 py-3 text-gray-400">
                        {row.acceptedAnswers.join(", ") || "—"}
                      </td>
                      <td className="px-5 py-3 text-gray-400">{row.date}</td>
                      <td className="px-5 py-3 text-gray-400">{TYPE_NAMES[row.type]}</td>
                      <td className="px-5 py-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                          style={{ backgroundColor: color + "22", color }}
                        >
                          {row.difficulty}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/quizzes/${row.quizId}/edit`}
                          className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white rounded text-xs font-medium transition-colors"
                        >
                          Edit quiz
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
            {rows.map((row, i) => {
              const color = DIFFICULTY_COLORS[row.difficulty];
              return (
                <div
                  key={`${row.quizId}-${i}`}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                      style={{ backgroundColor: color + "22", color }}
                    >
                      {row.difficulty}
                    </span>
                    <span className="text-xs text-gray-500">
                      {row.date} · {TYPE_NAMES[row.type]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-200 mb-1">{row.clueText}</p>
                  <p className="text-xs text-gray-500 mb-4">
                    {row.acceptedAnswers.join(", ") || "—"}
                  </p>
                  <Link
                    href={`/quizzes/${row.quizId}/edit`}
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
    </div>
  );
}
