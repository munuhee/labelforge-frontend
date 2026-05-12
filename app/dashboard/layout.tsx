import { DashboardShell } from '@/components/dashboard-shell'
import { ScreenSizeGuard } from '@/components/screen-size-guard'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ScreenSizeGuard>
      <DashboardShell>{children}</DashboardShell>
    </ScreenSizeGuard>
  )
}
