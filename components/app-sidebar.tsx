"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Briefcase, Bell, ShieldCheck,
  BarChart3, LogOut, PanelLeftClose, PanelLeftOpen,
  FolderOpen, Settings, Layers,
} from "lucide-react"
import { useAuthContext as useAuth } from "@/lib/auth-context"
import { ImpersonationBanner } from "@/components/impersonation-banner"
import { useState } from "react"
import type { UserRole } from "@/lib/types"

function getNavItems(role: UserRole, basePath: string) {
  switch (role) {
    case 'annotator':
      return [
        { title: "Assignments", url: `${basePath}`, icon: LayoutDashboard, exact: true },
        { title: "Work", url: `${basePath}/work`, icon: Briefcase },
        { title: "Notifications", url: `${basePath}/notifications`, icon: Bell },
      ]

    case 'reviewer':
    case 'reviewer_annotator':
      return [
        { title: "Assignments", url: `${basePath}`, icon: LayoutDashboard, exact: true },
        { title: "Work", url: `${basePath}/work`, icon: Briefcase },
        { title: "Notifications", url: `${basePath}/notifications`, icon: Bell },
      ]

    case 'qa_lead':
      return [
        { title: "Overview", url: `${basePath}`, icon: LayoutDashboard, exact: true },
        { title: "Work", url: `${basePath}/work`, icon: Briefcase },
        { title: "Reviews", url: `${basePath}/reviews`, icon: ShieldCheck },
        { title: "Reports", url: `${basePath}/reports`, icon: BarChart3 },
        { title: "Notifications", url: `${basePath}/notifications`, icon: Bell },
        { title: "Settings", url: `${basePath}/settings`, icon: Settings },
      ]

    case 'client_admin':
      return [
        { title: "Dashboard", url: `${basePath}`, icon: LayoutDashboard, exact: true },
        { title: "Projects", url: `${basePath}/batches`, icon: FolderOpen },
        { title: "Work", url: `${basePath}/work`, icon: Briefcase },
        { title: "Reports", url: `${basePath}/reports`, icon: BarChart3 },
        { title: "Notifications", url: `${basePath}/notifications`, icon: Bell },
        { title: "Settings", url: `${basePath}/settings`, icon: Settings },
        { title: "Workspace", url: `${basePath}/admin`, icon: Layers },
      ]

    case 'super_admin':
      return [
        { title: "System Overview", url: `${basePath}`, icon: LayoutDashboard, exact: true },
        { title: "Workspaces", url: `${basePath}/admin`, icon: ShieldCheck },
        { title: "Work", url: `${basePath}/work`, icon: Briefcase },
        { title: "Reports", url: `${basePath}/reports`, icon: BarChart3 },
        { title: "Notifications", url: `${basePath}/notifications`, icon: Bell },
        { title: "Settings", url: `${basePath}/settings`, icon: Settings },
      ]

    default:
      return [
        { title: "Assignments", url: `${basePath}`, icon: LayoutDashboard, exact: true },
        { title: "Work", url: `${basePath}/work`, icon: Briefcase },
        { title: "Notifications", url: `${basePath}/notifications`, icon: Bell },
      ]
  }
}

function roleLabel(role: UserRole): string {
  switch (role) {
    case 'super_admin':        return 'Super Admin'
    case 'client_admin':       return 'Admin'
    case 'qa_lead':            return 'QA Lead'
    case 'reviewer':           return 'Reviewer'
    case 'reviewer_annotator': return 'Reviewer/Annotator'
    case 'annotator':          return 'Annotator'
    default:                   return role
  }
}

export function AppSidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  // Field workers (annotator, reviewer, reviewer_annotator) get a sidebar-free minimal interface
  if (user && ['annotator', 'reviewer', 'reviewer_annotator'].includes(user.role)) return null

  // Build the base path using the clientSlug from the active session.
  // super_admin may have no clientSlug when acting globally.
  const basePath = user?.clientSlug
    ? `/${user.clientSlug}/dashboard`
    : '/dashboard'

  const role: UserRole = (user?.role as UserRole) ?? 'annotator'
  const navItems = getNavItems(role, basePath)

  const initials = user
    ? user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "?"

  const NavItem = ({ item }: { item: typeof navItems[0] }) => {
    const active = (item as { exact?: boolean }).exact
      ? pathname === item.url || pathname === item.url.replace(/^\/[^/]+/, '')
      : pathname.startsWith(item.url) || pathname.startsWith(item.url.replace(/^\/[^/]+/, ''))

    return (
      <Link
        href={item.url}
        title={collapsed ? item.title : undefined}
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors overflow-hidden
          ${collapsed ? "justify-center px-2" : ""}
          ${active
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="truncate">{item.title}</span>}
      </Link>
    )
  }

  return (
    <aside className={`relative flex flex-col h-screen border-r border-border bg-card transition-all duration-200 shrink-0 overflow-hidden
      ${collapsed ? "w-[56px]" : "w-[220px]"}`}>

      {/* Impersonation banner — spans full sidebar width */}
      {!collapsed && <ImpersonationBanner />}

      {/* Header */}
      <div className={`flex items-center h-14 border-b border-border px-3 shrink-0 ${collapsed ? "justify-center" : "gap-2"}`}>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shrink-0">
          <span className="text-sm font-bold text-primary-foreground">LF</span>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <span className="text-base font-semibold text-foreground truncate block">LabelForge</span>
            {user?.clientSlug && (
              <span className="text-[11px] text-muted-foreground truncate block">{user.clientSlug}</span>
            )}
          </div>
        )}
      </div>

      {/* Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={`absolute top-3.5 right-2 p-1 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors z-10
          ${collapsed ? "right-1/2 translate-x-1/2" : ""}`}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
      </button>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-0.5">
        {navItems.map(item => <NavItem key={item.url} item={item} />)}
      </nav>

      {/* User footer */}
      <div className="border-t border-border px-2 py-3 shrink-0">
        <div className={`flex items-center gap-2 rounded-lg px-2 py-2 ${collapsed ? "justify-center" : ""}`}>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-semibold shrink-0">
            {initials}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{user?.name ?? "Loading..."}</p>
                <p className="text-xs text-muted-foreground truncate">{user ? roleLabel(role) : ""}</p>
              </div>
              <button onClick={logout} title="Sign out"
                className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0">
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  )
}
