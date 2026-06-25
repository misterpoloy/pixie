'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Wallet, CheckSquare, ChevronDown, Search, Bell, ExternalLink, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLayout } from '@/components/layout/LayoutContext'

// ── Waffle icon (Microsoft-style 3×3 grid) ───────────────────────────────────
function WaffleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 18" fill="currentColor" className={className}>
      <rect x="1"  y="1"  width="5" height="5" rx="1" />
      <rect x="7"  y="1"  width="5" height="5" rx="1" />
      <rect x="13" y="1"  width="5" height="5" rx="1" />
      <rect x="1"  y="7"  width="5" height="5" rx="1" />
      <rect x="7"  y="7"  width="5" height="5" rx="1" />
      <rect x="13" y="7"  width="5" height="5" rx="1" />
      <rect x="1"  y="13" width="5" height="5" rx="1" />
      <rect x="7"  y="13" width="5" height="5" rx="1" />
      <rect x="13" y="13" width="5" height="5" rx="1" />
    </svg>
  )
}

// ── App definitions ───────────────────────────────────────────────────────────
const APPS = [
  {
    id:       'wallet',
    name:     'Wallet',
    description: 'Family finances',
    href:     'http://localhost:3032',
    external: true,
    icon:     Wallet,
    color:    '#107C41',
    colorEnd: '#0A5C2E',
  },
  {
    id:       'pixie',
    name:     'Pixie',
    description: 'Tasks & projects',
    href:     '/',
    external: false,
    icon:     CheckSquare,
    color:    '#7B2FBE',
    colorEnd: '#5A1A9A',
  },
] as const

// ── Initials avatar ───────────────────────────────────────────────────────────
function Avatar({ name, color }: { name: string; color: string }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 select-none"
      style={{ background: color }}
    >
      {initials}
    </div>
  )
}

// ── App Launcher panel ────────────────────────────────────────────────────────
function AppLauncher({ activeAppId, onClose }: { activeAppId: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full mt-1 w-72 rounded-xl border border-white/[0.10] overflow-hidden z-50"
      style={{
        background: '#1f1f1f',
        boxShadow: '0 8px 40px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)',
      }}
    >
      {/* Panel header */}
      <div className="px-4 py-3 border-b border-white/[0.07]">
        <p className="text-[11px] font-semibold text-white/40 uppercase tracking-[0.10em]">Apps</p>
      </div>

      {/* App tiles */}
      <div className="p-3 grid grid-cols-2 gap-2">
        {APPS.map(app => {
          const Icon   = app.icon
          const active = app.id === activeAppId
          const content = (
            <div
              className={cn(
                'relative flex flex-col items-center gap-2.5 p-4 rounded-xl border transition-all cursor-pointer group',
                active
                  ? 'border-white/[0.12] bg-white/[0.06]'
                  : 'border-transparent hover:border-white/[0.08] hover:bg-white/[0.04]'
              )}
            >
              {active && (
                <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                style={{ background: `linear-gradient(145deg, ${app.color}, ${app.colorEnd})` }}
              >
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div className="text-center">
                <p className="text-[13px] font-semibold text-white leading-none">{app.name}</p>
                <p className="text-[10px] text-white/35 mt-0.5">{app.description}</p>
              </div>
              {app.external && (
                <ExternalLink className="absolute top-2 left-2 w-3 h-3 text-white/20 group-hover:text-white/40 transition-colors" />
              )}
            </div>
          )

          return app.external ? (
            <a key={app.id} href={app.href} target="_blank" rel="noopener noreferrer" onClick={onClose}>
              {content}
            </a>
          ) : (
            <Link key={app.id} href={app.href} onClick={onClose}>
              {content}
            </Link>
          )
        })}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-2.5 border-t border-white/[0.06] text-center">
        <p className="text-[10px] text-white/20">More apps coming · Okta SSO soon</p>
      </div>
    </div>
  )
}

// ── Top Bar ───────────────────────────────────────────────────────────────────
export function TopBar() {
  const [launcherOpen, setLauncherOpen] = useState(false)
  const activeApp = APPS.find(a => a.id === 'pixie')!
  const { toggleSidebar } = useLayout()

  return (
    <header
      className="fixed top-0 left-0 right-0 h-11 flex items-center border-b"
      style={{
        background: '#1f1f1f',
        borderColor: 'rgba(255,255,255,0.07)',
        zIndex: 150,
      }}
    >
      {/* ── Left: hamburger (mobile) + waffle + app identity ───────────────── */}
      <div className="flex items-center h-full relative">
        {/* Hamburger — mobile only */}
        <button
          onClick={toggleSidebar}
          className="md:hidden w-11 h-full flex items-center justify-center text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition-colors flex-shrink-0"
          aria-label="Toggle menu"
        >
          <Menu className="w-[18px] h-[18px]" />
        </button>
        <button
          onClick={() => setLauncherOpen(v => !v)}
          className={cn(
            'w-11 h-full flex items-center justify-center transition-colors flex-shrink-0',
            launcherOpen ? 'bg-white/[0.10]' : 'hover:bg-white/[0.06]'
          )}
          aria-label="App launcher"
        >
          <WaffleIcon className="w-[18px] h-[18px] text-white/70" />
        </button>

        {launcherOpen && (
          <AppLauncher
            activeAppId={activeApp.id}
            onClose={() => setLauncherOpen(false)}
          />
        )}

        <div className="w-px h-5 bg-white/[0.08] mx-1 flex-shrink-0" />

        <div className="flex items-center gap-2 px-3 h-full select-none">
          <div
            className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
            style={{ background: `linear-gradient(145deg, ${activeApp.color}, ${activeApp.colorEnd})` }}
          >
            <activeApp.icon className="w-3 h-3 text-white" />
          </div>
          <span className="text-[13px] font-semibold text-white/90 tracking-tight">
            {activeApp.name}
          </span>
        </div>
      </div>

      {/* ── Center: spacer ──────────────────────────────────────────────────── */}
      <div className="flex-1" />

      {/* ── Right: actions + user ───────────────────────────────────────────── */}
      <div className="flex items-center h-full pr-3 gap-1">
        <button className="w-8 h-8 flex items-center justify-center rounded-lg text-white/35 hover:text-white/70 hover:bg-white/[0.06] transition-colors">
          <Search className="w-[15px] h-[15px]" />
        </button>

        <button className="relative w-8 h-8 flex items-center justify-center rounded-lg text-white/35 hover:text-white/70 hover:bg-white/[0.06] transition-colors">
          <Bell className="w-[15px] h-[15px]" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-yellow-400" />
        </button>

        <div className="w-px h-5 bg-white/[0.08] mx-1 flex-shrink-0" />

        <Link href="/account" className="flex items-center gap-2 px-2 h-8 rounded-lg hover:bg-white/[0.06] transition-colors">
          <Avatar name="Juan Pablo" color="#7B2FBE" />
          <span className="text-[12px] text-white/50 leading-none hidden sm:block">Juan</span>
          <ChevronDown className="w-3 h-3 text-white/25 hidden sm:block" />
        </Link>
      </div>
    </header>
  )
}
