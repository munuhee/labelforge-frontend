'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Info, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/theme-toggle'

type UserRole = 'annotator' | 'reviewer' | 'reviewer_annotator'

interface Task {
  id: string
  title: string
  status: string
  feedback?: string
  timestamp: string
}

interface RoleContent {
  title: string
  subtitle: string
  reRequestedTitle: string
  reRequestedDescription: string
  currentTasksTitle: string
  currentTasksDescription: string
  statsTitle: string
  statsDescription: string
  taskType: string
  actionButton: string
}

const roleContent: Record<UserRole, RoleContent> = {
  annotator: {
    title: 'My Tasks',
    subtitle: 'Your current labelling work',
    reRequestedTitle: 'Re-requested',
    reRequestedDescription: 'Reviewers have requested changes to these labelling tasks.',
    currentTasksTitle: 'Current Tasks',
    currentTasksDescription: 'Continue your labelling work or pick up something new.',
    statsTitle: 'Your stats',
    statsDescription: 'A snapshot of your activity in this organization.',
    taskType: 'Labelling',
    actionButton: 'Labelling'
  },
  reviewer: {
    title: 'Review Queue',
    subtitle: 'Tasks awaiting your review',
    reRequestedTitle: 'Flagged Reviews',
    reRequestedDescription: 'These reviews need additional attention.',
    currentTasksTitle: 'Pending Reviews',
    currentTasksDescription: 'Review submitted annotations or pick up new tasks.',
    statsTitle: 'Review Stats',
    statsDescription: 'Your review performance metrics.',
    taskType: 'Review',
    actionButton: 'Review'
  },
  reviewer_annotator: {
    title: 'My Work',
    subtitle: 'Your labelling and review tasks',
    reRequestedTitle: 'Action Required',
    reRequestedDescription: 'Tasks that need your immediate attention.',
    currentTasksTitle: 'Active Tasks',
    currentTasksDescription: 'Continue your work across labelling and review.',
    statsTitle: 'Performance',
    statsDescription: 'Your complete activity overview.',
    taskType: 'Task',
    actionButton: 'Continue'
  }
}

const mockTasks: Task[] = [
  {
    id: '0f883a14-183a-4cd0-bd16-ab56be8dfb3e',
    title: 'Labelling Task (annotations)',
    status: 'Re-requested with feedback',
    feedback: 'describe pose and add orange flowers also in the bg with candle light',
    timestamp: '1 hour ago'
  }
]

const mockStats = [
  { name: 'Tasks labelled', value: '244' },
  { name: 'Tasks reviewed', value: '156' },
  { name: 'Tasks skipped', value: '12' },
  { name: 'Acceptance rate as labeller', value: '94%' },
  { name: 'Acceptance rate as reviewer', value: '89%' },
  { name: 'Skip rate', value: '3%' }
]

export function TaskDashboard({ role = 'annotator' }: { role?: UserRole }) {
  const [reRequestedCount] = useState(1)
  const content = roleContent[role]

  return (
    <div className="min-h-screen bg-background">
      {/* Header with navigation and theme toggle */}
      <div className="w-full p-4 border-b">
        <div className="flex items-center justify-between w-full">
          <Link 
            href="/dashboard" 
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
          <ThemeToggle />
        </div>
      </div>

      <div className="w-full p-4 space-y-6">
        {/* Page Header */}
        <div className="w-full">
          <h1 className="text-3xl font-bold text-foreground mb-2">{content.title}</h1>
          <p className="text-muted-foreground">{content.subtitle}</p>
        </div>

        {/* Re-requested Section */}
        <div className="w-full">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-destructive">
                {content.reRequestedTitle} ({reRequestedCount})
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {content.reRequestedDescription}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {mockTasks.map((task) => (
              <Card key={task.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-2">
                        {task.title}
                      </h3>
                      <p className="text-sm font-mono text-muted-foreground mb-2">
                        {task.id}
                      </p>
                      <p className="text-sm text-muted-foreground mb-3">
                        {task.status} {task.timestamp}
                      </p>
                      {task.feedback && (
                        <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                          <ArrowRight className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-muted-foreground italic">
                            {task.feedback}
                          </p>
                        </div>
                      )}
                    </div>
                    <Button className="ml-4">
                      {content.actionButton}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Current Tasks Section */}
        <div className="w-full">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {content.currentTasksTitle}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {content.currentTasksDescription}
              </p>
            </div>
            <Button variant="outline">
              Get New Task
            </Button>
          </div>

          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">
                No {content.taskType.toLowerCase()} tasks right now.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Stats Section */}
        <div className="w-full">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-foreground">
              {content.statsTitle}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {content.statsDescription}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {mockStats.map((stat) => (
              <Card key={stat.name}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-muted-foreground">{stat.name}</span>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <p className="text-xl font-bold text-foreground">{stat.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
