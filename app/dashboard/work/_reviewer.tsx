'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle, Clock, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TopBar } from '@/components/top-bar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import type { Review } from '@/lib/types'

const PAGE_SIZE = 50

const statusBadge = (status: string) => {
  if (status === 'approved') return <Badge className="bg-green-100 text-green-700 border border-green-200 hover:bg-green-100 font-normal text-xs rounded-full px-2.5">Approved</Badge>
  if (status === 'rejected') return <Badge className="bg-red-100 text-red-700 border border-red-200 hover:bg-red-100 font-normal text-xs rounded-full px-2.5">Rejected</Badge>
  if (status === 'revision-requested') return <Badge className="bg-yellow-100 text-yellow-700 border border-yellow-200 hover:bg-yellow-100 font-normal text-xs rounded-full px-2.5">Revision Needed</Badge>
  if (status === 'in-review') return <Badge className="bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-100 font-normal text-xs rounded-full px-2.5">In Review</Badge>
  return <span className="text-xs text-muted-foreground capitalize">{status.replace(/-/g, ' ')}</span>
}

const TablePager = ({ rows, page, setPage }: { rows: Review[]; page: number; setPage: (p: number) => void }) => {
  const total = rows.length
  const from = total === 0 ? 0 : Math.min((page - 1) * PAGE_SIZE + 1, total)
  const to = Math.min(page * PAGE_SIZE, total)
  const pages = Math.ceil(total / PAGE_SIZE)
  return (
    <div className="flex items-center justify-between px-4 py-2 border-t bg-background">
      <span className="text-xs text-muted-foreground">{from} - {to} of {total} rows</span>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={page === 1} onClick={() => setPage(page - 1)}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={page === pages || pages === 0} onClick={() => setPage(page + 1)}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setPage(1)}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

export default function ReviewerWork({ hideTitle }: { hideTitle?: boolean } = {}) {
  const { user } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activePage, setActivePage] = useState(1)
  const [donePage, setDonePage] = useState(1)

  useEffect(() => {
    api.reviews.list()
      .then(setReviews)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setIsLoading(false))
  }, [])

  const mine = reviews.filter(r => r.reviewerId === user?.id)
  const active = mine.filter(r => r.status === 'in-review')
  const done = mine.filter(r => !['pending', 'in-review'].includes(r.status))

  const ReviewTable = ({ rows, page, setPage }: { rows: Review[]; page: number; setPage: (p: number) => void }) => {
    const paged = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    return (
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-[300px]">Task ID</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Annotator</TableHead>
              <TableHead className="w-[160px]">Submitted</TableHead>
              <TableHead className="w-[160px]">Reviewed</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Quality</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No reviews found</TableCell>
              </TableRow>
            ) : (
              paged.map(review => (
                <TableRow key={review.id}>
                  <TableCell>
                    <Link href={`/dashboard/tasks/${review.taskId}`} className="text-primary hover:underline font-mono text-xs">
                      {review.taskId}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{review.batchTitle}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{review.annotatorName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(review.submittedAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {review.reviewedAt ? new Date(review.reviewedAt).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell>{statusBadge(review.status)}</TableCell>
                  <TableCell className="text-sm font-medium text-green-600">
                    {review.qualityScore ? `${review.qualityScore}%` : '—'}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" asChild>
                      <Link href={`/dashboard/tasks/${review.taskId}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePager rows={rows} page={page} setPage={setPage} />
      </div>
    )
  }

  return (
    <>
      {!hideTitle && <TopBar title="Work" subtitle="Your review activity" />}
      <main className="flex-1 overflow-y-auto p-2 lg:p-3 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>
        ) : error ? (
          <div className="flex items-center justify-center py-12 text-destructive text-sm">{error}</div>
        ) : (
          <Tabs defaultValue="active" className="space-y-3" onValueChange={() => { setActivePage(1); setDonePage(1) }}>
            <TabsList className="bg-card border border-border h-10">
              <TabsTrigger value="active" className="gap-2 text-sm">
                <Clock className="h-4 w-4" />In Progress ({active.length})
              </TabsTrigger>
              <TabsTrigger value="done" className="gap-2 text-sm">
                <CheckCircle className="h-4 w-4" />Completed ({done.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="active">
              <ReviewTable rows={active} page={activePage} setPage={setActivePage} />
            </TabsContent>
            <TabsContent value="done">
              <ReviewTable rows={done} page={donePage} setPage={setDonePage} />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </>
  )
}
