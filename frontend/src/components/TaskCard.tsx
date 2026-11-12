import { ArrowRight, CalendarClock, UserCheck, UserPen } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Task,
  TaskStatus,
  formatTimeRemaining,
  formatTimestamp,
  getEffectiveStatus,
  shortenAddress,
} from "../types/task";
import { StatusBadge } from "./StatusBadge";

interface TaskCardProps {
  task: Task;
  currentAddress?: `0x${string}`;
  nowSeconds: number;
}

export function TaskCard({ task, currentAddress, nowSeconds }: TaskCardProps) {
  const effectiveStatus = getEffectiveStatus(task, nowSeconds);
  const normalized = currentAddress?.toLowerCase();
  const isCreator = normalized === task.creator.toLowerCase();
  const isAssignee = normalized === task.assignedTo.toLowerCase();

  return (
    <Link
      to={`/tasks/${task.id.toString()}`}
      className="group block rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 transition hover:border-cyan-500/40 hover:bg-slate-900/90"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-slate-500">#{task.id.toString()}</span>
            <StatusBadge status={effectiveStatus} />
            {isCreator && (
              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-500/10 px-2 py-0.5 text-[11px] font-medium text-indigo-300 border border-indigo-500/20">
                <UserPen className="h-3 w-3" />
                Creator
              </span>
            )}
            {isAssignee && (
              <span className="inline-flex items-center gap-1 rounded-md bg-cyan-500/10 px-2 py-0.5 text-[11px] font-medium text-cyan-300 border border-cyan-500/20">
                <UserCheck className="h-3 w-3" />
                Assignee
              </span>
            )}
          </div>

          <h3 className="text-base font-semibold text-slate-100 group-hover:text-cyan-300 transition truncate">
            {task.title}
          </h3>
        </div>

        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 group-hover:text-cyan-300 transition">
          Details
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 border-t border-slate-800/80 pt-3 text-xs text-slate-400 sm:grid-cols-3">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500">Creator:</span>
          <span className="font-mono text-slate-300">{shortenAddress(task.creator)}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-500">Assignee:</span>
          <span className="font-mono text-slate-300">{shortenAddress(task.assignedTo)}</span>
        </div>

        <div className="flex items-center gap-1.5 sm:justify-end">
          <CalendarClock className="h-3.5 w-3.5 text-slate-500" />
          <span>{formatTimestamp(task.deadline)}</span>
          {(effectiveStatus === TaskStatus.Pending || effectiveStatus === TaskStatus.Overdue) && (
            <span
              className={`font-medium ${
                effectiveStatus === TaskStatus.Overdue ? "text-rose-400" : "text-cyan-300"
              }`}
            >
              ({formatTimeRemaining(task.deadline, nowSeconds)})
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

