"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { FilterBar, type FilterState } from "@/components/ranking/FilterBar";
import { ProductTable } from "@/components/ranking/ProductTable";
import { listProducts } from "@/lib/api";
import type { Product } from "@/lib/types";

const INITIAL_FILTERS: FilterState = {
  niche: "",
  minScore: 0,
  verdict: "",
  status: "",
};

export default function RankingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);

  useEffect(() => {
    let cancelled = false;
    listProducts({ limit: 200 })
      .then((res) => {
        if (cancelled) return;
        setProducts(res.products);
        setConfigured(res.configured);
      })
      .catch((err) => {
        toast.error("No se pudo cargar el ranking", {
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

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (filters.niche && !p.niche?.toLowerCase().includes(filters.niche.toLowerCase()))
        return false;
      if ((p.total_score ?? 0) < filters.minScore) return false;
      if (filters.verdict && p.verdict !== filters.verdict) return false;
      if (filters.status && p.status !== filters.status) return false;
      return true;
    });
  }, [products, filters]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Ranking
        </p>
        <h1 className="text-3xl font-semibold">
          Top productos validados
        </h1>
        <p className="text-sm text-muted-foreground">
          Ordenado por score total. Click en cualquier fila para ver el detalle.
        </p>
      </header>

      {!configured && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
          Supabase no está configurado. Las validaciones todavía no se persisten.
          Mirá el README para conectarlo.
        </div>
      )}

      <FilterBar
        value={filters}
        onChange={setFilters}
        onReset={() => setFilters(INITIAL_FILTERS)}
      />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {filtered.length} producto{filtered.length === 1 ? "" : "s"} encontrado
            {filtered.length === 1 ? "" : "s"}
          </p>
          <ProductTable products={filtered} />
        </>
      )}
    </div>
  );
}
