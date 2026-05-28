"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/",         label: "Dashboard",       icon: "◈" },
  { href: "/quizzes",  label: "Quizzes",          icon: "◎" },
  { href: "/players",  label: "Players",          icon: "◉" },
  { href: "/sessions", label: "Flagged Sessions", icon: "⚑" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname  = usePathname();
  const router    = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  const currentLabel =
    NAV_ITEMS.find((item) => isActive(item.href))?.label ?? "Menu";

  const navLinks = (onClick?: () => void) =>
    NAV_ITEMS.map((item) => (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClick}
        className={[
          "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
          isActive(item.href)
            ? "bg-purple-900/50 text-purple-300"
            : "text-gray-400 hover:bg-gray-800 hover:text-gray-100",
        ].join(" ")}
      >
        <span className="text-base">{item.icon}</span>
        {item.label}
      </Link>
    ));

  const logoutBtn = (
    <button
      onClick={handleLogout}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-gray-500 hover:bg-gray-800 hover:text-red-400 transition-colors"
    >
      <span>⎋</span>
      Log out
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-950 md:flex">

      {/* ── Persistent sidebar — md and up ── */}
      <aside className="hidden md:flex md:flex-col md:w-52 md:shrink-0 bg-gray-900 border-r border-gray-800 sticky top-0 h-screen">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-gray-800">
          <span className="text-purple-400 font-bold text-base tracking-wide">Connected</span>
          <span className="text-gray-600 text-xs ml-2">Admin</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
          {navLinks()}
        </nav>

        {/* Logout */}
        <div className="px-2 py-3 border-t border-gray-800">
          {logoutBtn}
        </div>
      </aside>

      {/* ── Right side: top bar (mobile only) + content ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* ── Top bar — mobile only ── */}
        <header className="md:hidden bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
          <div className="flex items-center justify-between px-4 py-3">
            {/* Brand */}
            <div>
              <span className="text-purple-400 font-bold text-base tracking-wide">Connected</span>
              <span className="text-gray-600 text-xs ml-2">Admin</span>
            </div>

            {/* Current page label — centered */}
            <span className="text-gray-400 text-sm font-medium absolute left-1/2 -translate-x-1/2">
              {currentLabel}
            </span>

            {/* Hamburger */}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex flex-col gap-1.5 p-2 rounded-lg hover:bg-gray-800 transition-colors"
              aria-label="Toggle menu"
            >
              <span className={["block w-5 h-0.5 bg-gray-400 transition-transform origin-center", menuOpen ? "rotate-45 translate-y-2" : ""].join(" ")} />
              <span className={["block w-5 h-0.5 bg-gray-400 transition-opacity",                  menuOpen ? "opacity-0"              : ""].join(" ")} />
              <span className={["block w-5 h-0.5 bg-gray-400 transition-transform origin-center", menuOpen ? "-rotate-45 -translate-y-2" : ""].join(" ")} />
            </button>
          </div>
        </header>

        {/* ── Mobile dropdown overlay ── */}
        {menuOpen && (
          <div className="md:hidden fixed inset-0 z-30 flex flex-col" style={{ top: "53px" }}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60" onClick={() => setMenuOpen(false)} />

            {/* Menu panel */}
            <div className="relative bg-gray-900 border-b border-gray-800 shadow-2xl">
              <nav className="px-3 py-2 space-y-1">
                {navLinks(() => setMenuOpen(false))}
              </nav>
              <div className="px-3 py-2 border-t border-gray-800">
                {logoutBtn}
              </div>
            </div>
          </div>
        )}

        {/* ── Main content ── */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl w-full mx-auto">
          {children}
        </main>
      </div>

    </div>
  );
}
