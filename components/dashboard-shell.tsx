'use client'

import { useAuth } from '@/lib/auth-context'
import { AppSidebar } from '@/components/app-sidebar'
import { FieldWorkerNav } from '@/components/field-worker-nav'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const isFieldWorker = user && ['annotator', 'reviewer', 'reviewer_annotator'].includes(user.role)

  if (isFieldWorker) {
    return (
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        <FieldWorkerNav />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <AppSidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
