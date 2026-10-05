import { cn } from "@/lib/utils";

interface MatchScoreProps {
  score: number;
  className?: string;
}

function scoreStyles(score: number): string {
  if (score >= 90) return "bg-emerald-500";
  if (score >= 80) return "bg-emerald-400";
  if (score >= 70) return "bg-amber-400";
  return "bg-slate-300";
}

export function MatchScore({ score, className }: MatchScoreProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Match
        </span>
        <span className="text-sm font-semibold tabular-nums text-slate-900">
          {score}%
        </span>
      </div>
      <div
        className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Match score ${score} percent`}
      >
        <div
          className={cn("h-full rounded-full", scoreStyles(score))}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
