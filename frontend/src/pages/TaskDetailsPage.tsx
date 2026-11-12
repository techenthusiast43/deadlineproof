import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Send,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { StatusBadge } from "../components/StatusBadge";
import { TxStatusBanner } from "../components/TxStatusBanner";
import { TARGET_CHAIN, getAddressExplorerUrl } from "../config/chains";
import { IS_CONTRACT_CONFIGURED, parseContractError } from "../config/contract";
import {
  useChainNowSeconds,
  useTaskActions,
  useTaskDetails,
} from "../hooks/useDeadlineProof";
import {
  STATUS_META,
  TaskStatus,
  formatTimeRemaining,
  formatTimestamp,
  getEffectiveStatus,
} from "../types/task";

export function TaskDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const parsedId = useMemo(() => {
    if (!id || !/^\d+$/.test(id)) return undefined;
    const n = BigInt(id);
    return n > 0n ? n : undefined;
  }, [id]);

  const { address, isConnected } = useAccount();
  const walletChainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { open } = useAppKit();

  const { task, isLoading, isFetching, error, refetch } = useTaskDetails(parsedId);
  const { nowSeconds, syncChainTime } = useChainNowSeconds();
  const {
    feedback,
    clearFeedback,
    isPending,
    submitCompletion,
    verifyCompletion,
    cancelTask,
  } = useTaskActions();

  if (parsedId === undefined) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-center text-rose-100">
        <p className="text-base font-semibold">Invalid Task ID</p>
        <Link
          to="/"
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-cyan-300 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const effectiveStatus = task ? getEffectiveStatus(task, nowSeconds) : null;
  const normalized = address?.toLowerCase();
  const isCreator = Boolean(task && normalized === task.creator.toLowerCase());
  const isAssignee = Boolean(task && normalized === task.assignedTo.toLowerCase());
  const wrongNetwork = isConnected && walletChainId !== TARGET_CHAIN.id;

  const canSubmit =
    Boolean(task && isAssignee && effectiveStatus === TaskStatus.Pending);
  const canVerify =
    Boolean(task && isCreator && effectiveStatus === TaskStatus.Submitted);
  const canCancel = Boolean(
    task &&
      isCreator &&
      effectiveStatus !== TaskStatus.Verified &&
      effectiveStatus !== TaskStatus.Cancelled
  );

  const handleAction = async (fn: (taskId: bigint) => Promise<unknown>) => {
    const res = await fn(parsedId);
    if (res) {
      await Promise.all([refetch(), syncChainTime()]);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition hover:text-cyan-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <button
          type="button"
          onClick={() => Promise.all([refetch(), syncChainTime()])}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Sync Chain State
        </button>
      </div>

      <TxStatusBanner feedback={feedback} onDismiss={clearFeedback} />

      {!IS_CONTRACT_CONFIGURED ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm text-amber-100">
          Contract address is not configured yet. Deploy DeadlineProof first.
        </div>
      ) : isLoading ? (
        <div className="h-72 animate-pulse rounded-3xl border border-slate-800 bg-slate-900/60" />
      ) : error || !task || effectiveStatus === null ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-100">
          <p className="font-semibold">Could not load Task #{parsedId.toString()}</p>
          <p className="mt-1 text-xs text-rose-200/80">
            {error ? parseContractError(error) : "Task not found on-chain."}
          </p>
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-6 shadow-2xl backdrop-blur-md sm:p-8 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800/80 pb-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="rounded-lg bg-slate-800 px-2.5 py-1 font-mono text-xs text-slate-300">
                  Task #{task.id.toString()}
                </span>
                <StatusBadge status={effectiveStatus} size="md" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-50 sm:text-2xl">
                {task.title}
              </h1>
              <p className="text-xs text-slate-400">
                {STATUS_META[effectiveStatus].description}
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Creator Address
              </dt>
              <dd className="mt-1.5 flex items-center justify-between gap-2">
                <a
                  href={getAddressExplorerUrl(task.creator)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-xs text-slate-200 break-all hover:text-cyan-300"
                >
                  {task.creator}
                  <ExternalLink className="h-3 w-3 shrink-0 text-slate-500" />
                </a>
                {isCreator && (
                  <span className="shrink-0 rounded-md bg-indigo-500/15 px-2 py-0.5 text-[11px] font-medium text-indigo-300">
                    You
                  </span>
                )}
              </dd>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Assigned Wallet
              </dt>
              <dd className="mt-1.5 flex items-center justify-between gap-2">
                <a
                  href={getAddressExplorerUrl(task.assignedTo)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-xs text-slate-200 break-all hover:text-cyan-300"
                >
                  {task.assignedTo}
                  <ExternalLink className="h-3 w-3 shrink-0 text-slate-500" />
                </a>
                {isAssignee && (
                  <span className="shrink-0 rounded-md bg-cyan-500/15 px-2 py-0.5 text-[11px] font-medium text-cyan-300">
                    You
                  </span>
                )}
              </dd>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
              <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
                <CalendarClock className="h-3.5 w-3.5" />
                Deadline Timestamp
              </dt>
              <dd className="mt-1.5 text-sm font-medium text-slate-100">
                {formatTimestamp(task.deadline)}
              </dd>
              {(effectiveStatus === TaskStatus.Pending || effectiveStatus === TaskStatus.Overdue) && (
                <p
                  className={`mt-1 text-xs font-medium ${
                    effectiveStatus === TaskStatus.Overdue ? "text-rose-400" : "text-cyan-300"
                  }`}
                >
                  {formatTimeRemaining(task.deadline, nowSeconds)}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
              <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Completion Timestamp
              </dt>
              <dd className="mt-1.5 text-sm font-medium text-slate-100">
                {task.completedAt > 0 ? formatTimestamp(task.completedAt) : "Not yet submitted"}
              </dd>
            </div>
          </dl>

          {/* Action Panel */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-200">On-Chain Actions</h2>

            {!isConnected ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-400">
                  Connect the creator or assigned wallet to execute task actions.
                </p>
                <button
                  type="button"
                  onClick={() => open()}
                  className="rounded-xl bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
                >
                  Connect Wallet
                </button>
              </div>
            ) : wrongNetwork ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-amber-300">
                  Switch your wallet to {TARGET_CHAIN.name} (Chain ID {TARGET_CHAIN.id}) to sign actions.
                </p>
                <button
                  type="button"
                  onClick={() => switchChainAsync({ chainId: TARGET_CHAIN.id })}
                  className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400"
                >
                  Switch to {TARGET_CHAIN.name}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={!canSubmit || isPending}
                    onClick={() => handleAction(submitCompletion)}
                    className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Submit Completion
                  </button>

                  <button
                    type="button"
                    disabled={!canVerify || isPending}
                    onClick={() => handleAction(verifyCompletion)}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Verify Completion
                  </button>

                  <button
                    type="button"
                    disabled={!canCancel || isPending}
                    onClick={() => handleAction(cancelTask)}
                    className="inline-flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/15 px-4 py-2.5 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900 disabled:text-slate-500"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Cancel Task
                  </button>
                </div>

                {effectiveStatus === TaskStatus.Overdue && isAssignee && (
                  <p className="inline-flex items-center gap-1.5 text-xs text-rose-300">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Deadline has passed; completion submissions are blocked by the contract.
                  </p>
                )}

                {!isCreator && !isAssignee && (
                  <p className="text-xs text-slate-400">
                    Your connected wallet is neither the creator nor the assignee of this task.
                  </p>
                )}

                {(effectiveStatus === TaskStatus.Verified ||
                  effectiveStatus === TaskStatus.Cancelled) && (
                  <p className="text-xs text-slate-400">
                    This task is finalized ({STATUS_META[effectiveStatus].label}) and can no longer be modified.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

