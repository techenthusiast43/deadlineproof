export enum TaskStatus {
  Pending = 0,
  Submitted = 1,
  Verified = 2,
  Cancelled = 3,
  Overdue = 4,
}

export type TaskStatusFilter = "all" | TaskStatus;
export type TaskRoleFilter = "all" | "created" | "assigned";

export interface Task {
  id: bigint;
  creator: `0x${string}`;
  assignedTo: `0x${string}`;
  title: string;
  deadline: number;
  completedAt: number;
  status: TaskStatus;
}

export interface TxFeedback {
  state: "signing" | "confirming" | "success" | "error";
  action: string;
  txHash?: `0x${string}`;
  message: string;
}

export const STATUS_META: Record<
  TaskStatus,
  {
    label: string;
    badgeClass: string;
    dotClass: string;
    description: string;
  }
> = {
  [TaskStatus.Pending]: {
    label: "Pending",
    badgeClass: "bg-amber-500/10 text-amber-300 border-amber-500/25",
    dotClass: "bg-amber-400",
    description: "Awaiting completion submission before deadline",
  },
  [TaskStatus.Submitted]: {
    label: "Submitted",
    badgeClass: "bg-sky-500/10 text-sky-300 border-sky-500/25",
    dotClass: "bg-sky-400",
    description: "Completion submitted; waiting for creator verification",
  },
  [TaskStatus.Verified]: {
    label: "Verified",
    badgeClass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25",
    dotClass: "bg-emerald-400",
    description: "Verified on-chain by task creator",
  },
  [TaskStatus.Cancelled]: {
    label: "Cancelled",
    badgeClass: "bg-slate-500/15 text-slate-300 border-slate-500/30",
    dotClass: "bg-slate-400",
    description: "Cancelled by task creator",
  },
  [TaskStatus.Overdue]: {
    label: "Overdue",
    badgeClass: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    dotClass: "bg-rose-400",
    description: "Deadline passed without completion submission",
  },
};

/**
 * Computes the effective task status against the current time (or latest chain timestamp),
 * matching the on-chain calculation in DeadlineProof._buildTaskView.
 */
export function getEffectiveStatus(task: Task, nowSeconds: number): TaskStatus {
  if (task.status === TaskStatus.Pending && nowSeconds > task.deadline) {
    return TaskStatus.Overdue;
  }
  return task.status;
}

export function shortenAddress(address: string, chars = 4): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatTimestamp(unixSeconds: number): string {
  if (!unixSeconds) return "—";
  return new Date(unixSeconds * 1000).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTimeRemaining(deadlineSeconds: number, nowSeconds: number): string {
  const diff = deadlineSeconds - nowSeconds;
  const abs = Math.abs(diff);

  const days = Math.floor(abs / 86400);
  const hours = Math.floor((abs % 86400) / 3600);
  const minutes = Math.floor((abs % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (days === 0 && minutes > 0) parts.push(`${minutes}m`);
  if (parts.length === 0) parts.push(`${abs % 60}s`);

  return diff >= 0 ? `${parts.join(" ")} left` : `${parts.join(" ")} overdue`;
}

