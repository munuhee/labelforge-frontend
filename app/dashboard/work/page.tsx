'use client'

import { useState } from 'react'
import { ClipboardList, Eye } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import AnnotatorWork from './_annotator'
import ReviewerWork from './_reviewer'
import AdminWork from './_admin'

export default function WorkPage() {
  const { user } = useAuth()
  const [mode, setMode] = useState<'annotate' | 'review'>('annotate')

  if (!user) return null

  if (user.role === 'annotator') return <AnnotatorWork />
  if (user.role === 'reviewer') return <ReviewerWork />

  if (user.role === 'reviewer_annotator') {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div className="px-6 pt-5 pb-2 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Work</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Switch between your annotation and review queues</p>
          </div>
          <Tabs value={mode} onValueChange={v => setMode(v as 'annotate' | 'review')}>
            <TabsList className="bg-card border border-border h-8">
              <TabsTrigger value="annotate" className="text-xs gap-1.5 h-6">
                <ClipboardList className="h-3.5 w-3.5" />Annotate
              </TabsTrigger>
              <TabsTrigger value="review" className="text-xs gap-1.5 h-6">
                <Eye className="h-3.5 w-3.5" />Review
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {mode === 'annotate' ? <AnnotatorWork hideTitle /> : <ReviewerWork hideTitle />}
      </div>
    )
  }

  // qa_lead, client_admin, super_admin
  return <AdminWork />
}
