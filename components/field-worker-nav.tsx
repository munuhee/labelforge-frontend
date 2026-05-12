'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bell, LogOut, LayoutDashboard, ClipboardList, Star, Settings } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { useAuthContext as useAuth } from '@/lib/auth-context'
import { ImpersonationBanner } from '@/components/impersonation-banner'
import { api } from '@/lib/api'
import type { Notification } from '@/lib/types'

export function FieldWorkerNav() {
  const { user, logout } = useAuth()
  const [unread, setUnread] = useState(0)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const basePath = user?.clientSlug ? `/${user.clientSlug}/dashboard` : '/dashboard'
  const initials = user?.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'

  useEffect(() => {
    api.notifications.list()
      .then(ns => setUnread((ns as Notification[]).filter(n => !n.read).length))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const navItems = [
    { href: basePath,                          icon: LayoutDashboard, label: 'Dashboard',     badge: undefined as number | undefined },
    { href: `${basePath}/work`,                icon: ClipboardList,   label: 'My Work',        badge: undefined },
    { href: `${basePath}/notifications`,       icon: Bell,            label: 'Notifications',  badge: unread || undefined },
    ...(user?.role === 'reviewer' || user?.role === 'reviewer_annotator'
      ? [{ href: `${basePath}/reviews`, icon: Star, label: 'Reviews', badge: undefined }]
      : []),
    { href: `${basePath}/settings`, icon: Settings, label: 'Settings', badge: undefined },
  ]

  return (
    <div className="sticky top-0 z-50 flex flex-col">
      <ImpersonationBanner />
    <header className="flex items-center justify-between px-6 h-14 border-b border-border bg-background/95 backdrop-blur-sm shrink-0">
      <Link href={basePath} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary shrink-0">
          <span className="text-xs font-bold text-primary-foreground">LF</span>
        </div>
        <span className="text-sm font-semibold tracking-tight">LabelForge</span>
        {user?.clientSlug && (
          <span className="hidden sm:inline text-xs text-muted-foreground">/ {user.clientSlug}</span>
        )}
      </Link>

      <div className="flex items-center gap-1">
        <ThemeToggle />
        <Link
          href={`${basePath}/notifications`}
          className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 h-3 w-3 rounded-full bg-destructive text-[7px] font-bold text-destructive-foreground flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Link>

        <div className="relative ml-1" ref={menuRef}>
          <button
            onClick={() => setShowMenu(v => !v)}
            className="h-8 w-8 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center hover:bg-primary/25 transition-colors"
          >
            {initials}
          </button>

          {showMenu && (
            <div className="absolute right-0 top-10 bg-popover border border-border rounded-xl shadow-lg p-1.5 min-w-[210px] z-50">
              {/* User info */}
              <div className="px-3 py-2.5 border-b border-border mb-1">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate mb-1.5">{user?.email}</p>
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary capitalize">
                  {user?.role === 'reviewer_annotator' ? 'Reviewer · Annotator' : user?.role?.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Nav links */}
              <div className="space-y-0.5 mb-1">
                {navItems.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge !== undefined && (
                      <span className="h-4 min-w-4 px-1 rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground flex items-center justify-center">
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    )}
                  </Link>
                ))}
              </div>

              {/* Sign out */}
              <div className="border-t border-border pt-1">
                <button
                  onClick={logout}
                  className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg flex items-center gap-2.5 transition-colors"
                >
                  <LogOut className="h-4 w-4" />Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
    </div>
  )
}
