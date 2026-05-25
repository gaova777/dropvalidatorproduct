"use client";

import { Trophy, Sparkles, AlertTriangle, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ScoreBar } from "@/components/shared/ScoreBar";
import type { Verdict } from "@/lib/types";

const META: Record<
  Verdict,
  { label: string; emoji: string; tone: string; description: string; icon: typeof Trophy }
> = {
  GANADOR: {
    label: "Producto ganador",
    emoji: "🏆",
    tone: "border-success/40 bg-success/10 text-success",
    description: "Demanda + viralidad + buen margen. Publicalo ya.",
    icon: Trophy,
  },
  POTENCIAL: {
    label: "Producto con potencial",
    emoji: "✨",
    tone: "border-primary/40 bg-primary/10 text-primary",
    description: "Vale la pena testearlo con una campaña corta.",
    icon: Sparkles,
  },
  RIESGO: {
    label: "Producto riesgoso",
    emoji: "⚠️",
    tone: "border-warning/40 bg-warning/10 text-warning",
    description: "Las señales son débiles. Revisá los puntos bajos.",
    icon: AlertTriangle,
  },
  NO_RECOMENDADO: {
    label: "No recomendado",
    emoji: "🚫",
    tone: "border-danger/40 bg-danger/10 text-danger",
    description: "Mercado saturado o sin demanda. Buscá otro producto.",
    icon: X,
  },
};

interface VerdictCardProps {
  product: string;
  verdict: Verdict;
  totalScore: number;
  breakdown: { label: string; score: number }[];
}

export function VerdictCard({
  product,
  verdict,
  totalScore,
  breakdown,
}: VerdictCardProps) {
  const meta = META[verdict];

  return (
    <Card className={cn("border-2", meta.tone)}>
      <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-center">
        <div className="flex items-start gap-4">
          <span className="text-5xl leading-none">{meta.emoji}</span>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {product}
            </p>
            <h2 className="text-xl font-semibold text-foreground">
              {meta.label}
            </h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              {meta.description}
            </p>
          </div>
        </div>

        <div className="md:ml-auto md:text-right">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Score final
          </p>
          <p className="font-mono text-5xl font-semibold tabular-nums text-foreground">
            {totalScore.toFixed(1)}
            <span className="text-2xl text-muted-foreground">/10</span>
          </p>
        </div>
      </CardContent>

      <div className="grid grid-cols-2 gap-3 border-t border-border/60 p-4 md:grid-cols-5">
        {breakdown.map((item) => (
          <div key={item.label} className="space-y-1.5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {item.label}
            </p>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base tabular-nums">
                {item.score > 0 ? item.score.toFixed(1) : "—"}
              </span>
              {item.score > 0 && (
                <ScoreBar score={item.score} className="flex-1" />
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
