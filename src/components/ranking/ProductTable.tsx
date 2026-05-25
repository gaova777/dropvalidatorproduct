"use client";

import { Fragment, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScoreBar } from "@/components/shared/ScoreBar";
import { VerdictBadge, StatusBadge } from "@/components/shared/StatusBadge";
import { ScoreRadar } from "./ScoreRadar";
import { cn } from "@/lib/utils";
import type { Product, Verdict } from "@/lib/types";

interface ColumnDef {
  key: keyof Product | "_index";
  label: string;
  numeric?: boolean;
  sortable?: boolean;
  className?: string;
}

const COLUMNS: ColumnDef[] = [
  { key: "_index", label: "#", className: "w-10 text-muted-foreground" },
  { key: "name", label: "Producto", sortable: true },
  { key: "niche", label: "Nicho", sortable: true, className: "hidden md:table-cell" },
  { key: "total_score", label: "Score", numeric: true, sortable: true },
  { key: "verdict", label: "Veredicto", sortable: true },
  { key: "demand_score", label: "D", numeric: true, sortable: true, className: "hidden lg:table-cell" },
  { key: "competition_score", label: "C", numeric: true, sortable: true, className: "hidden lg:table-cell" },
  { key: "virality_score", label: "V", numeric: true, sortable: true, className: "hidden lg:table-cell" },
  { key: "supplier_score", label: "S", numeric: true, sortable: true, className: "hidden lg:table-cell" },
  { key: "financial_score", label: "F", numeric: true, sortable: true, className: "hidden lg:table-cell" },
  { key: "margin_percent", label: "Margen %", numeric: true, sortable: true, className: "hidden xl:table-cell" },
  { key: "created_at", label: "Fecha", sortable: true, className: "hidden md:table-cell" },
];

interface ProductTableProps {
  products: Product[];
}

export function ProductTable({ products }: ProductTableProps) {
  const [sortKey, setSortKey] = useState<keyof Product>("total_score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expanded, setExpanded] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const copy = [...products];
    copy.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      if (typeof va === "number" && typeof vb === "number") {
        return sortDir === "asc" ? va - vb : vb - va;
      }
      const sa = String(va);
      const sb = String(vb);
      return sortDir === "asc" ? sa.localeCompare(sb) : sb.localeCompare(sa);
    });
    return copy;
  }, [products, sortKey, sortDir]);

  function toggleSort(key: keyof Product) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center">
        <p className="text-sm text-muted-foreground">
          Todavía no hay productos validados. Andá a{" "}
          <a href="/validate" className="text-primary hover:underline">
            /validate
          </a>{" "}
          y arrancá.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card/30">
      <Table>
        <TableHeader>
          <TableRow className="border-border">
            {COLUMNS.map((col) => (
              <TableHead
                key={col.key}
                className={cn(col.numeric && "text-right", col.className)}
              >
                {col.sortable ? (
                  <button
                    onClick={() => toggleSort(col.key as keyof Product)}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    {col.label}
                    {sortKey === col.key ? (
                      sortDir === "asc" ? (
                        <ArrowUp className="size-3" />
                      ) : (
                        <ArrowDown className="size-3" />
                      )
                    ) : (
                      <ArrowUpDown className="size-3 opacity-40" />
                    )}
                  </button>
                ) : (
                  col.label
                )}
              </TableHead>
            ))}
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((p, idx) => {
            const open = expanded === p.id;
            return (
              <Fragment key={p.id}>
                <TableRow
                  className="cursor-pointer border-border hover:bg-muted/40"
                  onClick={() => setExpanded(open ? null : p.id)}
                >
                  <TableCell className="text-muted-foreground tabular-nums">
                    {idx + 1}
                  </TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {p.niche ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <ScoreBar
                        score={p.total_score ?? 0}
                        className="w-20"
                      />
                      <span className="font-mono tabular-nums">
                        {p.total_score?.toFixed(1) ?? "—"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {p.verdict ? <VerdictBadge verdict={p.verdict as Verdict} /> : "—"}
                  </TableCell>
                  <ScoreCell value={p.demand_score} />
                  <ScoreCell value={p.competition_score} />
                  <ScoreCell value={p.virality_score} />
                  <ScoreCell value={p.supplier_score} />
                  <ScoreCell value={p.financial_score} />
                  <TableCell className="hidden xl:table-cell text-right font-mono tabular-nums">
                    {p.margin_percent !== null
                      ? `${p.margin_percent.toFixed(0)}%`
                      : "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString("es-CO")}
                  </TableCell>
                  <TableCell>
                    <ChevronDown
                      className={cn(
                        "size-4 text-muted-foreground transition-transform",
                        open && "rotate-180",
                      )}
                    />
                  </TableCell>
                </TableRow>
                {open && (
                  <TableRow className="border-border bg-muted/20 hover:bg-muted/20">
                    <TableCell colSpan={COLUMNS.length + 1} className="p-6">
                      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
                        <div>
                          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                            Breakdown
                          </p>
                          <ScoreRadar product={p} />
                          <div className="mt-2 flex items-center gap-2">
                            <StatusBadge status={p.status} />
                            {p.marketplace_url && (
                              <a
                                href={p.marketplace_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-primary hover:underline"
                              >
                                Marketplace
                              </a>
                            )}
                            {p.dropi_product_url && (
                              <a
                                href={p.dropi_product_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-primary hover:underline"
                              >
                                Dropi
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="space-y-3 text-sm">
                          <AnalysisBlock label="Demanda" content={p.demand_analysis} />
                          <AnalysisBlock label="Competencia" content={p.competition_analysis} />
                          <AnalysisBlock label="Viralidad" content={p.virality_analysis} />
                          <AnalysisBlock label="Proveedor" content={p.supplier_analysis} />
                          {p.notes && (
                            <AnalysisBlock label="Notas" content={p.notes} />
                          )}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function ScoreCell({ value }: { value: number | null }) {
  return (
    <TableCell className="hidden lg:table-cell text-right font-mono tabular-nums">
      {value !== null ? value.toFixed(1) : "—"}
    </TableCell>
  );
}

function AnalysisBlock({ label, content }: { label: string; content: string | null }) {
  if (!content) return null;
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
        {content}
      </p>
    </div>
  );
}
