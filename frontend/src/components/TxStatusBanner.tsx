import { AlertCircle, CheckCircle2, ExternalLink, Loader2, X } from "lucide-react";
import { getTxExplorerUrl } from "../config/chains";
import type { TxFeedback } from "../types/task";

interface TxStatusBannerProps {
  feedback: TxFeedback | null;
  onDismiss?: () => void;
}

export function TxStatusBanner({ feedback, onDismiss }: TxStatusBannerProps) {
  if (!feedback) return null;

  const isLoading = feedback.state === "signing" || feedback.state === "confirming";
  const isSuccess = feedback.state === "success";
  const isError = feedback.state === "error";

  const containerStyle = isLoading
    ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-100"
    : isSuccess
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
      : "border-rose-500/30 bg-rose-500/10 text-rose-100";

  return (
    <div
      role="status"
      className={`flex items-start justify-between gap-4 rounded-xl border p-4 backdrop-blur-sm ${containerStyle}`}
    >
      <div className="flex items-start gap-3 min-w-0">
        {isLoading && <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-cyan-400" />}
        {isSuccess && <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />}
        {isError && <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />}

        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold">
            {feedback.action}:{" "}
            <span className="font-normal opacity-90">{feedback.message}</span>
          </p>

          {feedback.txHash && (
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
              <span className="font-mono text-slate-300 break-all">
                Tx: {feedback.txHash}
              </span>
              <a
                href={getTxExplorerUrl(feedback.txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-cyan-300 underline decoration-cyan-500/40 underline-offset-4 hover:text-cyan-200"
              >
                View on BOTScan
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}
        </div>
      </div>

      {onDismiss && !isLoading && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="rounded-lg p-1 text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

