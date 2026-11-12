import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Inbox, Plus, RefreshCw, ShieldAlert, Wallet } from "lucide-react";
import { useAccount } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { CONTRACT_ADDRESS, IS_CONTRACT_CONFIGURED } from "../config/contract";
import { TARGET_CHAIN, getAddressExplorerUrl } from "../config/chains";
import { DashboardCounts, StatsGrid } from "../components/StatsGrid";
import { TaskCard } from "../components/TaskCard";
import { TaskFilters } from "../components/TaskFilters";
import { useChainNowSeconds, useMyTasks } from "../hooks/useDeadlineProof";
import {
  TaskRoleFilter,
  TaskStatus,
  TaskStatusFilter,
  getEffectiveStatus,
} from "../types/task";

export function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { open } = useAppKit();
  const { tasks, isLoading, isFetching, error, refetch } = useMyTasks();
  const { nowSeconds, syncChainTime } = useChainNowSeconds();

  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>("all");
  const [roleFilter, setRoleFilter] = useState<TaskRoleFilter>("all");

  const { counts, statusCounts, filteredTasks } = useMemo(() => {
    const countsAcc: DashboardCounts = {
      total: 0,
      pending: 0,
      submitted: 0,
      verified: 0,
      overdue: 0,
    };

    const byStatus: Record<TaskStatusFilter, number> = {
      all: 0,
      [TaskStatus.Pending]: 0,
      [TaskStatus.Submitted]: 0,
      [TaskStatus.Verified]: 0,
      [TaskStatus.Cancelled]: 0,
      [TaskStatus.Overdue]: 0,
    };

    const normalized = address?.toLowerCase();

    const roleMatched = tasks.filter((task) => {
      if (roleFilter === "created") return task.creator.toLowerCase() === normalized;
      if (roleFilter === "assigned") return task.assignedTo.toLowerCase() === normalized;
      return true;
    });

    for (const task of tasks) {
      const effective = getEffectiveStatus(task, nowSeconds);
      countsAcc.total += 1;
      if (effective === TaskStatus.Pending) countsAcc.pending += 1;
      else if (effective === TaskStatus.Submitted) countsAcc.submitted += 1;
      else if (effective === TaskStatus.Verified) countsAcc.verified += 1;
      else if (effective === TaskStatus.Overdue) countsAcc.overdue += 1;
    }

    for (const task of roleMatched) {
      const effective = getEffectiveStatus(task, nowSeconds);
      byStatus.all += 1;
      byStatus[effective] += 1;
    }

    const filtered = roleMatched.filter((task) => {
      if (statusFilter === "all") return true;
      return getEffectiveStatus(task, nowSeconds) === statusFilter;
    });

    return {
      counts: countsAcc,
      statusCounts: byStatus,
      filteredTasks: filtered,
    };
  }, [address, nowSeconds, roleFilter, statusFilter, tasks]);

  const handleRefresh = async () => {
    await Promise.all([refetch(), syncChainTime()]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
            {TARGET_CHAIN.name} · Chain ID {TARGET_CHAIN.id}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
            Task Accountability Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Track on-chain commitments, completion claims, and dynamic deadlines in real time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isConnected && (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isFetching}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </button>
          )}
          <Link
            to="/create"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:brightness-110"
          >
            <Plus className="h-4 w-4" />
            Create Task
          </Link>
        </div>
      </div>

      {!IS_CONTRACT_CONFIGURED && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div>
            <p className="font-semibold">Contract address not configured</p>
            <p className="mt-0.5 text-xs text-amber-200/80">
              Deploy <code className="font-mono">DeadlineProof.sol</code> with{" "}
              <code className="font-mono">npm run deploy:testnet</code> (which updates{" "}
              <code className="font-mono">frontend/src/config/deployment.json</code>) or set{" "}
              <code className="font-mono">VITE_CONTRACT_ADDRESS</code> in{" "}
              <code className="font-mono">frontend/.env</code>.
            </p>
          </div>
        </div>
      )}

      {IS_CONTRACT_CONFIGURED && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800/70 bg-slate-900/40 px-4 py-2.5 text-xs text-slate-400">
          <span>
            Contract:{" "}
            <a
              href={getAddressExplorerUrl(CONTRACT_ADDRESS)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-cyan-300 hover:underline"
            >
              {CONTRACT_ADDRESS}
            </a>
          </span>
          <span>Overdue statuses update live from chain timestamp</span>
        </div>
      )}

      <StatsGrid counts={counts} />

      {!isConnected ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/25 bg-cyan-500/10 text-cyan-400">
            <Wallet className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-100">
            Connect your wallet to load your tasks
          </h2>
          <p className="mt-1.5 max-w-md text-sm text-slate-400">
            Connect a wallet on {TARGET_CHAIN.name} to view tasks you created or were assigned,
            submit completion proofs, and verify deliverables.
          </p>
          <button
            type="button"
            onClick={() => open()}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            <Wallet className="h-4 w-4" />
            Connect Wallet
          </button>
        </div>
      ) : (
        <>
          <TaskFilters
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            roleFilter={roleFilter}
            onRoleChange={setRoleFilter}
            statusCounts={statusCounts}
          />

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
              <div>
                <p className="font-semibold">Failed to load tasks from BOT Chain</p>
                <p className="mt-0.5 text-xs text-rose-200/80">{error.message}</p>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-2xl border border-slate-800/80 bg-slate-900/50"
                />
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800/80 bg-slate-900/40 px-6 py-14 text-center">
              <Inbox className="h-9 w-9 text-slate-500" />
              <h3 className="mt-3 text-base font-semibold text-slate-200">
                {tasks.length === 0 ? "No tasks yet" : "No tasks match the active filter"}
              </h3>
              <p className="mt-1 max-w-sm text-xs text-slate-400">
                {tasks.length === 0
                  ? "Create your first deadline-backed task to start tracking commitments on-chain."
                  : "Try selecting a different status or role filter above."}
              </p>
              {tasks.length === 0 && (
                <Link
                  to="/create"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-800 px-4 py-2 text-xs font-medium text-cyan-300 ring-1 ring-slate-700 hover:bg-slate-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create First Task
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => (
                <TaskCard
                  key={task.id.toString()}
                  task={task}
                  currentAddress={address}
                  nowSeconds={nowSeconds}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

