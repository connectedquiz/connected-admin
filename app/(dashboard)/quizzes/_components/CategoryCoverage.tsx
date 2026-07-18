"use client";

// connected-admin/app/(dashboard)/quizzes/_components/CategoryCoverage.tsx
//
// Simple first-pass coverage dashboard: counts how many clues fall under
// each category across every quiz, so it's easy to see at a glance whether
// writing has leaned too hard on strong areas (history, geography, etc.)
// and needs to consciously reach for something like sports or mythology.
// All-time totals only for this first pass — date-range filtering can be
// added later if the all-time view isn't the useful cut.

import { useMemo, useState } from "react";
import { Quiz } from "@/lib/quiz-types";

interface Props {
  quizzes: Quiz[];
}

export default function CategoryCoverage({ quizzes }: Props) {
  const [expanded, setExpanded] = useState(false);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    quizzes.forEach((q) => {
      (q.clues ?? []).forEach((c) => {
        if (!c.clueText?.trim()) return; // don't count empty placeholder clues
        const cat = c.category?.trim() || "Uncategorized";
        map[cat] = (map[cat] ?? 0) + 1;
      });
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [quizzes]);

  const total = counts.reduce((sum, [, n]) => sum + n, 0);
  const max = counts.length > 0 ? counts[0][1] : 1;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between text-left"
      >
        <div>
          <h2 className="text-sm font-semibold text-gray-200">Category coverage</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {total} categorized clues across {quizzes.length} quizzes
          </p>
        </div>
        <span className="text-gray-500 text-xs">{expanded ? "▲ Hide" : "▼ Show"}</span>
      </button>

      {expanded && (
        <div className="mt-4 space-y-2">
          {counts.length === 0 ? (
            <p className="text-xs text-gray-600">No categorized clues yet — categories get set per-clue in the quiz editor.</p>
          ) : (
            counts.map(([cat, count]) => (
              <div key={cat} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-44 shrink-0 truncate" title={cat}>{cat}</span>
                <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-600 rounded-full"
                    style={{ width: `${Math.max(4, (count / max) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-8 text-right shrink-0">{count}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
