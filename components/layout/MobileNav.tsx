"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, CalendarDays, Search, List, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/today",    label: "Today",    icon: Sun         },
  { href: "/upcoming", label: "Upcoming", icon: CalendarDays},
  { href: "/search",   label: "Search",   icon: Search      },
  { href: "/calendar", label: "Calendar", icon: List        },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="mobile-nav" role="navigation" aria-label="Mobile navigation">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn("mobile-nav-btn", active && "active")}
          >
            <Icon strokeWidth={active ? 2.2 : 1.7} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
