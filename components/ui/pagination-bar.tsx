'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function PaginationBar({
  page, total, pageSize, onPage,
}: { page: number; total: number; pageSize: number; onPage: (p: number) => void }) {
  const pages = Math.ceil(total / pageSize)
  const [inputVal, setInputVal] = useState(String(page))

  useEffect(() => { setInputVal(String(page)) }, [page])

  if (pages <= 1) return null

  const getPageNumbers = (): (number | '...')[] => {
    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
    const items: (number | '...')[] = [1]
    if (page > 3) items.push('...')
    const start = Math.max(2, page - 1)
    const end = Math.min(pages - 1, page + 1)
    for (let i = start; i <= end; i++) items.push(i)
    if (page < pages - 2) items.push('...')
    items.push(pages)
    return items
  }

  const commit = (val: string) => {
    const n = parseInt(val, 10)
    if (!isNaN(n)) onPage(Math.min(Math.max(1, n), pages))
    else setInputVal(String(page))
  }

  const from = Math.min((page - 1) * pageSize + 1, total)
  const to = Math.min(page * pageSize, total)

  return (
    <div className="flex items-center justify-between pt-3">
      <p className="text-xs text-muted-foreground">{from}–{to} of {total}</p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page === 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        {getPageNumbers().map((p, i) =>
          p === '...' ? (
            <span key={`e${i}`} className="h-7 w-6 flex items-center justify-center text-xs text-muted-foreground">…</span>
          ) : (
            <Button key={p} variant={p === page ? 'default' : 'outline'} size="sm"
              className="h-7 w-7 p-0 text-xs" onClick={() => onPage(p as number)}>
              {p}
            </Button>
          )
        )}
        <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page === pages} onClick={() => onPage(page + 1)}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <span className="text-xs text-muted-foreground ml-1">Go to</span>
        <Input
          className="h-7 w-12 text-xs text-center px-1"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onBlur={e => commit(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commit(inputVal) }}
        />
      </div>
    </div>
  )
}
