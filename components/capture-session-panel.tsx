'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Plus, X, Play, Square, CheckCircle, HelpCircle,
  Radio, AlertCircle, ShieldAlert, ExternalLink
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
type StepStatus = 'pending' | 'done' | 'uncertain'
interface Step { text: string; status: StepStatus }
interface LiveSession {
  id: string
  taskDescription: string
  startTime: string
  status: 'active' | 'completed'
  eventCount: number
  screenshotCount: number
  steps: Step[]
}

// ─── postMessage tokens (must match content.js) ───────────────────────────────
const TO_EXT   = 'lf:page→ext'
const FROM_EXT = 'lf:ext→page'
function sendToExt(msg: object) {
  window.postMessage({ _lf: TO_EXT, ...msg }, '*')
}

// ─── Component ────────────────────────────────────────────────────────────────
export function CaptureSessionPanel({
  defaultTask = '',
  defaultSteps = []
}: {
  defaultTask?: string
  defaultSteps?: string[]
}) {
  // null = still checking, false = not installed
  const [extReady, setExtReady]             = useState<boolean | null>(null)
  const [incognitoAllowed, setIncognito]    = useState<boolean | null>(null)
  const [session, setSession]               = useState<LiveSession | null>(null)
  const [task, setTask]                     = useState(defaultTask)
  const [steps, setSteps]                   = useState<Step[]>(
    defaultSteps.map((t) => ({ text: t, status: 'pending' }))
  )
  const [newStep, setNewStep]               = useState('')
  const [starting, setStarting]             = useState(false)
  const [startError, setStartError]         = useState<string | null>(null)
  const [elapsed, setElapsed]               = useState('0:00')
  const pingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Listen for extension replies ──────────────────────────────────────────
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?._lf !== FROM_EXT) return
      const msg = e.data

      switch (msg.type) {
        case 'pong':
          setExtReady(true)
          setIncognito(msg.incognitoAllowed ?? null)
          if (msg.session?.status === 'active') setSession(msg.session)
          break
        case 'session_update':
          setSession(msg.session ?? null)
          setStarting(false)
          break
        case 'start_error':
          setStartError(msg.message || 'Failed to start session.')
          setStarting(false)
          break
        case 'steps_updated':
          setSession((prev) => prev ? { ...prev, steps: msg.steps } : prev)
          break
      }
    }

    window.addEventListener('message', onMessage)

    // Ping; if no pong within 1.5 s → extension not installed
    sendToExt({ type: 'ping' })
    pingTimer.current = setTimeout(() => {
      setExtReady((v) => (v === null ? false : v))
    }, 1500)

    return () => {
      window.removeEventListener('message', onMessage)
      if (pingTimer.current) clearTimeout(pingTimer.current)
    }
  }, [])

  // ── Duration ticker ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!session?.startTime) return
    const t0 = new Date(session.startTime).getTime()
    const id = setInterval(() => {
      const s = Math.floor((Date.now() - t0) / 1000)
      setElapsed(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`)
    }, 1000)
    return () => clearInterval(id)
  }, [session?.startTime])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const addStep = useCallback(() => {
    const t = newStep.trim()
    if (!t) return
    setSteps((prev) => [...prev, { text: t, status: 'pending' }])
    setNewStep('')
  }, [newStep])

  function startSession() {
    const pendingText = newStep.trim()
    const allSteps = pendingText
      ? [...steps, { text: pendingText, status: 'pending' as StepStatus }]
      : steps
    if (pendingText) { setSteps(allSteps); setNewStep('') }

    setStartError(null)
    setStarting(true)
    sendToExt({ type: 'start_session', taskDescription: task, steps: allSteps.map((s) => s.text) })
  }

  function stopSession() { sendToExt({ type: 'stop_session' }) }

  function updateStep(i: number, current: StepStatus, next: StepStatus) {
    sendToExt({ type: 'update_step', index: i, status: current === next ? 'pending' : next })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Still checking
  if (extReady === null) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <span className="w-4 h-4 border-2 border-muted-foreground/40 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          Checking for LabelForge Capture extension…
        </CardContent>
      </Card>
    )
  }

  // Extension not installed
  if (!extReady) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="flex items-start gap-3 p-4">
          <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm space-y-1">
            <p className="font-semibold text-foreground">LabelForge Capture extension not detected</p>
            <p className="text-muted-foreground">
              Load the <code className="text-xs bg-muted px-1 py-0.5 rounded">chrome-extension/</code> folder
              in Chrome → <strong>Developer mode → Load unpacked</strong>, then reload this page.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Extension installed but incognito not enabled
  if (incognitoAllowed === false) {
    return (
      <Card className="border-red-500/30 bg-red-500/5">
        <CardContent className="flex items-start gap-3 p-4">
          <ShieldAlert className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm space-y-2">
            <p className="font-semibold text-foreground">Incognito access required</p>
            <p className="text-muted-foreground leading-relaxed">
              Sessions open in an incognito window to keep captures clean.
              You need to allow the extension in incognito mode first:
            </p>
            <ol className="text-muted-foreground space-y-1 list-decimal list-inside text-xs">
              <li>Open <strong>chrome://extensions</strong> in a new tab</li>
              <li>Find <strong>LabelForge Capture</strong> and click <strong>Details</strong></li>
              <li>Toggle <strong>Allow in Incognito</strong> to ON</li>
              <li>Come back here and reload this page</li>
            </ol>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs mt-1"
              onClick={() => window.open('chrome://extensions', '_blank')}
            >
              <ExternalLink className="w-3 h-3" />
              Open chrome://extensions
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Active session
  if (session?.status === 'active') {
    const doneCount  = session.steps?.filter((s) => s.status === 'done').length ?? 0
    const totalSteps = session.steps?.length ?? 0

    return (
      <Card className="border-green-500/40 bg-green-500/5">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Capture Session</CardTitle>
            <Badge variant="outline" className="text-green-500 border-green-500/40 gap-1.5 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
              Recording
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{session.taskDescription}</p>
        </CardHeader>

        <CardContent className="px-4 pb-4 space-y-3">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { val: session.eventCount,      label: 'Events' },
              { val: session.screenshotCount, label: 'Screenshots' },
              { val: elapsed,                 label: 'Duration' }
            ].map((s) => (
              <div key={s.label} className="bg-background rounded-md p-2 text-center border">
                <div className="text-base font-bold text-blue-500">{s.val}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Steps */}
          {totalSteps > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                  Instructions
                </p>
                <span className="text-[10px] text-muted-foreground">{doneCount}/{totalSteps} done</span>
              </div>

              {session.steps.map((step, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 rounded-md px-2.5 py-2 text-sm border transition-colors ${
                    step.status === 'done'
                      ? 'bg-green-500/10 border-green-500/20 text-muted-foreground'
                      : step.status === 'uncertain'
                      ? 'bg-amber-500/10 border-amber-500/20'
                      : 'bg-background border-border'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex-shrink-0 flex items-center justify-center mt-0.5 ${
                    step.status === 'done' ? 'bg-green-500 text-white'
                    : step.status === 'uncertain' ? 'bg-amber-500 text-white'
                    : 'bg-muted text-muted-foreground'
                  }`}>
                    {i + 1}
                  </span>
                  <span className={`flex-1 leading-snug ${step.status === 'done' ? 'line-through' : ''}`}>
                    {step.text}
                  </span>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      title="Mark complete"
                      onClick={() => updateStep(i, step.status, 'done')}
                      className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${
                        step.status === 'done'
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-border text-muted-foreground hover:bg-green-500 hover:border-green-500 hover:text-white'
                      }`}
                    >
                      <CheckCircle className="w-3 h-3" />
                    </button>
                    <button
                      title="Mark uncertain"
                      onClick={() => updateStep(i, step.status, 'uncertain')}
                      className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${
                        step.status === 'uncertain'
                          ? 'bg-amber-500 border-amber-500 text-white'
                          : 'border-border text-muted-foreground hover:bg-amber-500 hover:border-amber-500 hover:text-white'
                      }`}
                    >
                      <HelpCircle className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button variant="destructive" size="sm" className="w-full" onClick={stopSession}>
            <Square className="w-3.5 h-3.5 mr-2" /> Stop Session
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Idle — build a session
  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-blue-500" />
          <CardTitle className="text-sm font-semibold">Start Capture Session</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-3">
        {startError && (
          <div className="flex items-start gap-2 text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-md p-2.5">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            {startError}
          </div>
        )}

        <Input
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="Describe the task you are capturing…"
          className="text-sm"
        />

        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
            Task Steps <span className="normal-case text-muted-foreground/60 ml-1">(optional)</span>
          </p>

          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                {i + 1}
              </span>
              <span className="flex-1 text-sm">{step.text}</span>
              <button onClick={() => setSteps((p) => p.filter((_, idx) => idx !== i))}
                className="text-muted-foreground hover:text-destructive transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          <div className="flex gap-2">
            <Input
              value={newStep}
              onChange={(e) => setNewStep(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addStep()}
              placeholder="Add a step and press Enter…"
              className="text-sm h-8"
            />
            <Button size="sm" variant="outline" onClick={addStep} className="h-8 px-2 flex-shrink-0">
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <Button className="w-full" size="sm" onClick={startSession} disabled={starting}>
          <Play className="w-3.5 h-3.5 mr-2" />
          {starting ? 'Opening incognito window…' : 'Start Session'}
        </Button>
      </CardContent>
    </Card>
  )
}
