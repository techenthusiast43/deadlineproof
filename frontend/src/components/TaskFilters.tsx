import { TaskRoleFilter, TaskStatus, TaskStatusFilter } from "../types/task";

interface TaskFiltersProps {
  statusFilter: TaskStatusFilter;
  onStatusChange: (status: TaskStatusFilter) => void;
  roleFilter: TaskRoleFilter;
  onRoleChange: (role: TaskRoleFilter) => void;
  statusCounts: Record<TaskStatusFilter, number>;
}

const STATUS_OPTIONS: Array<{ value: TaskStatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: TaskStatus.Pending, label: "Pending" },
  { value: TaskStatus.Submitted, label: "Submitted" },
  { value: TaskStatus.Verified, label: "Verified" },
  { value: TaskStatus.Overdue, label: "Overdue" },
  { value: TaskStatus.Cancelled, label: "Cancelled" },
];

const ROLE_OPTIONS: Array<{ value: TaskRoleFilter; label: string }> = [
  { value: "all", label: "All Roles" },
  { value: "created", label: "Created by Me" },
  { value: "assigned", label: "Assigned to Me" },
];

export function TaskFilters({
  statusFilter,
  onStatusChange,
  roleFilter,
  onRoleChange,
  statusCounts,
}: TaskFiltersProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Filter by task status">
        {STATUS_OPTIONS.map((option) => {
          const active = statusFilter === option.value;
          const count = statusCounts[option.value] ?? 0;

          return (
            <button
              key={String(option.value)}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onStatusChange(option.value)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? "bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/40"
                  : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
              }`}
            >
              <span>{option.label}</span>
              <span
                className={`rounded-md px-1.5 py-0.5 text-[11px] ${
                  active ? "bg-cyan-500/20 text-cyan-200" : "bg-slate-800 text-slate-400"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5 self-start lg:self-auto" role="group" aria-label="Filter by role">
        {ROLE_OPTIONS.map((option) => {
          const active = roleFilter === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onRoleChange(option.value)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? "bg-slate-800 text-slate-100 ring-1 ring-slate-600"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

