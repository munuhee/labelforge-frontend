'use client'

import { ShieldAlert, LogOut } from 'lucide-react'
import { useAuthContext } from '@/lib/auth-context'

const roleLabel: Record<string, string> = {
  client_admin:       'Workspace Admin',
  qa_lead:            'QA Lead',
  reviewer:           'Reviewer',
  reviewer_annotator: 'Reviewer / Annotator',
  annotator:          'Annotator',
}

export function ImpersonationBanner() {
  const { user, logout } = useAuthContext()

  if (!user?.impersonatedBy) return null

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 bg-warning text-warning-foreground text-xs font-medium shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">
          Impersonating <strong>{user.name}</strong>
          {' '}({roleLabel[user.role] ?? user.role})
          {user.clientSlug && <> in <strong>{user.clientSlug}</strong></>}
          {' '}— session expires in 1 hour
        </span>
      </div>
      <button
        onClick={() => logout()}
        className="flex items-center gap-1.5 shrink-0 underline underline-offset-2 hover:opacity-80 transition-opacity"
      >
        <LogOut className="h-3 w-3" />
        Return to Admin
      </button>
    </div>
  )
}
