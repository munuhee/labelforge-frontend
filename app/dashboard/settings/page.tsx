'use client'

import { useState } from 'react'
import { Lock, Palette, Download, Sun, Moon, Monitor, Eye, EyeOff, ShieldCheck, Chrome } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { TopBar, FieldPageHeader } from '@/components/top-bar'
import { useAuth } from '@/lib/auth-context'
import { useTheme } from 'next-themes'

const roleLabel: Record<string, string> = {
  super_admin:        'Super Admin',
  client_admin:       'Workspace Admin',
  qa_lead:            'QA Lead',
  reviewer:           'Reviewer',
  reviewer_annotator: 'Reviewer / Annotator',
  annotator:          'Annotator',
}

const roleColor: Record<string, string> = {
  super_admin:        'bg-destructive/10 text-destructive border-destructive/20',
  client_admin:       'bg-warning/10 text-warning border-warning/20',
  qa_lead:            'bg-success/10 text-success border-success/20',
  reviewer:           'bg-primary/10 text-primary border-primary/20',
  reviewer_annotator: 'bg-primary/10 text-primary border-primary/20',
  annotator:          'bg-muted text-muted-foreground border-border',
}

function Section({
  icon: Icon, title, description, children,
}: {
  icon: React.ElementType
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="py-8">
      <div className="flex flex-col sm:flex-row sm:items-start gap-6">
        <div className="sm:w-64 shrink-0 space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-secondary border border-border">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            </span>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed pl-[2.25rem]">{description}</p>
        </div>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const [showCurrent, setShowCurrent]   = useState(false)
  const [showNew, setShowNew]           = useState(false)
  const [showConfirm, setShowConfirm]   = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwMessage, setPwMessage] = useState<{ text: string; ok: boolean } | null>(null)

  if (!user) return null

  const isFieldWorker = ['annotator', 'reviewer', 'reviewer_annotator'].includes(user.role)
  const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwMessage({ text: 'Please fill in all fields.', ok: false }); return
    }
    if (newPassword !== confirmPassword) {
      setPwMessage({ text: 'New passwords do not match.', ok: false }); return
    }
    if (newPassword.length < 8) {
      setPwMessage({ text: 'Password must be at least 8 characters.', ok: false }); return
    }
    setPwMessage({ text: 'Password updated successfully.', ok: true })
    setTimeout(() => setPwMessage(null), 3000)
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
  }

  const themes = [
    { value: 'light',  icon: Sun,     label: 'Light',
      preview: 'bg-white border-zinc-200' },
    { value: 'dark',   icon: Moon,    label: 'Dark',
      preview: 'bg-zinc-900 border-zinc-700' },
    { value: 'system', icon: Monitor, label: 'System',
      preview: 'bg-gradient-to-br from-white to-zinc-900 border-zinc-400' },
  ]

  const CHROME_EXTENSION_URL = '/labelforge-extension.crx'

  return (
    <>
      {isFieldWorker
        ? <FieldPageHeader title="Settings" subtitle="Manage your account and preferences" />
        : <TopBar title="Settings" subtitle="Manage your account and preferences" />
      }
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 lg:px-8 py-8 space-y-0">

          {/* ── Profile banner ── */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden mb-2">
            {/* Gradient strip */}
            <div className="h-20 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
            <div className="px-6 pb-5 -mt-10 flex items-end gap-4">
              {/* Avatar */}
              <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold ring-4 ring-card shrink-0">
                {initials}
              </div>
              <div className="pb-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-foreground truncate">{user.name}</p>
                  <Badge variant="outline" className={`text-[10px] ${roleColor[user.role] ?? ''}`}>
                    {roleLabel[user.role] ?? user.role}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                {user.clientSlug && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Workspace: <span className="font-mono">{user.clientSlug}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Sections ── */}
          <div className="rounded-2xl border border-border bg-card px-6 divide-y divide-border">

            {/* Appearance */}
            <Section icon={Palette} title="Appearance" description="Choose how LabelForge looks. System follows your OS preference.">
              <div className="flex gap-3 flex-wrap">
                {themes.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setTheme(t.value)}
                    className={`group flex flex-col items-center gap-2 p-1 rounded-xl border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      theme === t.value
                        ? 'border-primary'
                        : 'border-border hover:border-muted-foreground/40'
                    }`}
                  >
                    {/* Mini preview tile */}
                    <div className={`h-14 w-24 rounded-lg border ${t.preview}`} />
                    <span className={`flex items-center gap-1.5 text-xs font-medium pb-0.5 ${theme === t.value ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}>
                      <t.icon className="h-3 w-3" />{t.label}
                    </span>
                  </button>
                ))}
              </div>
            </Section>

            {/* Security */}
            <Section icon={Lock} title="Security" description="Change your account password. Use at least 8 characters with a mix of letters and numbers.">
              <div className="space-y-3 max-w-sm">
                {[
                  { label: 'Current password', value: currentPassword, onChange: setCurrentPassword, show: showCurrent, toggleShow: () => setShowCurrent(v => !v) },
                  { label: 'New password',      value: newPassword,     onChange: setNewPassword,     show: showNew,     toggleShow: () => setShowNew(v => !v) },
                  { label: 'Confirm password',  value: confirmPassword, onChange: setConfirmPassword, show: showConfirm, toggleShow: () => setShowConfirm(v => !v) },
                ].map(f => (
                  <div key={f.label}>
                    <label className="text-xs text-muted-foreground mb-1.5 block">{f.label}</label>
                    <div className="relative">
                      <Input
                        type={f.show ? 'text' : 'password'}
                        value={f.value}
                        onChange={e => f.onChange(e.target.value)}
                        className="h-9 bg-secondary/30 pr-9 text-sm"
                      />
                      <button
                        type="button"
                        onClick={f.toggleShow}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {f.show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                ))}

                {pwMessage && (
                  <p className={`text-xs flex items-center gap-1.5 ${pwMessage.ok ? 'text-success' : 'text-destructive'}`}>
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                    {pwMessage.text}
                  </p>
                )}

                <Button size="sm" className="h-8 text-xs mt-1" onClick={handleChangePassword}>
                  Update Password
                </Button>
              </div>
            </Section>

            {/* Browser Extension */}
            <Section icon={Download} title="Browser Extension" description="Install the LabelForge extension to capture screenshots and track activity during Agentic AI tasks.">
              <div className="flex gap-3 flex-wrap">
                <a
                  href={CHROME_EXTENSION_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/60 hover:border-muted-foreground/30 transition-all text-sm font-medium group"
                >
                  <Chrome className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  <span>Add to Chrome</span>
                  <Download className="h-3 w-3 text-muted-foreground ml-1 group-hover:text-foreground transition-colors" />
                </a>
              </div>
              <div className="mt-3 space-y-1">
                <p className="text-[10px] text-muted-foreground">Compatible with Chrome 88+</p>
                <ol className="text-[10px] text-muted-foreground space-y-0.5 list-decimal list-inside">
                  <li>Download the file above</li>
                  <li>Open <span className="font-mono">chrome://extensions</span> in Chrome</li>
                  <li>Enable <strong>Developer mode</strong> (top-right toggle)</li>
                  <li>Drag and drop the downloaded <span className="font-mono">.crx</span> file onto the page</li>
                  <li>To use in Incognito: click <strong>Details</strong> on the extension, then enable <strong>Allow in incognito</strong></li>
                </ol>
              </div>
            </Section>

          </div>
        </div>
      </main>
    </>
  )
}
