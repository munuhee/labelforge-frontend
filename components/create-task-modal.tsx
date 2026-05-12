"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Task, TaskStatus } from "@/lib/types"
import { useAuth } from "@/lib/auth-context"

interface CreateTaskModalProps {
  batchId: string
  batchTitle: string
  workflowId: string
  workflowName: string
  onTaskCreated: (task: Task) => void
}

export function CreateTaskModal({
  batchId,
  batchTitle,
  workflowId,
  workflowName,
  onTaskCreated,
}: CreateTaskModalProps) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [taskId, setTaskId] = useState("")
  const [instructions, setInstructions] = useState("")
  const [status, setStatus] = useState<TaskStatus>("unclaimed")
  const [duration, setDuration] = useState("15")
  const [externalUrl, setExternalUrl] = useState("")
  const [notes, setNotes] = useState("")

  const handleCreate = () => {
    if (!title.trim() || !taskId.trim()) {
      return
    }

    const newTask: Task = {
      id: taskId,
      tenantId: user?.tenantId ?? '',
      batchId,
      batchTitle,
      workflowId,
      workflowName,
      title,
      description: instructions || description,
      taskType: "agentic-ai",
      status,
      priority: 0.9,
      externalUrl: externalUrl || undefined,
      estimatedDuration: parseInt(duration) || 15,
      feedback: notes || undefined,
    }

    onTaskCreated(newTask)

    // Reset form
    setTitle("")
    setDescription("")
    setTaskId("")
    setInstructions("")
    setStatus("unclaimed")
    setDuration("15")
    setExternalUrl("")
    setNotes("")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Task
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Add a new task to the &quot;{batchTitle}&quot; batch
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Task ID */}
          <div className="space-y-2">
            <Label htmlFor="task-id">Task ID</Label>
            <Input
              id="task-id"
              placeholder="e.g., task_999"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
            />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              placeholder="e.g., Navigate e-commerce site"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea
              id="instructions"
              placeholder="Detailed task instructions..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as TaskStatus)}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unclaimed">Unclaimed</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Estimated Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">Est. Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              placeholder="15"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              min="5"
              max="180"
            />
          </div>

          {/* External URL */}
          <div className="space-y-2">
            <Label htmlFor="url">External URL</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://example.com"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!title.trim() || !taskId.trim()}
            >
              Create Task
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
