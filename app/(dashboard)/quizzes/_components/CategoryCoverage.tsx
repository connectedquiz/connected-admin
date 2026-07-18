"use client";

// connected-admin/app/(dashboard)/quizzes/_components/CategoryCoverage.tsx
//
// Coverage dashboard: shows every category from the shared, Firestore-backed
// category list — including ones with zero clues so far — so gaps are
// visible at a glance rather than only showing categories already in use.
// Any clue without a category shows up under a synthetic "Uncategorized"
// row too, which doubles as a nice "how much tagging is left to do" signal.
// Click any row to see every clue tagged with that category.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Quiz } from "@/lib/quiz-types";

interface Props {
  quizzes: Quiz[];
}

export default function CategoryCoverage({ quizzes }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [allCategories, setAllCategories] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => { if (data.categories) setAllCategories(data.categories); })
      .catch(() => { /* falls back to whatever categories actually appear in quizzes below */ });
  }, []);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    allCategories.forEach((cat) => { map[cat] = 0; });

    quizzes.forEach((q) => {
      (q.clues ?? []).forEach((c) => {
        if (!c.clueText?.trim()) return; // don't count empty placeholder clues
        const cat = c.category?.trim() || "Uncategorized";
        map[cat] = (map[cat] ?? 0) + 1;
      });
    });

    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [quizzes, allCategories]);

  const total = counts.reduce((sum, [, n]) => sum + n, 0);
  const max = Math.max(1, ...counts.map(([, n]) => n));

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
            <p className="text-xs text-gray-600">No categories found.</p>
          ) : (
            counts.map(([cat, count]) => (
              <Link
                key={cat}
                href={`/quizzes/categories/${encodeURIComponent(cat)}`}
                className="flex items-center gap-3 group"
              >
                <span
                  className="text-xs w-44 shrink-0 truncate transition-colors group-hover:text-purple-300"
                  style={{ color: count === 0 ? "#4B5563" : "#9CA3AF" }}
                  title={cat}
                >
                  {cat}
                </span>
                <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
                  {count > 0 && (
                    <div
                      className="h-full bg-purple-600 rounded-full transition-colors group-hover:bg-purple-500"
                      style={{ width: `${Math.max(4, (count / max) * 100)}%` }}
                    />
                  )}
                </div>
                <span
                  className="text-xs w-8 text-right shrink-0"
                  style={{ color: count === 0 ? "#4B5563" : "#6B7280" }}
                >
                  {count}
                </span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
