// connected-admin/app/(dashboard)/page.tsx
//
// CRITICAL: force-dynamic prevents Next.js from baking stats into the
// static build at deploy time. Without this, Vercel serves the player
// count (and other live counts) frozen at whatever they were when
// `next build` ran — localhost always re-renders and never shows the bug.
export const dynamic = 'force-dynamic';

import { getAdminDb } from "@/lib/firebase-admin";

async function getStats() {
  try {
    const db = getAdminDb();
    const [quizzes, players, sessions] = await Promise.all([
      db.collection("quizzes").get(),
      db.collection("users").get(),
      db.collection("sessions").where("flagged", "==", true).get(),
    ]);
    const flaggedUnreviewed = sessions.docs.filter(
      (d) => !d.data().reviewed
    ).length;
    return {
      quizzes: quizzes.size,
      players: players.size,
      flagged: flaggedUnreviewed,
    };
  } catch {
    return { quizzes: 0, players: 0, flagged: 0 };
  }
}

export default async function DashboardPage() {
  const stats = await getStats();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-100 mb-1">Dashboard</h1>
      <p className="text-gray-500 text-sm mb-8">
        Welcome back. Use the sidebar to manage your quiz data.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <StatCard label="Total Quizzes" value={String(stats.quizzes)} accent="purple" />
        <StatCard label="Total Players" value={String(stats.players)} accent="green" />
        <StatCard label="Flagged Sessions" value={String(stats.flagged)} accent="red" />
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-gray-300 font-semibold mb-4">Quick actions</h2>
        <div className="flex flex-wrap gap-3">
          <QuickLink href="/quizzes/new" label="+ Create quiz" />
          <QuickLink href="/quizzes" label="Browse quizzes" />
          <QuickLink href="/players" label="Search players" />
          <QuickLink href="/sessions" label="Review flagged sessions" />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: {
  label: string;
  value: string;
  accent: "purple" | "green" | "red";
}) {
  const colors = {
    purple: "border-purple-800 bg-purple-900/20 text-purple-300",
    green:  "border-green-800 bg-green-900/20 text-green-300",
    red:    "border-red-800 bg-red-900/20 text-red-300",
  };
  return (
    <div className={`rounded-xl border p-5 ${colors[accent]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm mt-1 opacity-70">{label}</p>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} className={[
      "px-4 py-2 rounded-lg text-sm transition-colors border",
      "bg-gray-800 hover:bg-gray-700 border-gray-700",
      "text-gray-300 hover:text-gray-100",
    ].join(" ")}>
      {label}
    </a>
  );
}
