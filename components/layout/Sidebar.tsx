"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";

interface List {
  id: string;
  name: string;
  color: string;
  icon?: string | null;
}

const NAV_VIEWS = [
  { href: "/today", label: "Today", icon: "☀️" },
  { href: "/tomorrow", label: "Tomorrow", icon: "🌙" },
  { href: "/upcoming", label: "Upcoming", icon: "📅" },
  { href: "/someday", label: "Someday", icon: "✨" },
  { href: "/calendar", label: "Calendar", icon: "🗓" },
  { href: "/search", label: "Search", icon: "🔍" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [lists, setLists] = useState<List[]>([]);

  useEffect(() => {
    fetch("/api/lists").then((r) => r.json()).then((d) => {
      if (d.ok) setLists(d.data);
    });
  }, []);

  return (
    <nav className="sidebar">
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 12px 16px" }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: "var(--accent)",
          boxShadow: "var(--accent-glow)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, flexShrink: 0,
        }}>✦</div>
        <span style={{ fontWeight: 700, fontSize: "1rem", letterSpacing: "-0.02em" }}>Pixie</span>
      </div>

      {/* Smart views */}
      {NAV_VIEWS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`nav-item ${pathname === item.href ? "active" : ""}`}
        >
          <span style={{ fontSize: 15 }}>{item.icon}</span>
          {item.label}
        </Link>
      ))}

      <div className="divider" />

      {/* Lists */}
      <div className="nav-section-label">Lists</div>
      {lists.map((list) => (
        <Link
          key={list.id}
          href={`/list/${list.id}`}
          className={`nav-item ${pathname === `/list/${list.id}` ? "active" : ""}`}
        >
          <span style={{
            width: 10, height: 10, borderRadius: "50%",
            background: list.color, flexShrink: 0,
          }} />
          {list.icon && <span style={{ fontSize: 14 }}>{list.icon}</span>}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {list.name}
          </span>
        </Link>
      ))}

      <Link href="/list/new" className="nav-item" style={{ color: "var(--accent)", marginTop: 4 }}>
        <span>＋</span> New list
      </Link>

      {/* Bottom */}
      <div style={{ flex: 1 }} />
      <div className="divider" />

      <Link href="/notes" className={`nav-item ${pathname === "/notes" ? "active" : ""}`}>
        <span style={{ fontSize: 15 }}>📝</span> Notes
      </Link>
      <Link href="/settings" className={`nav-item ${pathname === "/settings" ? "active" : ""}`}>
        <span style={{ fontSize: 15 }}>⚙️</span> Settings
      </Link>
      <button
        className="nav-item"
        onClick={() => signOut({ callbackUrl: "/auth/login" })}
        style={{ color: "var(--text-muted)" }}
      >
        <span style={{ fontSize: 15 }}>→</span> Sign out
      </button>
    </nav>
  );
}
