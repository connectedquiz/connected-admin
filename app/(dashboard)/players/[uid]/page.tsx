// connected-admin/app/(dashboard)/players/[uid]/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────

interface UnlockedQuiz   { quizId: string; difficulty: string }
interface PurchasedMonth { monthKey: string; difficulty: string }

interface Player {
  uid: string;
  displayName?: string;
  displayNameLastChanged?: number;
  email?: string;
  timeZone?: string;
  timeZoneLastChanged?: number;
  easySubscriptionStatus?: string;
  easySubscriptionExpiry?: number;
  hardSubscriptionStatus?: string;
  hardSubscriptionExpiry?: number;
  masterSubscriptionStatus?: string;
  masterSubscriptionExpiry?: number;
  purchasedMonths?: PurchasedMonth[];
  unlockedQuizzes?: UnlockedQuiz[];
  leaderboardPools?: Record<string, string>;
}

interface Quiz { quizId: string; date: string; type: number; difficulty: string }
interface LeaderboardEntry { poolKey: string; poolId: string; monthlyTotal: number }

const DIFFICULTIES = ["easy", "hard", "master"];
const SUB_STATUSES  = ["none", "active", "lapsed", "inactive", "cancelled"];
const IANA_ZONES = [
  "Pacific/Midway","Pacific/Honolulu","America/Anchorage","America/Los_Angeles",
  "America/Phoenix","America/Denver","America/Chicago","America/Indiana/Indianapolis",
  "America/New_York","America/Halifax","America/St_Johns","America/Sao_Paulo",
  "America/Argentina/Buenos_Aires","America/Santiago","America/Bogota","America/Lima",
  "America/Caracas","America/Mexico_City","America/Manaus","America/Noronha",
  "Atlantic/Azores","Europe/London","Europe/Dublin","Europe/Lisbon","Europe/Paris",
  "Europe/Berlin","Europe/Rome","Europe/Madrid","Europe/Amsterdam","Europe/Warsaw",
  "Europe/Helsinki","Europe/Athens","Europe/Istanbul","Europe/Moscow","Europe/Kiev",
  "Africa/Casablanca","Africa/Lagos","Africa/Cairo","Africa/Nairobi","Africa/Johannesburg",
  "Asia/Jerusalem","Asia/Riyadh","Asia/Tehran","Asia/Dubai","Asia/Kabul","Asia/Karachi",
  "Asia/Tashkent","Asia/Yekaterinburg","Asia/Kolkata","Asia/Kathmandu","Asia/Dhaka",
  "Asia/Colombo","Asia/Yangon","Asia/Bangkok","Asia/Jakarta","Asia/Kuala_Lumpur",
  "Asia/Singapore","Asia/Manila","Asia/Shanghai","Asia/Hong_Kong","Asia/Taipei",
  "Asia/Seoul","Asia/Tokyo","Asia/Vladivostok","Asia/Magadan","Asia/Kamchatka",
  "Australia/Perth","Australia/Darwin","Australia/Adelaide","Australia/Brisbane",
  "Australia/Sydney","Australia/Melbourne","Pacific/Guam","Pacific/Auckland",
  "Pacific/Fiji","Pacific/Tongatapu",
];

const DIFF_COLORS: Record<string, string> = {
  easy: "#4CAF50", hard: "#CC3333", master: "#7B3F9E",
};

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// ── Date helpers ──────────────────────────────────────────────────────────────

function unixToDate(unix: number | undefined | null): string {
  if (!unix) return "";
  return new Date(unix * 1000).toISOString().split("T")[0];
}

function dateToUnix(s: string): number | null {
  if (!s) return null;
  const ms = Date.parse(s);
  return isNaN(ms) ? null : Math.floor(ms / 1000);
}

// ── Quiz permission helpers ───────────────────────────────────────────────────

function isUnlocked(quizId: string, diff: string,
  unlocked: UnlockedQuiz[], purchased: PurchasedMonth[]): boolean {
  if (unlocked.some((q) => q.quizId === quizId)) return true;
  const mk = quizId.substring(0, 7);
  return purchased.some((m) => m.monthKey === mk && m.difficulty === diff);
}

// Updated to use literary hierarchy short labels
function typeLabel(t: number) {
  return t === 5 ? "¶" : t === 10 ? "Pg" : t === 30 ? "Ch" : t === 50 ? "T" : "?";
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PlayerDetailPage() {
  const { uid } = useParams<{ uid: string }>();
  const router  = useRouter();

  const [player,  setPlayer]  = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");

  const [displayName,   setDisplayName]   = useState("");
  const [timeZone,      setTimeZone]      = useState("");
  const [tzSearch,      setTzSearch]      = useState("");
  const [showTzList,    setShowTzList]    = useState(false);

  const [easyStatus,    setEasyStatus]    = useState("none");
  const [easyExpiry,    setEasyExpiry]    = useState("");
  const [hardStatus,    setHardStatus]    = useState("none");
  const [hardExpiry,    setHardExpiry]    = useState("");
  const [masterStatus,  setMasterStatus]  = useState("none");
  const [masterExpiry,  setMasterExpiry]  = useState("");

  const [unlockedQuizzes, setUnlockedQuizzes] = useState<UnlockedQuiz[]>([]);
  const [purchasedMonths, setPurchasedMonths] = useState<PurchasedMonth[]>([]);

  const [newQuizId,    setNewQuizId]    = useState("");
  const [newQuizDiff,  setNewQuizDiff]  = useState("easy");
  const [newMonthKey,  setNewMonthKey]  = useState("");
  const [newMonthDiff, setNewMonthDiff] = useState("easy");

  const [lbEntries,   setLbEntries]   = useState<LeaderboardEntry[]>([]);
  const [scoreEdits,  setScoreEdits]  = useState<Record<string, string>>({});
  const [savingScore, setSavingScore] = useState<string | null>(null);

  const [calYear,      setCalYear]      = useState(() => new Date().getFullYear());
  const [calMonth,     setCalMonth]     = useState(() => new Date().getMonth() + 1);
  const [calDiff,      setCalDiff]      = useState("easy");
  const [monthQuizzes, setMonthQuizzes] = useState<Quiz[]>([]);
  const [calLoading,   setCalLoading]   = useState(false);
  const [popupQuiz,         setPopupQuiz]         = useState<Quiz | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingPlayer,    setDeletingPlayer]    = useState(false);
  const [deleteError,       setDeleteError]       = useState("");

  // ── Load player ──────────────────────────────────────────────────────────

  useEffect(() => {
    fetch(`/api/players/${uid}`)
      .then((r) => r.json())
      .then((data) => {
        const p: Player = data.player;
        setPlayer(p);
        setDisplayName(p.displayName ?? "");
        setTimeZone(p.timeZone ?? "America/Denver");
        setTzSearch(p.timeZone ?? "");
        setEasyStatus(p.easySubscriptionStatus     ?? "none");
        setEasyExpiry(unixToDate(p.easySubscriptionExpiry));
        setHardStatus(p.hardSubscriptionStatus     ?? "none");
        setHardExpiry(unixToDate(p.hardSubscriptionExpiry));
        setMasterStatus(p.masterSubscriptionStatus ?? "none");
        setMasterExpiry(unixToDate(p.masterSubscriptionExpiry));
        setUnlockedQuizzes(p.unlockedQuizzes ?? []);
        setPurchasedMonths(p.purchasedMonths  ?? []);

        if (p.leaderboardPools) {
          const entries = Object.entries(p.leaderboardPools).map(([poolKey, poolId]) => ({
            poolKey, poolId, monthlyTotal: 0,
          }));
          setLbEntries(entries);
          const edits: Record<string, string> = {};
          entries.forEach((e) => { edits[e.poolKey] = "0"; });
          setScoreEdits(edits);

          entries.forEach(async (entry) => {
            const res = await fetch(
              `/api/players/${uid}/leaderboard?poolKey=${entry.poolKey}&poolId=${entry.poolId}`
            );
            if (res.ok) {
              const d = await res.json();
              setLbEntries((prev) =>
                prev.map((e) => e.poolKey === entry.poolKey
                  ? { ...e, monthlyTotal: d.monthlyTotal ?? 0 } : e));
              setScoreEdits((prev) => ({
                ...prev, [entry.poolKey]: String(d.monthlyTotal ?? 0),
              }));
            }
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [uid]);

  // ── Load calendar month ───────────────────────────────────────────────────

  const loadMonthQuizzes = useCallback(async (year: number, month: number, diff: string) => {
    setCalLoading(true);
    try {
      const res  = await fetch("/api/quizzes");
      if (!res.ok) return;
      const data = await res.json();
      const ms   = `${year}-${String(month).padStart(2, "0")}`;
      setMonthQuizzes((data.quizzes as Quiz[]).filter(
        (q) => q.date?.startsWith(ms) && q.difficulty === diff
      ));
    } catch { /* silent */ }
    finally { setCalLoading(false); }
  }, []);

  useEffect(() => {
    loadMonthQuizzes(calYear, calMonth, calDiff);
  }, [calYear, calMonth, calDiff, loadMonthQuizzes]);

  // ── Save ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await fetch(`/api/players/${uid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          timeZone,
          easySubscriptionStatus:   easyStatus,
          easySubscriptionExpiry:   dateToUnix(easyExpiry),
          hardSubscriptionStatus:   hardStatus,
          hardSubscriptionExpiry:   dateToUnix(hardExpiry),
          masterSubscriptionStatus: masterStatus,
          masterSubscriptionExpiry: dateToUnix(masterExpiry),
          unlockedQuizzes,
          purchasedMonths,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setSuccess("Player updated successfully.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally { setSaving(false); }
  }

  async function handleScoreSave(entry: LeaderboardEntry) {
    const newScore = parseInt(scoreEdits[entry.poolKey] ?? "0", 10);
    if (isNaN(newScore)) return;
    setSavingScore(entry.poolKey); setError(""); setSuccess("");
    try {
      const res = await fetch(`/api/players/${uid}/leaderboard`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poolKey: entry.poolKey, poolId: entry.poolId,
          monthlyTotal: newScore, displayName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Score update failed");
      setLbEntries((prev) =>
        prev.map((e) => e.poolKey === entry.poolKey
          ? { ...e, monthlyTotal: newScore } : e));
      setSuccess(`Score updated for ${entry.poolKey}.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Score update failed");
    } finally { setSavingScore(null); }
  }

  async function handleDeletePlayer() {
    setDeletingPlayer(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/players/${uid}/delete`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      router.push("/players");
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Delete failed. Try again.");
      setDeletingPlayer(false);
    }
  }

  // ── Array helpers ─────────────────────────────────────────────────────────

  function addUnlockedQuiz() {
    const id = newQuizId.trim();
    if (!id || unlockedQuizzes.some((q) => q.quizId === id)) return;
    setUnlockedQuizzes((p) => [...p, { quizId: id, difficulty: newQuizDiff }]);
    setNewQuizId("");
  }
  function addPurchasedMonth() {
    const key = newMonthKey.trim();
    if (!key || purchasedMonths.some((m) => m.monthKey === key && m.difficulty === newMonthDiff)) return;
    setPurchasedMonths((p) => [...p, { monthKey: key, difficulty: newMonthDiff }]);
    setNewMonthKey("");
  }

  // ── Calendar toggle ───────────────────────────────────────────────────────

  function toggleQuiz(quiz: Quiz, grant: boolean) {
    if (grant) {
      if (!unlockedQuizzes.some((q) => q.quizId === quiz.quizId))
        setUnlockedQuizzes((p) => [...p, { quizId: quiz.quizId, difficulty: quiz.difficulty }]);
    } else {
      setUnlockedQuizzes((p) => p.filter((q) => q.quizId !== quiz.quizId));
    }
    setPopupQuiz(null);
  }

  // ── Calendar render ───────────────────────────────────────────────────────

  function renderCalendar() {
    const firstDOW    = new Date(calYear, calMonth - 1, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth, 0).getDate();
    const totalCells  = Math.ceil((firstDOW + daysInMonth) / 7) * 7;
    const today       = new Date();
    const byDay: Record<number, Quiz[]> = {};
    monthQuizzes.forEach((q) => {
      const d = parseInt(q.date.substring(8, 10), 10);
      if (!byDay[d]) byDay[d] = [];
      byDay[d].push(q);
    });

    return Array.from({ length: totalCells }, (_, i) => {
      const d       = i - firstDOW + 1;
      const inMonth = d >= 1 && d <= daysInMonth;
      const isToday = inMonth && calYear === today.getFullYear() &&
                      calMonth === today.getMonth() + 1 && d === today.getDate();
      const dayQs   = inMonth ? (byDay[d] ?? []) : [];

      return (
        <div key={i} className={[
          "aspect-square rounded border flex flex-col overflow-hidden",
          inMonth ? "border-gray-700" : "border-transparent",
          isToday ? "ring-1 ring-yellow-500" : "",
          !inMonth ? "bg-transparent" : dayQs.length === 0 ? "bg-gray-800/40" : "bg-gray-800",
        ].join(" ")}>
          {inMonth && (
            <>
              <span className={`text-xs px-1 pt-0.5 leading-none ${
                isToday ? "text-yellow-400 font-bold" : "text-gray-500"
              }`}>
                {d}
              </span>
              <div className="flex flex-col flex-1 gap-px mt-0.5 px-0.5 pb-0.5">
                {dayQs.map((q) => {
                  const owned = isUnlocked(
                    q.quizId, q.difficulty, unlockedQuizzes, purchasedMonths
                  );
                  return (
                    <button
                      key={q.quizId}
                      onClick={() => setPopupQuiz(q)}
                      title={`${q.quizId}\n${owned ? "✅ Unlocked" : "🔒 Locked"} — click to change`}
                      className="flex-1 rounded-sm text-white flex items-center justify-center text-[9px] font-bold hover:opacity-75 transition-opacity"
                      style={{ backgroundColor: owned ? DIFF_COLORS[q.difficulty] : "#444" }}
                    >
                      {typeLabel(q.type)}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      );
    });
  }

  // ── Early returns ─────────────────────────────────────────────────────────

  if (loading) {
    return <p className="text-gray-500 text-sm p-6">Loading player…</p>;
  }
  if (!player) {
    return <p className="text-red-400 text-sm p-6">Player not found.</p>;
  }

  const filteredZones = IANA_ZONES.filter((z) =>
    z.toLowerCase().includes(tzSearch.toLowerCase())
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <button
          onClick={() => router.push("/players")}
          className="text-gray-500 hover:text-gray-300 text-sm mb-4 flex items-center gap-1 transition-colors"
        >
          ← Back to players
        </button>
        <h1 className="text-2xl font-bold text-gray-100">
          {player.displayName ?? uid}
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">{player.email ?? uid}</p>
      </div>

      {/* Core info */}
      <Card title="Player info">
        <Field label="Display name">
          <Input value={displayName} onChange={setDisplayName} placeholder="Display name" />
        </Field>
        <Field label="Email">
          <p className="text-sm text-gray-400">{player.email ?? "—"}</p>
        </Field>
        <Field label="UID">
          <code className="text-xs text-gray-500 font-mono">{uid}</code>
        </Field>
        <Field label="Timezone">
          <div className="relative">
            <input
              type="text"
              value={tzSearch}
              onChange={(e) => { setTzSearch(e.target.value); setShowTzList(true); }}
              onFocus={() => setShowTzList(true)}
              onBlur={() => setTimeout(() => setShowTzList(false), 150)}
              placeholder="Search timezone…"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {showTzList && filteredZones.length > 0 && (
              <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-gray-900 border border-gray-700 rounded-lg shadow-xl">
                {filteredZones.map((tz) => (
                  <button
                    key={tz}
                    onClick={() => { setTimeZone(tz); setTzSearch(tz); setShowTzList(false); }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-800 transition-colors
                      ${tz === timeZone ? "text-purple-300 bg-purple-900/20" : "text-gray-300"}`}
                  >
                    {tz}
                  </button>
                ))}
              </div>
            )}
          </div>
          {timeZone && <p className="text-xs text-gray-600 mt-1">Selected: {timeZone}</p>}
        </Field>
      </Card>

      {/* Subscriptions */}
      <Card title="Subscriptions">
        <p className="text-xs text-gray-500 -mt-2 mb-2">
          Master subscription: access granted if active on the 1st of the month (noon UTC).
          No ad unlock for Master — must purchase or subscribe.
        </p>
        <div className="space-y-5">
          {[
            { label: "Easy",   color: "#4CAF50", status: easyStatus,   setStatus: setEasyStatus,   expiry: easyExpiry,   setExpiry: setEasyExpiry   },
            { label: "Hard",   color: "#CC3333", status: hardStatus,   setStatus: setHardStatus,   expiry: hardExpiry,   setExpiry: setHardExpiry   },
            { label: "Master", color: "#7B3F9E", status: masterStatus, setStatus: setMasterStatus, expiry: masterExpiry, setExpiry: setMasterExpiry },
          ].map(({ label, color, status, setStatus, expiry, setExpiry }) => (
            <div key={label} className="bg-gray-800/40 rounded-lg p-4 border border-gray-700/50">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <p className="text-sm font-semibold text-gray-200">{label}</p>
                {status === "active" && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-green-900/40 text-green-400 border border-green-800">
                    Active
                  </span>
                )}
                {status === "lapsed" && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-900/40 text-yellow-400 border border-yellow-800">
                    Lapsed
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Status">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {SUB_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Expiry date">
                  <input
                    type="date"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Quiz permissions calendar */}
      <Card title="Quiz permissions calendar">
        <p className="text-xs text-gray-500 -mt-2 mb-3">
          Click any quiz to grant or revoke. Changes apply on Save.
          {/* Updated legend: ¶=Paragraph · Pg=Page · Ch=Chapter · T=Tome */}
          <span className="text-gray-600 ml-2">
            ¶=Paragraph · Pg=Page · Ch=Chapter · T=Tome
          </span>
        </p>

        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (calMonth === 1) { setCalYear((y) => y - 1); setCalMonth(12); }
                else setCalMonth((m) => m - 1);
              }}
              className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 text-sm"
            >‹</button>
            <span className="text-gray-200 text-sm font-medium w-20 text-center">
              {MONTHS[calMonth - 1]} {calYear}
            </span>
            <button
              onClick={() => {
                if (calMonth === 12) { setCalYear((y) => y + 1); setCalMonth(1); }
                else setCalMonth((m) => m + 1);
              }}
              className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 text-sm"
            >›</button>
          </div>
          <div className="flex gap-1">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                onClick={() => setCalDiff(d)}
                className="px-3 py-1 rounded text-xs font-semibold transition-colors"
                style={calDiff === d
                  ? { backgroundColor: DIFF_COLORS[d], color: "#fff" }
                  : { backgroundColor: "#374151", color: "#9CA3AF" }}
              >
                {d}
              </button>
            ))}
          </div>
          {calLoading && <span className="text-xs text-gray-500">Loading…</span>}
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {["S","M","T","W","T","F","S"].map((d, i) => (
            <div key={i} className="text-center text-xs text-gray-600 font-medium">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">{renderCalendar()}</div>

        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-800">
          <span className="text-xs text-gray-500 self-center">Whole month:</span>
          <button
            onClick={() => {
              const mk = `${calYear}-${String(calMonth).padStart(2, "0")}`;
              if (!purchasedMonths.some((m) => m.monthKey === mk && m.difficulty === calDiff))
                setPurchasedMonths((p) => [...p, { monthKey: mk, difficulty: calDiff }]);
            }}
            className="px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white text-xs font-semibold rounded-lg"
          >
            Grant month
          </button>
          <button
            onClick={() => {
              const mk = `${calYear}-${String(calMonth).padStart(2, "0")}`;
              setPurchasedMonths((p) => p.filter((m) => !(m.monthKey === mk && m.difficulty === calDiff)));
              setUnlockedQuizzes((p) => p.filter((q) => !(q.quizId.startsWith(mk) && q.difficulty === calDiff)));
            }}
            className="px-3 py-1.5 bg-red-800 hover:bg-red-700 text-white text-xs font-semibold rounded-lg"
          >
            Revoke month
          </button>
        </div>
      </Card>

      {/* Purchased months */}
      <Card title="Purchased months (raw)">
        <div className="flex gap-2 mb-3">
          <Input value={newMonthKey} onChange={setNewMonthKey} placeholder="yyyy-MM e.g. 2026-04" />
          <DiffSelect value={newMonthDiff} onChange={setNewMonthDiff} />
          <AddBtn onClick={addPurchasedMonth} />
        </div>
        <ChipList
          items={purchasedMonths}
          label={(m) => `${m.monthKey} · ${m.difficulty}`}
          onRemove={(i) => setPurchasedMonths((p) => p.filter((_, x) => x !== i))}
        />
      </Card>

      {/* Unlocked quizzes */}
      <Card title="Unlocked quizzes (individual)">
        <div className="flex gap-2 mb-3">
          <Input
            value={newQuizId}
            onChange={setNewQuizId}
            placeholder="e.g. 2026-04-28-5-easy"
            onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && addUnlockedQuiz()}
          />
          <DiffSelect value={newQuizDiff} onChange={setNewQuizDiff} />
          <AddBtn onClick={addUnlockedQuiz} />
        </div>
        <ChipList
          items={unlockedQuizzes}
          label={(q) => `${q.quizId} · ${q.difficulty}`}
          onRemove={(i) => setUnlockedQuizzes((p) => p.filter((_, x) => x !== i))}
        />
      </Card>

      {/* Leaderboard scores */}
      {lbEntries.length > 0 && (
        <Card title="Leaderboard scores">
          <p className="text-xs text-yellow-600 mb-3">
            ⚠ Editing a score directly updates that player&apos;s pool entry.
            Global top 10 refreshes on their next score submission.
          </p>
          <div className="space-y-3">
            {lbEntries.map((entry) => (
              <div key={entry.poolKey} className="flex items-center gap-3">
                <code className="text-xs text-gray-400 w-40 shrink-0">{entry.poolKey}</code>
                <span className="text-xs text-gray-600 w-16 shrink-0">{entry.poolId}</span>
                <input
                  type="number"
                  value={scoreEdits[entry.poolKey] ?? ""}
                  onChange={(e) => setScoreEdits((p) => ({ ...p, [entry.poolKey]: e.target.value }))}
                  className="w-28 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={() => handleScoreSave(entry)}
                  disabled={savingScore === entry.poolKey}
                  className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 disabled:bg-purple-900 text-white text-xs font-semibold rounded-lg"
                >
                  {savingScore === entry.poolKey ? "Saving…" : "Set"}
                </button>
                <span className="text-xs text-gray-600">
                  current: {entry.monthlyTotal}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Pool membership */}
      <Card title="Leaderboard pool membership">
        <p className="text-xs text-gray-600 mb-2">Auto-assigned on first score submission.</p>
        {!player.leaderboardPools || !Object.keys(player.leaderboardPools).length ? (
          <p className="text-gray-600 text-sm">None yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {Object.entries(player.leaderboardPools).map(([key, pool]) => (
              <span
                key={key}
                className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-300 font-mono"
              >
                {key} → {pool}
              </span>
            ))}
          </div>
        )}
      </Card>

      {error   && <p className="text-red-400   text-sm">{error}</p>}
      {success && <p className="text-green-400 text-sm">{success}</p>}

      <div className="flex gap-3 pb-10">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900 disabled:text-purple-700 text-white font-semibold rounded-lg text-sm"
        >
          {saving ? "Saving…" : "Save player changes"}
        </button>
        <button
          onClick={() => router.push("/players")}
          className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm"
        >
          Cancel
        </button>
        <div className="flex-1" />
        <button
          onClick={() => { setDeleteError(""); setShowDeleteConfirm(true); }}
          className="px-6 py-2.5 bg-red-900 hover:bg-red-800 text-red-300 hover:text-red-100 border border-red-800 hover:border-red-700 rounded-lg text-sm font-semibold transition-colors"
        >
          Delete Player
        </button>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => !deletingPlayer && setShowDeleteConfirm(false)}
        >
          <div
            className="bg-gray-900 border border-red-900 rounded-xl p-6 max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-red-400 font-bold text-lg mb-2">Delete Player?</h3>
            <p className="text-gray-300 text-sm mb-1">This will permanently delete:</p>
            <ul className="text-gray-400 text-sm list-disc list-inside mb-4 space-y-1">
              <li>Firestore user document</li>
              <li>All quiz records</li>
              <li>Firebase Auth account</li>
            </ul>
            <p className="text-gray-200 text-sm font-semibold mb-1">
              {player?.displayName ?? uid}
            </p>
            <p className="text-gray-500 text-xs mb-5">{player?.email}</p>
            <p className="text-yellow-500 text-xs mb-5">
              ⚠ This cannot be undone. Leaderboard entries are not removed.
            </p>
            {deleteError && <p className="text-red-400 text-sm mb-4">{deleteError}</p>}
            <div className="flex gap-3">
              <button
                onClick={handleDeletePlayer}
                disabled={deletingPlayer}
                className="flex-1 px-4 py-2.5 bg-red-700 hover:bg-red-600 disabled:bg-red-900 disabled:text-red-700 text-white font-bold rounded-lg text-sm"
              >
                {deletingPlayer ? "Deleting…" : "Yes, delete permanently"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deletingPlayer}
                className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quiz permission popup */}
      {popupQuiz && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setPopupQuiz(null)}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-gray-100 font-semibold mb-1">{popupQuiz.quizId}</h3>
            <p className="text-gray-500 text-xs mb-4">
              {popupQuiz.difficulty} · {popupQuiz.type} clues
            </p>
            {isUnlocked(popupQuiz.quizId, popupQuiz.difficulty, unlockedQuizzes, purchasedMonths) ? (
              <>
                <p className="text-green-400 text-sm mb-4">✅ Player has access.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => toggleQuiz(popupQuiz, false)}
                    className="flex-1 px-4 py-2 bg-red-700 hover:bg-red-600 text-white text-sm font-semibold rounded-lg"
                  >
                    Revoke access
                  </button>
                  <button
                    onClick={() => setPopupQuiz(null)}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-red-400 text-sm mb-4">🔒 Player does not have access.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => toggleQuiz(popupQuiz, true)}
                    className="flex-1 px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-sm font-semibold rounded-lg"
                  >
                    Grant access
                  </button>
                  <button
                    onClick={() => setPopupQuiz(null)}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h2 className="text-gray-300 font-semibold mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
function Input({ value, onChange, placeholder, onKeyDown }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      onKeyDown={onKeyDown}
      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
    />
  );
}
function DiffSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm focus:outline-none shrink-0"
    >
      {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
    </select>
  );
}
function AddBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-sm font-semibold rounded-lg shrink-0"
    >
      Add
    </button>
  );
}
function ChipList<T>({ items, label, onRemove }: {
  items: T[]; label: (i: T) => string; onRemove: (i: number) => void;
}) {
  if (!items.length) return <p className="text-gray-600 text-sm">None</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <span
          key={i}
          className="flex items-center gap-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-300 font-mono"
        >
          {label(item)}
          <button
            onClick={() => onRemove(i)}
            className="text-red-500 hover:text-red-300 ml-1 font-bold"
          >×</button>
        </span>
      ))}
    </div>
  );
}
