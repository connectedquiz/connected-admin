"use client";

// connected-admin/app/(dashboard)/quizzes/_components/QuizForm.tsx

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Quiz,
  Clue,
  Difficulty,
  QuizType,
  DIFFICULTY_COLORS,
  TYPE_NAMES,
  buildQuizId,
} from "@/lib/quiz-types";

interface Props {
  initialData?: Quiz;
  mode: "create" | "edit";
}

function emptyClue(): Clue {
  return { clueText: "", acceptedAnswers: [], requiresExactMatch: false };
}

function todayString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function thisMonthString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

function dateToMonth(date: string): string {
  return date.length >= 7 ? date.slice(0, 7) : thisMonthString();
}

function monthToDate(month: string): string {
  return `${month}-01`;
}

function makeClues(count: number, existing: Clue[]): Clue[] {
  if (existing.length >= count) return existing.slice(0, count);
  return [
    ...existing,
    ...Array.from({ length: count - existing.length }, emptyClue),
  ];
}

// ── Draft persistence helpers ──────────────────────────────────────────────────

interface DraftData {
  date: string;
  type: QuizType;
  difficulty: Difficulty;
  clues: Clue[];
  savedAt: number; // unix ms
}

function draftKey(mode: "create" | "edit", initialData?: Quiz): string {
  if (mode === "edit" && initialData) {
    return `quiz_draft_edit_${initialData.quizId}`;
  }
  return `quiz_draft_new`;
}

function saveDraft(key: string, data: DraftData) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // localStorage unavailable — silent fail
  }
}

function loadDraft(key: string): DraftData | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as DraftData;
  } catch {
    return null;
  }
}

function clearDraft(key: string) {
  try {
    localStorage.removeItem(key);
  } catch { /* silent */ }
}

function formatDraftAge(savedAt: number): string {
  const diffMs  = Date.now() - savedAt;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1)  return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24)  return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function QuizForm({ initialData, mode }: Props) {
  const router       = useRouter();
  const searchParams = useSearchParams();

  // Read URL query params for pre-filling from calendar click
  const urlDate       = searchParams.get("date")       ?? null;
  const urlType       = searchParams.get("type")       ?? null;
  const urlDifficulty = searchParams.get("difficulty") ?? null;

  const key = draftKey(mode, initialData);

  // ── State ──────────────────────────────────────────────────────────────────

  const [date, setDate] = useState(() => {
    if (mode === "create" && urlDate) return urlDate;
    return initialData?.date ?? todayString();
  });
  const [type, setType] = useState<QuizType>(() => {
    if (mode === "create" && urlType) return Number(urlType) as QuizType;
    return initialData?.type ?? 5;
  });
  const [difficulty, setDifficulty] = useState<Difficulty>(() => {
    if (mode === "create" && urlDifficulty) return urlDifficulty as Difficulty;
    return initialData?.difficulty ?? "easy";
  });
  const [clues, setClues] = useState<Clue[]>(() => {
    const count = (mode === "create" && urlType) ? Number(urlType) : (initialData?.type ?? 5);
    return initialData?.clues ?? makeClues(count, []);
  });
  const [chipInputs, setChipInputs] = useState<string[]>(() => {
    const count = (mode === "create" && urlType) ? Number(urlType) : (initialData?.type ?? 5);
    return (initialData?.clues ?? makeClues(count, [])).map(() => "");
  });

  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Draft state
  const [draft,           setDraft]           = useState<DraftData | null>(null);
  const [draftRestored,   setDraftRestored]   = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [draftSavedAt,    setDraftSavedAt]    = useState<number | null>(null);
  const [draftStatus,     setDraftStatus]     = useState<"idle" | "saved">("idle");

  const autoSaveTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const debounceTimerRef  = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const isFirstRenderRef  = useRef(true);

  // ── Check for saved draft on mount ────────────────────────────────────────

  useEffect(() => {
    // Only offer draft restore in create mode — in edit mode we auto-apply silently
    const saved = loadDraft(key);
    if (!saved) return;

    const ageMs = Date.now() - saved.savedAt;
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    if (ageDays > 7) {
      // Draft older than 7 days — discard silently
      clearDraft(key);
      return;
    }

    if (mode === "create") {
      // Only offer if URL params didn't already pre-fill from calendar
      const hasUrlParams = urlDate || urlType || urlDifficulty;
      if (!hasUrlParams) {
        setDraft(saved);
        setShowDraftBanner(true);
      }
    }
    // In edit mode: don't offer restore — live Firestore data is authoritative
  }, [key, mode, urlDate, urlType, urlDifficulty]);

  // ── Auto-save logic ───────────────────────────────────────────────────────

  const doSave = useCallback(() => {
    if (draftRestored) return; // don't save a draft we just discarded
    const data: DraftData = { date, type, difficulty, clues, savedAt: Date.now() };
    saveDraft(key, data);
    setDraftSavedAt(data.savedAt);
    setDraftStatus("saved");
    setTimeout(() => setDraftStatus("idle"), 2000);
  }, [date, type, difficulty, clues, key, draftRestored]);

  // Debounced save — fires 3s after last change
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(doSave, 3000);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [date, type, difficulty, clues, doSave]);

  // Interval save — every 60s regardless of changes
  useEffect(() => {
    autoSaveTimerRef.current = setInterval(doSave, 60_000);
    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
  }, [doSave]);

  // ── Draft restore / dismiss ────────────────────────────────────────────────

  function restoreDraft() {
    if (!draft) return;
    setDate(draft.date);
    setType(draft.type);
    setDifficulty(draft.difficulty);
    setClues(draft.clues);
    setChipInputs(draft.clues.map(() => ""));
    setShowDraftBanner(false);
    setDraft(null);
    setDraftSavedAt(draft.savedAt);
  }

  function dismissDraft() {
    clearDraft(key);
    setShowDraftBanner(false);
    setDraft(null);
    setDraftRestored(true); // suppress further saves until user makes a change
  }

  // ── Derived values ─────────────────────────────────────────────────────────

  const isMaster    = difficulty === "master" || type === 50;
  const diffColor   = DIFFICULTY_COLORS[difficulty];
  const quizId      = date ? buildQuizId(date, type, difficulty) : "—";
  const clueCountColor =
    clues.length === type
      ? "text-green-400"
      : clues.length > type
      ? "text-red-400"
      : "text-yellow-400";

  // ── Difficulty change ──────────────────────────────────────────────────────

  function handleDifficultyChange(newDiff: Difficulty) {
    setDifficulty(newDiff);
    if (newDiff === "master") {
      setType(50);
      setDate((prev) => monthToDate(dateToMonth(prev)));
      setClues((prev) => {
        const next = makeClues(50, prev);
        setChipInputs(next.map((_, i) => chipInputs[i] ?? ""));
        return next;
      });
    } else if (type === 50) {
      setType(5);
      setDate(todayString());
      setClues((prev) => {
        const next = makeClues(5, prev);
        setChipInputs(next.map((_, i) => chipInputs[i] ?? ""));
        return next;
      });
    }
  }

  // ── Type change ────────────────────────────────────────────────────────────

  function handleTypeChange(newType: QuizType) {
    setType(newType);
    if (newType === 50) {
      setDifficulty("master");
      setDate((prev) => monthToDate(dateToMonth(prev)));
    } else if (difficulty === "master") {
      setDifficulty("easy");
      setDate(todayString());
    }
    setClues((prev) => {
      const next = makeClues(newType, prev);
      setChipInputs(next.map((_, i) => chipInputs[i] ?? ""));
      return next;
    });
  }

  // ── Month picker (Master / Tome only) ─────────────────────────────────────

  function handleMonthChange(monthValue: string) {
    setDate(monthToDate(monthValue));
  }

  // ── Clue operations ────────────────────────────────────────────────────────

  function updateClue(index: number, patch: Partial<Clue>) {
    setClues((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function addClue() {
    setClues((prev) => [...prev, emptyClue()]);
    setChipInputs((prev) => [...prev, ""]);
  }

  function removeClue(index: number) {
    setClues((prev) => prev.filter((_, i) => i !== index));
    setChipInputs((prev) => prev.filter((_, i) => i !== index));
  }

  function moveClue(index: number, direction: "up" | "down") {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= clues.length) return;
    setClues((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setChipInputs((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  // ── Chip operations ────────────────────────────────────────────────────────

  function addChip(clueIndex: number) {
    const raw = chipInputs[clueIndex].trim();
    if (!raw) return;
    if (clues[clueIndex].acceptedAnswers.includes(raw)) return;
    updateClue(clueIndex, {
      acceptedAnswers: [...clues[clueIndex].acceptedAnswers, raw],
    });
    setChipInputs((prev) => {
      const next = [...prev];
      next[clueIndex] = "";
      return next;
    });
  }

  function removeChip(clueIndex: number, answer: string) {
    updateClue(clueIndex, {
      acceptedAnswers: clues[clueIndex].acceptedAnswers.filter((a) => a !== answer),
    });
  }

  function handleChipKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    clueIndex: number
  ) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addChip(clueIndex);
    }
  }

  // ── Save / Delete ──────────────────────────────────────────────────────────

  async function handleSave() {
    setError("");
    if (!date) { setError("Please pick a date."); return; }
    if (clues.length !== type) {
      setError(`This quiz needs exactly ${type} clues. You have ${clues.length}.`);
      return;
    }
    if (clues.some((c) => !c.clueText.trim())) {
      setError("All clues must have text.");
      return;
    }
    if (clues.some((c) => c.acceptedAnswers.length === 0)) {
      setError("Every clue needs at least one accepted answer.");
      return;
    }

    setSaving(true);
    try {
      if (mode === "create") {
        const res = await fetch("/api/quizzes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quizId, date, type, difficulty, clues }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Create failed");
        clearDraft(key); // clean up on successful save
        router.push("/quizzes");
      } else {
        const res = await fetch(`/api/quizzes/${initialData!.quizId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clues }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Save failed");
        clearDraft(key);
        router.push("/quizzes");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      const res = await fetch(`/api/quizzes/${initialData!.quizId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      clearDraft(key);
      router.push("/quizzes");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setSaving(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* ── Draft restore banner ── */}
      {showDraftBanner && draft && (
        <div className="mb-4 flex items-center justify-between gap-4 px-4 py-3 bg-yellow-900/30 border border-yellow-700/50 rounded-xl">
          <div>
            <p className="text-sm font-semibold text-yellow-300">Unsaved draft found</p>
            <p className="text-xs text-yellow-600 mt-0.5">
              Saved {formatDraftAge(draft.savedAt)} —{" "}
              {draft.difficulty} {TYPE_NAMES[draft.type]} · {draft.date}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={restoreDraft}
              className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Restore draft
            </button>
            <button
              onClick={dismissDraft}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs rounded-lg transition-colors"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* ── Identity fields ── */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          {/* Date / Month */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              {isMaster ? "Month" : "Date"}
            </label>
            {isMaster ? (
              <input
                type="month"
                value={dateToMonth(date)}
                onChange={(e) => handleMonthChange(e.target.value)}
                disabled={mode === "edit"}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-40"
              />
            ) : (
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={mode === "edit"}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-40"
              />
            )}
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => handleTypeChange(Number(e.target.value) as QuizType)}
              disabled={mode === "edit"}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-40"
            >
              <option value={5}>Paragraph (5)</option>
              <option value={10}>Page (10)</option>
              <option value={30}>Chapter (30)</option>
              <option value={50}>Tome (50)</option>
            </select>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => handleDifficultyChange(e.target.value as Difficulty)}
              disabled={mode === "edit"}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-40"
            >
              <option value="easy">Easy</option>
              <option value="hard">Hard</option>
              <option value="master">Master</option>
            </select>
          </div>
        </div>

        {/* Auto-generated ID + clue count */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-gray-500">Quiz ID:</span>
          <code
            className="text-xs px-2 py-0.5 rounded-md font-mono"
            style={{ backgroundColor: diffColor + "22", color: diffColor }}
          >
            {quizId}
          </code>
          <span className={`text-xs font-medium ${clueCountColor}`}>
            {clues.length} / {type} clues
          </span>
          {isMaster && (
            <span className="text-xs text-purple-500">
              · Cthalepoú&apos;s Tome · access granted if subscribed on the 1st
            </span>
          )}
        </div>
      </section>

      {/* ── Clue editor ── */}
      <section className="space-y-2 mb-4">
        {clues.map((clue, i) => (
          <div
            key={i}
            className={[
              "bg-gray-900 border rounded-lg p-3",
              isMaster && i === type - 1
                ? "border-purple-700/60"
                : "border-gray-800",
            ].join(" ")}
          >
            <div className="flex gap-2 items-start mb-2">
              <span className="text-xs font-mono text-gray-600 mt-2 w-8 shrink-0 text-right">
                {i + 1}.
              </span>
              <textarea
                value={clue.clueText}
                onChange={(e) => updateClue(i, { clueText: e.target.value })}
                rows={1}
                placeholder={
                  isMaster && i === type - 1
                    ? "Final clue — exact match required…"
                    : "Clue text…"
                }
                className="flex-1 bg-gray-800 border border-gray-700 rounded-md px-2 py-1.5 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => moveClue(i, "up")}
                  disabled={!!(i === 0)}
                  className="px-1.5 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 rounded disabled:opacity-30"
                >↑</button>
                <button
                  onClick={() => moveClue(i, "down")}
                  disabled={!!(i === clues.length - 1)}
                  className="px-1.5 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 rounded disabled:opacity-30"
                >↓</button>
                <button
                  onClick={() => removeClue(i)}
                  disabled={!!(clues.length === 1)}
                  className="px-1.5 py-1 text-xs bg-red-900/40 hover:bg-red-800/60 text-red-400 rounded disabled:opacity-30"
                >✕</button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 ml-10">
              {clue.acceptedAnswers.map((answer) => (
                <span
                  key={answer}
                  className="flex items-center gap-1 px-2 py-0.5 bg-purple-900/40 border border-purple-700/50 text-purple-300 text-xs rounded-full"
                >
                  {answer}
                  <button
                    onClick={() => removeChip(i, answer)}
                    className="text-purple-500 hover:text-red-400 leading-none"
                  >×</button>
                </span>
              ))}
              <input
                type="text"
                value={chipInputs[i]}
                onChange={(e) => {
                  const next = [...chipInputs];
                  next[i] = e.target.value;
                  setChipInputs(next);
                }}
                onKeyDown={(e) => handleChipKeyDown(e, i)}
                placeholder="Answer… (Enter to add)"
                className="bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-gray-100 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 w-44"
              />
              <button
                onClick={() => addChip(i)}
                className="px-2 py-1 bg-purple-900/50 hover:bg-purple-800/60 text-purple-300 text-xs rounded-md"
              >
                Add
              </button>
              <label className="flex items-center gap-1 ml-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={clue.requiresExactMatch}
                  onChange={(e) =>
                    updateClue(i, { requiresExactMatch: e.target.checked })
                  }
                  className="w-3 h-3 accent-purple-500"
                />
                <span className="text-xs text-gray-600">
                  {isMaster && i === type - 1
                    ? "Exact (required for final)"
                    : "Exact"}
                </span>
              </label>
            </div>
          </div>
        ))}

        <button
          onClick={addClue}
          className="w-full py-2 border-2 border-dashed border-gray-800 hover:border-purple-700 text-gray-600 hover:text-purple-400 rounded-lg text-xs transition-colors"
        >
          + Add clue
        </button>
      </section>

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      {/* ── Actions ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-3 items-center flex-wrap">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900 disabled:text-purple-700 text-white font-semibold rounded-lg transition-colors text-sm"
          >
            {saving ? "Saving…" : mode === "create" ? "Create quiz" : "Save changes"}
          </button>
          <button
            onClick={() => router.push("/quizzes")}
            className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
          >
            Cancel
          </button>

          {/* Draft saved indicator */}
          {draftSavedAt && (
            <span className={`text-xs transition-all duration-500 ${
              draftStatus === "saved" ? "text-green-400" : "text-gray-600"
            }`}>
              {draftStatus === "saved"
                ? "✓ Draft saved"
                : `Draft: ${formatDraftAge(draftSavedAt)}`}
            </span>
          )}
        </div>

        {mode === "edit" && (
          <div>
            {deleteConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-400">Are you sure?</span>
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="px-3 py-2 bg-red-700 hover:bg-red-600 text-white text-sm rounded-lg"
                >
                  Yes, delete
                </button>
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="px-3 py-2 bg-gray-800 text-gray-400 text-sm rounded-lg"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="px-3 py-2 bg-gray-900 border border-red-900 hover:bg-red-900/30 text-red-500 text-sm rounded-lg transition-colors"
              >
                Delete quiz
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
