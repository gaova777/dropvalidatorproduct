"use client";

import { useState } from "react";
import {
  TrendingUp,
  Swords,
  Flame,
  Package,
  DollarSign,
  ChevronDown,
  Loader2,
  AlertTriangle,
  Info,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreBar } from "@/components/shared/ScoreBar";
import { cn } from "@/lib/utils";
import type { PhaseKey as DataPhaseKey, PhaseResult } from "@/lib/types";

export type PhaseKey = DataPhaseKey | "financial";

const META: Record<
  PhaseKey,
  { label: string; description: string; icon: LucideIcon }
> = {
  demand: {
    label: "Demanda",
    description: "Ventas reales y listings en Mercado Libre.",
    icon: TrendingUp,
  },
  competition: {
    label: "Competencia",
    description: "Saturación y concentración de vendedores.",
    icon: Swords,
  },
  virality: {
    label: "Viralidad",
    description: "Pendiente integración TikTok Creative Center.",
    icon: Flame,
  },
  supplier: {
    label: "Proveedor",
    description: "Disponibilidad y logística del producto.",
    icon: Package,
  },
  financial: {
    label: "Financiero",
    description: "Margen real después de devoluciones.",
    icon: DollarSign,
  },
};

interface PhaseCardProps {
  phase: PhaseKey;
  state: "pending" | "running" | "done";
  result?: PhaseResult;
}

export function PhaseCard({ phase, state, result }: PhaseCardProps) {
  const meta = META[phase];
  const Icon = meta.icon;
  const [open, setOpen] = useState(false);

  const score = result?.score ?? 0;
  const dimmed =
    result?.status === "no_data" ||
    result?.status === "pending" ||
    result?.status === "error";

  const scoreColor =
    state !== "done" || dimmed
      ? "text-muted-foreground"
      : score >= 7
        ? "text-success"
        : score >= 5
          ? "text-warning"
          : "text-danger";

  return (
    <Card
      className={cn(
        "transition-colors",
        state === "running" && "border-primary/50",
        state === "done" && !dimmed && "border-border",
        dimmed && "border-dashed",
      )}
    >
      <CardHeader className="flex flex-row items-center gap-3 space-y-0">
        <div
          className={cn(
            "flex size-9 items-center justify-center rounded-lg",
            state === "running"
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground",
            state === "done" && !dimmed && "bg-primary/10 text-primary",
          )}
        >
          {state === "running" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Icon className="size-4" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <CardTitle className="text-sm">{meta.label}</CardTitle>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {meta.description}
          </p>
        </div>
        <div className={cn("font-mono text-2xl tabular-nums", scoreColor)}>
          {state === "done" ? score.toFixed(1) : state === "running" ? "···" : "—"}
        </div>
      </CardHeader>

      {state === "done" && result && (
        <CardContent className="space-y-3">
          <ScoreBar score={score} />

          {result.metrics && result.metrics.length > 0 && (
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-border/60 bg-background/30 p-3">
              {result.metrics.map((m) => (
                <div key={m.label} className="space-y-0.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {m.label}
                  </p>
                  <p className="font-mono text-sm tabular-nums">{m.value}</p>
                </div>
              ))}
            </div>
          )}

          {result.status === "no_data" && (
            <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-2 text-xs text-warning">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              <span>Sin datos suficientes para esta fase.</span>
            </div>
          )}

          {result.status === "pending" && (
            <div className="flex items-start gap-2 rounded-md border border-primary/30 bg-primary/10 p-2 text-xs text-primary">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              <span>Fase pendiente de integración.</span>
            </div>
          )}

          {result.error && (
            <div className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/10 p-2 text-xs text-danger">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <span>Error: {result.error}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronDown
              className={cn(
                "size-3 transition-transform",
                open && "rotate-180",
              )}
            />
            {open ? "Ocultar análisis" : "Ver análisis"}
          </button>
          {open && (
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {result.analysis}
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
