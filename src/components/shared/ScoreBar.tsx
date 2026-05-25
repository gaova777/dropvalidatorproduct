import { cn } from "@/lib/utils";

interface ScoreBarProps {
  score: number;
  max?: number;
  className?: string;
  showValue?: boolean;
}

export function ScoreBar({
  score,
  max = 10,
  className,
  showValue = false,
}: ScoreBarProps) {
  const pct = Math.max(0, Math.min(100, (score / max) * 100));
  const color =
    score >= 7
      ? "bg-success"
      : score >= 5
        ? "bg-warning"
        : "bg-danger";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showValue && (
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {score.toFixed(1)}
        </span>
      )}
    </div>
  );
}
