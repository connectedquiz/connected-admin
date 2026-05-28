// connected-admin/app/(dashboard)/players/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface PlayerSummary {
  uid: string;
  displayName?: string;
  email?: string;
  easySubscriptionStatus?: string;
  hardSubscriptionStatus?: string;
  masterSubscriptionStatus?: string;
}

const PAGE_SIZE = 25;

function SubBadge({ label, status }: { label: string; status?: string }) {
  const active = status === "active";
  const lapsed = status === "lapsed";
  return (
    <span className={[
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
      active ? "bg-green-900/40 text-green-400 border border-green-800" :
      lapsed ? "bg-yellow-900/40 text-yellow-400 border border-yellow-800" :
               "bg-gray-800 text-gray-600"
    ].join(" ")}>
      {label}
      {active && " ✓"}
      {lapsed && " ↻"}
    </span>
  );
}

export default function PlayersPage() {
  const [allPlayers, setAllPlayers] = useState<PlayerSummary[]>([]);
  const [displayed,  setDisplayed]  = useState<PlayerSummary[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [searched,   setSearched]   = useState(false);
  const [page,       setPage]       = useState(1);

  useEffect(() => { fetchPlayers(""); }, []);

  async function fetchPlayers(query: string) {
    setLoading(true);
    setPage(1);
    try {
      const url = query
        ? `/api/players?search=${encodeURIComponent(query)}`
        : "/api/players";
      const res  = await fetch(url);
      const data = await res.json();
      const list = data.players ?? [];
      setAllPlayers(list);
      setDisplayed(list.slice(0, PAGE_SIZE));
      setSearched(!!query);
    } finally {
      setLoading(false);
    }
  }

  function loadMore() {
    const next = page + 1;
    setDisplayed(allPlayers.slice(0, next * PAGE_SIZE));
    setPage(next);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchPlayers(search.trim());
  }

  function handleClear() {
    setSearch("");
    fetchPlayers("");
  }

  const hasMore = displayed.length < allPlayers.length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Players</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {loading
            ? "Loading…"
            : `${allPlayers.length} player${allPlayers.length !== 1 ? "s" : ""}${searched ? " matching search" : " total"}`}
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by display name or UID…"
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <button type="submit"
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-lg transition-colors">
          Search
        </button>
        {searched && (
          <button type="button" onClick={handleClear}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 text-sm rounded-lg transition-colors">
            Clear
          </button>
        )}
      </form>

      {/* List */}
      {loading ? (
        <p className="text-gray-500 text-sm">Loading players…</p>
      ) : allPlayers.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-500 text-sm">
            {searched ? "No players match your search." : "No players yet."}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {displayed.map((player) => (
              <div key={player.uid}
                className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 flex items-center gap-4 hover:border-gray-700 transition-colors">

                {/* Name + email */}
                <div className="flex-1 min-w-0">
                  <p className="text-gray-100 font-medium truncate">
                    {player.displayName ?? <span className="text-gray-600 italic">unnamed</span>}
                  </p>
                  {player.email && (
                    <p className="text-gray-500 text-xs truncate mt-0.5">{player.email}</p>
                  )}
                </div>

                {/* Subscription badges */}
                <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                  <SubBadge label="Easy"   status={player.easySubscriptionStatus}   />
                  <SubBadge label="Hard"   status={player.hardSubscriptionStatus}   />
                  <SubBadge label="Master" status={player.masterSubscriptionStatus} />
                </div>

                {/* Edit link */}
                <Link href={`/players/${player.uid}`}
                  className="shrink-0 px-4 py-1.5 bg-purple-700 hover:bg-purple-600 text-white text-xs font-semibold rounded-lg transition-colors">
                  Edit
                </Link>
              </div>
            ))}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="mt-6 text-center">
              <button onClick={loadMore}
                className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors">
                Load more ({allPlayers.length - displayed.length} remaining)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
