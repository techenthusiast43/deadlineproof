import { FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CalendarClock, Check, PlusCircle, Sparkles } from "lucide-react";
import { isAddress } from "viem";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { TxStatusBanner } from "../components/TxStatusBanner";
import { TARGET_CHAIN } from "../config/chains";
import { IS_CONTRACT_CONFIGURED } from "../config/contract";
import { useTaskActions } from "../hooks/useDeadlineProof";

function toLocalDatetimeValue(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function CreateTaskPage() {
  const { address, isConnected } = useAccount();
  const walletChainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { open } = useAppKit();
  const { createTask, feedback, clearFeedback, isPending } = useTaskActions();

  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [deadlineLocal, setDeadlineLocal] = useState(() =>
    toLocalDatetimeValue(Math.floor(Date.now() / 1000) + 24 * 3600)
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [createdTaskId, setCreatedTaskId] = useState<bigint | null>(null);

  const titleBytes = useMemo(() => new TextEncoder().encode(title.trim()).length, [title]);
  const wrongNetwork = isConnected && walletChainId !== TARGET_CHAIN.id;

  const applyPreset = (offsetSeconds: number) => {
    setDeadlineLocal(toLocalDatetimeValue(Math.floor(Date.now() / 1000) + offsetSeconds));
    setFormError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearFeedback();
    setCreatedTaskId(null);

    const trimmedTitle = title.trim();
    const trimmedAssignee = assignedTo.trim();

    if (!trimmedTitle) {
      setFormError("Please enter a short task title.");
      return;
    }
    if (titleBytes > 120) {
      setFormError("Task title must be 120 bytes or fewer.");
      return;
    }
    if (!isAddress(trimmedAssignee)) {
      setFormError("Please enter a valid EVM wallet address (0x...).");
      return;
    }
    if (trimmedAssignee === "0x0000000000000000000000000000000000000000") {
      setFormError("Assigned address cannot be the zero address.");
      return;
    }

    const parsedMs = Date.parse(deadlineLocal);
    if (Number.isNaN(parsedMs)) {
      setFormError("Please choose a valid deadline date and time.");
      return;
    }
    const deadlineSeconds = Math.floor(parsedMs / 1000);
    if (deadlineSeconds <= Math.floor(Date.now() / 1000)) {
      setFormError("Deadline must be in the future.");
      return;
    }

    const result = await createTask(trimmedAssignee as `0x${string}`, trimmedTitle, deadlineSeconds);
    if (result) {
      if (result.extra !== undefined) {
        setCreatedTaskId(result.extra);
      }
      setTitle("");
      setAssignedTo("");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition hover:text-cyan-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      <div className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-6 shadow-2xl backdrop-blur-md sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-50 sm:text-2xl">
              Create On-Chain Task
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Assign a deliverable to any EVM address with an immutable deadline on{" "}
              {TARGET_CHAIN.name}.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <TxStatusBanner feedback={feedback} onDismiss={clearFeedback} />

          {createdTaskId !== null && (
            <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              <span className="inline-flex items-center gap-2 font-medium">
                <Check className="h-4 w-4 text-emerald-400" />
                Task #{createdTaskId.toString()} created on-chain
              </span>
              <Link
                to={`/tasks/${createdTaskId.toString()}`}
                className="rounded-lg bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/30"
              >
                Open Task Details
              </Link>
            </div>
          )}

          {formError && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-200">
              {formError}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="task-title" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Task Title
              </label>
              <span
                className={`font-mono text-xs ${
                  titleBytes > 120 ? "text-rose-400" : "text-slate-500"
                }`}
              >
                {titleBytes} / 120 bytes
              </span>
            </div>
            <input
              id="task-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Deliver smart contract audit report"
              maxLength={140}
              className="mt-2 w-full rounded-xl border border-slate-700/80 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="assigned-to" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Assigned Wallet Address
              </label>
              {address && (
                <button
                  type="button"
                  onClick={() => setAssignedTo(address)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-cyan-400 hover:text-cyan-300"
                >
                  <Sparkles className="h-3 w-3" />
                  Assign to myself
                </button>
              )}
            </div>
            <input
              id="assigned-to"
              type="text"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              placeholder="0x..."
              className="mt-2 w-full rounded-xl border border-slate-700/80 bg-slate-950/80 px-4 py-3 font-mono text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>

          <div>
            <label htmlFor="deadline" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Deadline (Local Time)
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <CalendarClock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  id="deadline"
                  type="datetime-local"
                  value={deadlineLocal}
                  onChange={(e) => setDeadlineLocal(e.target.value)}
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-950/80 py-3 pl-10 pr-4 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {[
                { label: "+15 min", seconds: 900 },
                { label: "+1 hour", seconds: 3600 },
                { label: "+24 hours", seconds: 86400 },
                { label: "+7 days", seconds: 7 * 86400 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset.seconds)}
                  className="rounded-lg border border-slate-800 bg-slate-950/70 px-2.5 py-1 text-xs font-medium text-slate-400 transition hover:border-slate-700 hover:text-slate-200"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            {!isConnected ? (
              <button
                type="button"
                onClick={() => open()}
                className="w-full rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
              >
                Connect Wallet to Create Task
              </button>
            ) : wrongNetwork ? (
              <button
                type="button"
                onClick={() => switchChainAsync({ chainId: TARGET_CHAIN.id })}
                className="w-full rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
              >
                Switch Network to {TARGET_CHAIN.name}
              </button>
            ) : (
              <button
                type="submit"
                disabled={isPending || !IS_CONTRACT_CONFIGURED}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <PlusCircle className="h-4 w-4" />
                {isPending ? "Processing Transaction..." : "Create Task On-Chain"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

