"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ScoreBar } from "@/components/shared/ScoreBar";
import { VerdictBadge, StatusBadge } from "@/components/shared/StatusBadge";
import { listProducts } from "@/lib/api";
import type { Product, Verdict } from "@/lib/types";

const DATE_FORMAT = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default function HistoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listProducts({ sort: "created_at", order: "desc", limit: 100 })
      .then((res) => {
        if (cancelled) return;
        setProducts(res.products);
        setConfigured(res.configured);
      })
      .catch((err) => {
        toast.error("No se pudo cargar el historial", {
          description: err instanceof Error ? err.message : String(err),
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Historial
        </p>
        <h1 className="text-3xl font-semibold">Validaciones recientes</h1>
        <p className="text-sm text-muted-foreground">
          Las últimas 100 validaciones, las más recientes arriba.
        </p>
      </header>

      {!configured && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
          Supabase no está configurado — el historial está vacío.
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          Sin validaciones todavía.
        </div>
      ) : (
        <ol className="space-y-3">
          {products.map((p) => (
            <li key={p.id}>
              <Card>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">
                      {DATE_FORMAT.format(new Date(p.created_at))}
                    </p>
                    <h3 className="truncate font-medium">{p.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {p.niche ?? "Sin nicho"} · {p.country}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-mono text-lg tabular-nums">
                        {p.total_score?.toFixed(1) ?? "—"}
                      </span>
                      <ScoreBar
                        score={p.total_score ?? 0}
                        className="w-24"
                      />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {p.verdict && (
                        <VerdictBadge verdict={p.verdict as Verdict} />
                      )}
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
