"use client";

// connected-admin/app/(dashboard)/quizzes/_components/MonthCalendar.tsx
//
// Displays a month calendar showing quiz completion status per day.
// Grey  = no quiz data exists for that day/type
// Yellow = quiz exists but incomplete (clues.length < type)
// Green  = quiz complete (clues.length === type)
//
// Clicking a day cell shows a mini-popup listing all quiz slots for that day.
// Clicking a quiz slot (any color) navigates to edit or create.

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Quiz,
  Difficulty,
  DIFFICULTY_COLORS,
  TYPE_SHORT_LABELS,
  TYPE_NAMES,
  buildQuizId,
} from "@/lib/quiz-types";

// Which quiz types appear on which days for a given difficulty
// Easy + Hard: Paragraph every day, Page on 1/10/20, Chapter on the 1st
// Master: Tome only on the 1st (same as Chapter day)
const PAGE_DAYS   = [1, 10, 20]; // Page (10) quiz days
const SPECIAL_DAY = 1;           // Chapter (30) + Tome (50) quiz day

function getExpectedTypesForDay(day: number, difficulty: Difficulty): number[] {
  if (difficulty === "master") {
    // Master only has a Tome on the 1st
    return day === SPECIAL_DAY ? [50] : [];
  }
  const types: number[] = [5]; // Paragraph every day
  if (PAGE_DAYS.includes(day)) types.push(10);
  if (day === SPECIAL_DAY)     types.push(30);
  return types;
}

type SlotStatus = "complete" | "started" | "empty";

interface DaySlot {
  type: number;
  quizId: string;
  status: SlotStatus;
  quiz: Quiz | null;
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

interface Props {
  year: number;
  month: number; // 1-based
  difficulty: Difficulty;
  quizzes: Quiz[]; // all quizzes — component filters by month+difficulty
  onYearMonthChange: (year: number, month: number) => void;
  onDifficultyChange: (diff: Difficulty) => void;
}

export default function MonthCalendar({
  year,
  month,
  difficulty,
  quizzes,
  onYearMonthChange,
  onDifficultyChange,
}: Props) {
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Build a lookup: quizId → Quiz for this month+difficulty
  const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
  const monthQuizzes = quizzes.filter(
    (q) => q.date?.startsWith(monthPrefix) && q.difficulty === difficulty
  );
  const byQuizId: Record<string, Quiz> = {};
  monthQuizzes.forEach((q) => { byQuizId[q.quizId] = q; });

  // Calendar geometry
  const firstDOW    = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const totalCells  = Math.ceil((firstDOW + daysInMonth) / 7) * 7;
  const today       = new Date();

  // Build full day data for every day in the month
  function buildDaySlots(day: number): DaySlot[] {
    const types = getExpectedTypesForDay(day, difficulty);
    return types.map((type) => {
      const dateStr = `${monthPrefix}-${String(day).padStart(2, "0")}`;
      const quizId  = buildQuizId(dateStr, type as 5 | 10 | 30 | 50, difficulty);
      const quiz    = byQuizId[quizId] ?? null;
      let status: SlotStatus = "empty";
      if (quiz) {
        status = (quiz.clues?.length ?? 0) >= quiz.type ? "complete" : "started";
      }
      return { type, quizId, status, quiz };
    });
  }

  function getDayOverallStatus(slots: DaySlot[]): SlotStatus {
    if (slots.length === 0) return "empty";
    const allComplete = slots.every((s) => s.status === "complete");
    if (allComplete) return "complete";
    const anyData = slots.some((s) => s.status !== "empty");
    return anyData ? "started" : "empty";
  }

  function statusBg(status: SlotStatus): string {
    if (status === "complete") return "rgba(76,175,80,0.18)";
    if (status === "started")  return "rgba(255,193,7,0.14)";
    return "rgba(255,255,255,0.03)";
  }

  function statusBorder(status: SlotStatus): string {
    if (status === "complete") return "#4CAF50";
    if (status === "started")  return "#FFC107";
    return "#374151";
  }

  function slotBg(slot: DaySlot): string {
    if (slot.status === "complete") return slot.type === 50 ? "#7B3F9E" : "#4CAF50";
    if (slot.status === "started")  return "#B8860B";
    return slot.type === 50 ? "#3B1F5E" : "#374151";
  }

  function slotText(status: SlotStatus): string {
    return status === "empty" ? "#9CA3AF" : "#ffffff";
  }

  function navMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m > 12) { m = 1;  y++; }
    if (m < 1)  { m = 12; y--; }
    onYearMonthChange(y, m);
    setSelectedDay(null);
  }

  function handleDayClick(day: number) {
    setSelectedDay(selectedDay === day ? null : day);
  }

  function handleSlotClick(slot: DaySlot, day: number) {
    const dateStr = `${monthPrefix}-${String(day).padStart(2, "0")}`;
    if (slot.quiz) {
      router.push(`/quizzes/${slot.quizId}/edit`);
    } else {
      router.push(
        `/quizzes/new?date=${dateStr}&type=${slot.type}&difficulty=${difficulty}`
      );
    }
  }

  const selectedSlots = selectedDay !== null ? buildDaySlots(selectedDay) : [];

  // Legend types — show Tome in legend only for master
  const legendTypes = difficulty === "master" ? [50] : [5, 10, 30];

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      {/* ── Controls row ── */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        {/* Month nav */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navMonth(-1)}
            className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 text-sm transition-colors"
          >
            ‹
          </button>
          <span className="text-gray-100 font-semibold text-sm w-36 text-center">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button
            onClick={() => navMonth(1)}
            className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 text-sm transition-colors"
          >
            ›
          </button>
        </div>

        {/* Difficulty tabs */}
        <div className="flex gap-1">
          {(["easy", "hard", "master"] as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => { onDifficultyChange(d); setSelectedDay(null); }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors"
              style={
                difficulty === d
                  ? { backgroundColor: DIFFICULTY_COLORS[d], color: "#fff" }
                  : { backgroundColor: "#1F2937", color: "#9CA3AF" }
              }
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex gap-4 mb-3 flex-wrap">
        {[
          { status: "complete" as SlotStatus, label: "Complete" },
          { status: "started"  as SlotStatus, label: "In progress" },
          { status: "empty"    as SlotStatus, label: "No data" },
        ].map(({ status, label }) => (
          <div key={status} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-sm border"
              style={{ backgroundColor: statusBg(status), borderColor: statusBorder(status) }}
            />
            <span className="text-xs text-gray-500">{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-3 ml-auto flex-wrap">
          {legendTypes.map((t) => (
            <span key={t} className="text-xs text-gray-600">
              <span className="font-mono text-gray-400">{TYPE_SHORT_LABELS[t]}</span>
              {" = "}{TYPE_NAMES[t]}
            </span>
          ))}
        </div>
      </div>

      {/* ── Day-of-week headers ── */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
          <div key={d} className="text-center text-xs text-gray-600 font-medium py-1">{d}</div>
        ))}
      </div>

      {/* ── Calendar grid ── */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: totalCells }, (_, i) => {
          const day     = i - firstDOW + 1;
          const inMonth = day >= 1 && day <= daysInMonth;
          if (!inMonth) {
            return <div key={i} className="aspect-square" />;
          }

          const isToday =
            year  === today.getFullYear() &&
            month === today.getMonth() + 1 &&
            day   === today.getDate();

          const slots         = buildDaySlots(day);
          const overallStatus = getDayOverallStatus(slots);
          const isSelected    = selectedDay === day;

          return (
            <button
              key={i}
              onClick={() => handleDayClick(day)}
              className="aspect-square rounded-lg border flex flex-col p-1 transition-all hover:opacity-90 hover:scale-105 text-left"
              style={{
                backgroundColor: statusBg(overallStatus),
                borderColor: isSelected
                  ? "#FFD700"
                  : isToday
                  ? "#FFD70066"
                  : statusBorder(overallStatus),
                outline: isSelected ? "1px solid #FFD700" : undefined,
              }}
              title={`${MONTH_NAMES[month - 1]} ${day} — ${slots.length} quiz type${slots.length !== 1 ? "s" : ""}`}
            >
              {/* Day number */}
              <span
                className="text-xs leading-none font-medium"
                style={{ color: isToday ? "#FFD700" : "#9CA3AF" }}
              >
                {day}
              </span>

              {/* Slot dots — one per quiz type */}
              <div className="flex flex-wrap gap-0.5 mt-auto">
                {slots.map((slot) => (
                  <div
                    key={slot.type}
                    className="rounded-sm flex items-center justify-center"
                    style={{
                      backgroundColor: slotBg(slot),
                      width: "14px",
                      height: "12px",
                    }}
                    title={`${TYPE_NAMES[slot.type]}: ${slot.status}`}
                  >
                    <span style={{ fontSize: "8px", color: slotText(slot.status), fontWeight: 700, lineHeight: 1 }}>
                      {TYPE_SHORT_LABELS[slot.type]}
                    </span>
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Day detail popup ── */}
      {selectedDay !== null && (
        <div className="mt-4 border-t border-gray-800 pt-4">
          <p className="text-xs text-gray-500 mb-3 font-medium">
            {MONTH_NAMES[month - 1]} {selectedDay}, {year} — {difficulty}
            {selectedSlots.length === 0 && (
              <span className="ml-2 text-gray-600">No quiz types for this day/difficulty</span>
            )}
          </p>
          <div className="flex flex-col gap-2">
            {selectedSlots.map((slot) => (
              <button
                key={slot.type}
                onClick={() => handleSlotClick(slot, selectedDay)}
                className="flex items-center justify-between px-4 py-3 rounded-lg border transition-all hover:opacity-90 text-left group"
                style={{
                  backgroundColor: statusBg(slot.status),
                  borderColor: statusBorder(slot.status),
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ backgroundColor: slotBg(slot), color: slotText(slot.status) }}
                  >
                    {TYPE_SHORT_LABELS[slot.type]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-200">
                      {slot.type === 50 ? "Cthalepoú's Tome" : TYPE_NAMES[slot.type]}
                    </p>
                    <p className="text-xs text-gray-500 font-mono">{slot.quizId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {slot.status === "complete" && (
                    <span className="text-xs font-semibold text-green-400">
                      ✓ Complete ({slot.quiz?.clues?.length}/{slot.type})
                    </span>
                  )}
                  {slot.status === "started" && (
                    <span className="text-xs font-semibold text-yellow-400">
                      ⚠ {slot.quiz?.clues?.length}/{slot.type} clues
                    </span>
                  )}
                  {slot.status === "empty" && (
                    <span className="text-xs text-gray-500">No data</span>
                  )}
                  <span className="text-xs text-gray-500 group-hover:text-gray-300 transition-colors">
                    {slot.status === "empty" ? "Create →" : "Edit →"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Month summary ── */}
      <div className="mt-4 pt-4 border-t border-gray-800 flex gap-4 text-xs text-gray-500 flex-wrap">
        {(() => {
          let complete = 0, started = 0, empty = 0;
          for (let d = 1; d <= daysInMonth; d++) {
            const slots = buildDaySlots(d);
            slots.forEach((s) => {
              if (s.status === "complete") complete++;
              else if (s.status === "started") started++;
              else empty++;
            });
          }
          const total = complete + started + empty;
          return (
            <>
              <span className="text-green-400 font-medium">{complete} complete</span>
              <span className="text-yellow-400 font-medium">{started} in progress</span>
              <span className="text-gray-500">{empty} empty</span>
              <span className="text-gray-600 ml-auto">{total} total quiz slots this month</span>
            </>
          );
        })()}
      </div>
    </div>
  );
}
