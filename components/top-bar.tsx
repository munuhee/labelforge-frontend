"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api"
import type { Notification } from "@/lib/types"

interface TopBarProps {
  title: string
  subtitle?: string
}

export function TopBar({ title, subtitle }: TopBarProps) {
  const { user } = useAuth()
  const isFieldWorker = user && ['annotator', 'reviewer', 'reviewer_annotator'].includes(user.role)
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    if (!isFieldWorker) {
      api.notifications.list().then(setNotifications).catch(() => {})
    }
  }, [isFieldWorker])

  const unreadCount = notifications.filter((n) => !n.read).length

  // Field workers already have FieldWorkerNav — render a plain page title, not a second nav bar
  if (isFieldWorker) {
    return (
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    )
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card px-4">
      <div>
        <h1 className="text-base font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-9 w-9">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 flex items-center justify-center text-[10px]"
                >
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">{unreadCount} new</Badge>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <DropdownMenuItem className="text-muted-foreground text-sm justify-center py-3">
                No notifications
              </DropdownMenuItem>
            ) : (
              notifications.slice(0, 5).map((n) => (
                <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-1 py-2 cursor-pointer">
                  <div className="flex items-center gap-2 w-full">
                    {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />}
                    <span className={`text-sm font-medium ${!n.read ? "" : "text-muted-foreground"}`}>{n.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground line-clamp-1 ml-3.5">{n.message}</span>
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="justify-center text-primary text-sm">
              <Link href="/dashboard/notifications">View all notifications</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
