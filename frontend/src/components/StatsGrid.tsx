import { AlertTriangle, CheckCircle2, Clock, Layers, Send } from "lucide-react";

export interface DashboardCounts {
  total: number;
  pending: number;
  submitted: number;
  verified: number;
  overdue: number;
}

interface StatsGridProps {
  counts: DashboardCounts;
}

export function StatsGrid({ counts }: StatsGridProps) {
  const cards = [
    {
      label: "Total Tasks",
      value: counts.total,
      icon: Layers,
      accent: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    },
    {
      label: "Pending",
      value: counts.pending,
      icon: Clock,
      accent: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
    {
      label: "Submitted",
      value: counts.submitted,
      icon: Send,
      accent: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    },
    {
      label: "Verified",
      value: counts.verified,
      icon: CheckCircle2,
      accent: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      label: "Overdue",
      value: counts.overdue,
      icon: AlertTriangle,
      accent: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    },
  ];

  return (
    <section aria-label="Task summary statistics" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 backdrop-blur-sm transition hover:border-slate-700/80"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                {card.label}
              </span>
              <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border ${card.accent}`}>
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-50">
              {card.value}
            </p>
          </div>
        );
      })}
    </section>
  );
}

