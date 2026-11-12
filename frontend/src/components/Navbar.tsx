import { FormEvent, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { AlertTriangle, Clock3, Search, Wallet } from "lucide-react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { TARGET_CHAIN } from "../config/chains";
import { shortenAddress } from "../types/task";

export function Navbar() {
  const { address, isConnected } = useAccount();
  const walletChainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { open } = useAppKit();
  const navigate = useNavigate();

  const [lookupId, setLookupId] = useState("");
  const wrongNetwork = isConnected && walletChainId !== TARGET_CHAIN.id;

  const handleLookup = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = lookupId.trim();
    if (/^\d+$/.test(cleaned) && Number(cleaned) > 0) {
      navigate(`/tasks/${cleaned}`);
      setLookupId("");
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#07090f]/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-sky-600 text-slate-950 shadow-lg shadow-cyan-500/20">
              <Clock3 className="h-5 w-5" />
            </span>
            <div>
              <span className="block text-sm font-bold tracking-tight text-slate-50">
                DeadlineProof
              </span>
              <span className="block text-[11px] font-medium text-slate-400">
                BOT Chain Accountability
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-1" aria-label="Primary navigation">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                  isActive
                    ? "bg-slate-800 text-cyan-300"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                }`
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/create"
              className={({ isActive }) =>
                `rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                  isActive
                    ? "bg-slate-800 text-cyan-300"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                }`
              }
            >
              Create Task
            </NavLink>
          </nav>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <form onSubmit={handleLookup} className="relative hidden md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              inputMode="numeric"
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
              placeholder="Jump to Task #ID"
              aria-label="Jump to Task ID"
              className="w-36 rounded-xl border border-slate-800 bg-slate-900/90 py-1.5 pl-8 pr-3 text-xs text-slate-100 placeholder:text-slate-500 focus:w-44 focus:border-cyan-500/60 focus:outline-none transition-all"
            />
          </form>

          {wrongNetwork ? (
            <button
              type="button"
              onClick={() => switchChainAsync({ chainId: TARGET_CHAIN.id })}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/25"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              Switch to BOT Testnet
            </button>
          ) : (
            <span className="hidden items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-300 sm:inline-flex">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              {TARGET_CHAIN.name} ({TARGET_CHAIN.id})
            </span>
          )}

          <button
            type="button"
            onClick={() => open()}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/35 bg-cyan-500/10 px-3.5 py-1.5 text-xs font-semibold text-cyan-200 transition hover:border-cyan-400/60 hover:bg-cyan-500/20"
          >
            <Wallet className="h-3.5 w-3.5 text-cyan-400" />
            {isConnected && address ? (
              <span className="font-mono">{shortenAddress(address)}</span>
            ) : (
              <span>Connect Wallet</span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
