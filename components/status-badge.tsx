import { Badge } from "@/components/ui/badge"
import type { BatchStatus, TaskStatus, Priority } from "@/lib/types"
import { priorityToLabel, priorityToColor } from "@/lib/types"

interface StatusBadgeProps {
  status: BatchStatus | TaskStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusStyles = () => {
    switch (status) {
      case "available":
        return "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
      case "in-progress":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20"
      case "completed":
      case "approved":
        return "bg-success/10 text-success border-success/20 hover:bg-success/20"
      case "pending-review":
      case "submitted":
        return "bg-warning/10 text-warning border-warning/20 hover:bg-warning/20"
      case "rejected":
        return "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
      case "revision-requested":
        return "bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20"
      case "paused":
        return "bg-muted text-muted-foreground border-border hover:bg-muted/80"
      case "unclaimed":
        return "bg-secondary text-secondary-foreground border-border hover:bg-secondary/80"
      default:
        return "bg-secondary text-secondary-foreground border-border hover:bg-secondary/80"
    }
  }

  const formatStatus = (s: string) => {
    return s.split("-").map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ")
  }

  return (
    <Badge
      variant="outline"
      className={`${getStatusStyles()} ${className || ""}`}
    >
      {formatStatus(status)}
    </Badge>
  )
}

interface PriorityBadgeProps {
  priority: Priority
  className?: string
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const label = priorityToLabel(priority)
  const colorClass = priorityToColor(priority)

  return (
    <Badge
      className={`${colorClass} ${className || ""}`}
    >
      {label}
    </Badge>
  )
}

interface TaskTypeBadgeProps {
  type: string
  className?: string
}

export function TaskTypeBadge({ type, className }: TaskTypeBadgeProps) {
  const formatType = (t: string) => {
    return t.split("-").map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ")
  }

  return (
    <Badge
      variant="secondary"
      className={`bg-accent/50 text-accent-foreground border-0 ${className || ""}`}
    >
      {formatType(type)}
    </Badge>
  )
}
