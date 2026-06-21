"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  Sun,
  Moon,
  CalendarDays,
  Hourglass,
  Calendar,
  Search,
  FileText,
  Settings,
  LogOut,
  Plus,
  List,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface List {
  id: string;
  name: string;
  color: string;
  icon?: string | null;
}

const NAV_VIEWS = [
  { href: "/today",    label: "Today",    icon: Sun         },
  { href: "/tomorrow", label: "Tomorrow", icon: Moon        },
  { href: "/upcoming", label: "Upcoming", icon: CalendarDays},
  { href: "/someday",  label: "Someday",  icon: Hourglass   },
  { href: "/calendar", label: "Calendar", icon: Calendar    },
  { href: "/search",   label: "Search",   icon: Search      },
];

const BOTTOM_VIEWS = [
  { href: "/notes",    label: "Notes",    icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [lists, setLists] = useState<List[]>([]);

  useEffect(() => {
    fetch("/api/lists").then((r) => r.json()).then((d) => {
      if (d.ok) setLists(d.data);
    });
  }, []);

  const isActive = (href: string) => pathname === href;

  return (
    <aside className="fixed left-0 top-11 bottom-0 w-[220px] z-40 flex flex-col bg-[#070a0f]/95 backdrop-blur-2xl border-r border-white/[0.06] py-3 px-2 overflow-y-auto">

      {/* Smart views */}
      <nav className="space-y-px">
        {NAV_VIEWS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150",
                active
                  ? "bg-[#7c6ef7]/10 text-[#9484fa]"
                  : "text-white/40 hover:text-white/80 hover:bg-white/[0.04]"
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#7c6ef7] rounded-r-full" />
              )}
              <Icon className={cn("w-[15px] h-[15px] flex-shrink-0", active ? "text-[#7c6ef7]" : "")} />
              <span className="tracking-tight">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="my-4 border-t border-white/[0.05]" />

      {/* Lists */}
      <div className="px-3 mb-1.5">
        <p className="text-[10px] font-semibold text-white/20 uppercase tracking-[0.12em]">Lists</p>
      </div>
      <nav className="space-y-px">
        {lists.map((list) => {
          const href = `/list/${list.id}`;
          const active = pathname === href;
          return (
            <Link
              key={list.id}
              href={href}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150",
                active
                  ? "bg-[#7c6ef7]/10 text-[#9484fa]"
                  : "text-white/40 hover:text-white/80 hover:bg-white/[0.04]"
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#7c6ef7] rounded-r-full" />
              )}
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: list.color }}
              />
              <span className="truncate tracking-tight">{list.name}</span>
            </Link>
          );
        })}

        <Link
          href="/list/new"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-[#7c6ef7]/60 hover:text-[#7c6ef7] hover:bg-[#7c6ef7]/[0.06] transition-all duration-150"
        >
          <Plus className="w-[15px] h-[15px] flex-shrink-0" />
          <span className="tracking-tight">New list</span>
        </Link>
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom nav */}
      <div className="border-t border-white/[0.05] pt-3 space-y-px">
        {BOTTOM_VIEWS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150",
                active
                  ? "bg-[#7c6ef7]/10 text-[#9484fa]"
                  : "text-white/40 hover:text-white/80 hover:bg-white/[0.04]"
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#7c6ef7] rounded-r-full" />
              )}
              <Icon className={cn("w-[15px] h-[15px] flex-shrink-0", active ? "text-[#7c6ef7]" : "")} />
              <span className="tracking-tight">{label}</span>
            </Link>
          );
        })}

        <button
          onClick={() => signOut({ callbackUrl: "/auth/login" })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-white/25 hover:text-white/60 hover:bg-white/[0.04] transition-all duration-150"
        >
          <LogOut className="w-[15px] h-[15px] flex-shrink-0" />
          <span className="tracking-tight">Sign out</span>
        </button>
      </div>
    </aside>
  );
}
