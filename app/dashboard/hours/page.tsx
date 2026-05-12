'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

export default function HoursPage() {
  const router = useRouter()
  const { user } = useAuth()
  const basePath = user?.clientSlug ? `/${user.clientSlug}/dashboard` : '/dashboard'
  useEffect(() => { router.replace(`${basePath}/reports`) }, [basePath, router])
  return null
}
