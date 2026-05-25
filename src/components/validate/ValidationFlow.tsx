"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { ProductForm } from "./ProductForm";
import { PhaseCard, type PhaseKey } from "./PhaseCard";
import { MarginCalculator } from "./MarginCalculator";
import { VerdictCard } from "./VerdictCard";
import { useValidation } from "@/stores/useValidation";
import { validateProduct } from "@/lib/api";
import type { MarginResult, PhaseResult } from "@/lib/types";

const PHASE_ORDER: PhaseKey[] = [
  "demand",
  "competition",
  "virality",
  "supplier",
  "financial",
];

export function ValidationFlow() {
  const product = useValidation((s) => s.product);
  const niche = useValidation((s) => s.niche);
  const country = useValidation((s) => s.country);
  const isRunning = useValidation((s) => s.isRunning);
  const result = useValidation((s) => s.result);
  const margin = useValidation((s) => s.margin);
  const error = useValidation((s) => s.error);

  const setForm = useValidation((s) => s.setForm);
  const start = useValidation((s) => s.start);
  const setResult = useValidation((s) => s.setResult);
  const setError = useValidation((s) => s.setError);
  const setMargin = useValidation((s) => s.setMargin);

  const handleSubmit = useCallback(async () => {
    if (!product.trim()) return;
    start();
    try {
      const response = await validateProduct({ product, niche, country });
      setResult(response);
      toast.success("Validación lista", {
        description: `Score ${response.total_score} — ${response.verdict}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(message);
      toast.error("La validación falló", { description: message });
    }
  }, [product, niche, country, start, setResult, setError]);

  const handleMargin = useCallback(
    (m: MarginResult | null) => {
      setMargin(m);
    },
    [setMargin],
  );

  const phasesScore = useValidation((s) => s.phasesScore)();
  const combinedScore = useValidation((s) => s.combinedScore)();
  const combinedVerdict = useValidation((s) => s.combinedVerdict)();

  return (
    <div className="space-y-6">
      <ProductForm
        product={product}
        niche={niche}
        country={country}
        isRunning={isRunning}
        onChange={setForm}
        onSubmit={handleSubmit}
      />

      {error && (
        <div className="rounded-lg border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      {(isRunning || result) && (
        <div className="space-y-4">
          {result && (
            <VerdictCard
              product={result.product}
              verdict={margin ? combinedVerdict : result.verdict}
              totalScore={margin ? combinedScore : phasesScore}
              breakdown={[
                { label: "Demanda", score: result.phases.demand.score },
                {
                  label: "Competencia",
                  score: result.phases.competition.score,
                },
                { label: "Viralidad", score: result.phases.virality.score },
                { label: "Proveedor", score: result.phases.supplier.score },
                { label: "Financiero", score: margin?.financial_score ?? 0 },
              ]}
            />
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {PHASE_ORDER.map((key) => {
              if (key === "financial") return null;
              const state: "pending" | "running" | "done" = isRunning
                ? "running"
                : result
                  ? "done"
                  : "pending";
              const phaseResult: PhaseResult | undefined = result
                ? result.phases[key]
                : undefined;
              return (
                <PhaseCard
                  key={key}
                  phase={key}
                  state={state}
                  result={phaseResult}
                />
              );
            })}
          </div>

          <MarginCalculator onChange={handleMargin} />
        </div>
      )}
    </div>
  );
}
