'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell, CheckCheck, ExternalLink } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TopBar, FieldPageHeader } from '@/components/top-bar'
import { PaginationBar } from '@/components/ui/pagination-bar'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import type { Notification } from '@/lib/types'

const PAGE_SIZE = 20

const typeColors: Record<string, string> = {
  'task-approved': 'bg-success/10 text-success border-success/20',
  'task-rejected': 'bg-destructive/10 text-destructive border-destructive/20',
  'review-needed':  'bg-primary/10 text-primary border-primary/20',
  'batch-assigned': 'bg-primary/10 text-primary border-primary/20',
  'escalation':     'bg-destructive/10 text-destructive border-destructive/20',
  'deadline':       'bg-warning/10 text-warning border-warning/20',
  'system': 'bg-muted text-muted-foreground border-border',
  'priority-warning': 'bg-warning/10 text-warning border-warning/20',
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const isFieldWorker = user ? ['annotator', 'reviewer', 'reviewer_annotator'].includes(user.role) : false
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.notifications.list()
      .then(setNotifications)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setIsLoading(false))
  }, [])

  const markRead = async (id: string) => {
    await api.notifications.markRead(id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const markAllRead = async () => {
    await api.notifications.markAllRead()
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const unreadCount = notifications.filter(n => !n.read).length
  const paged = notifications.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <>
      {isFieldWorker
        ? <FieldPageHeader title="Notifications" subtitle="Stay up to date with your work" />
        : <TopBar title="Notifications" subtitle="Stay up to date with your work" />
      }
      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{unreadCount} unread</span>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={markAllRead}>
              <CheckCheck className="h-3.5 w-3.5" />Mark all as read
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>
        ) : error ? (
          <div className="flex items-center justify-center py-12 text-destructive text-sm">{error}</div>
        ) : notifications.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bell className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No notifications yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {paged.map(n => (
              <Card
                key={n.id}
                className={`border-border bg-card cursor-pointer hover:bg-card/80 transition-colors ${!n.read ? 'border-l-2 border-l-primary' : ''}`}
                onClick={() => !n.read && markRead(n.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {!n.read && <span className="h-2 w-2 mt-1.5 rounded-full bg-primary flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`text-sm font-medium ${n.read ? 'text-muted-foreground' : 'text-foreground'}`}>
                          {n.title}
                        </p>
                        <Badge variant="outline" className={`text-[10px] ${typeColors[n.type] || typeColors.system}`}>
                          {n.type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {n.actionUrl && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" asChild>
                        <Link href={n.actionUrl}><ExternalLink className="h-3.5 w-3.5" /></Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            <PaginationBar page={page} total={notifications.length} pageSize={PAGE_SIZE} onPage={setPage} />
          </div>
        )}
      </main>
    </>
  )
}
