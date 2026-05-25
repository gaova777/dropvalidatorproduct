"use client";

import { Download, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import type { ProductStatus, Verdict } from "@/lib/types";
import { exportCsvUrl } from "@/lib/api";

const ALL = "__all__";

export interface FilterState {
  niche: string;
  minScore: number;
  verdict: Verdict | "";
  status: ProductStatus | "";
}

interface FilterBarProps {
  value: FilterState;
  onChange: (next: FilterState) => void;
  onReset: () => void;
}

export function FilterBar({ value, onChange, onReset }: FilterBarProps) {
  return (
    <div className="grid gap-3 rounded-xl border border-border bg-card/40 p-4 md:grid-cols-[1.5fr_2fr_1fr_1fr_auto_auto]">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Filtrar por nicho..."
          value={value.niche}
          onChange={(e) => onChange({ ...value, niche: e.target.value })}
        />
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          Score mínimo
        </span>
        <Slider
          min={0}
          max={10}
          step={0.5}
          value={[value.minScore]}
          onValueChange={(v) => {
            const next = Array.isArray(v) ? v[0] : v;
            onChange({ ...value, minScore: next ?? 0 });
          }}
          className="flex-1"
        />
        <span className="font-mono text-xs tabular-nums w-8 text-right">
          {value.minScore.toFixed(1)}
        </span>
      </div>

      <Select
        value={value.verdict || ALL}
        onValueChange={(v) =>
          onChange({ ...value, verdict: v === ALL ? "" : (v as Verdict) })
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="Veredicto" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos los veredictos</SelectItem>
          <SelectItem value="GANADOR">Ganador</SelectItem>
          <SelectItem value="POTENCIAL">Potencial</SelectItem>
          <SelectItem value="RIESGO">Riesgo</SelectItem>
          <SelectItem value="NO_RECOMENDADO">No recomendado</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={value.status || ALL}
        onValueChange={(v) =>
          onChange({ ...value, status: v === ALL ? "" : (v as ProductStatus) })
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos los estados</SelectItem>
          <SelectItem value="validated">Validado</SelectItem>
          <SelectItem value="testing">Testeando</SelectItem>
          <SelectItem value="selling">Vendiendo</SelectItem>
          <SelectItem value="dropped">Descartado</SelectItem>
        </SelectContent>
      </Select>

      <Button variant="outline" onClick={onReset} size="default">
        <X className="size-3.5" />
        Limpiar
      </Button>

      <a
        href={exportCsvUrl()}
        className={buttonVariants({ variant: "outline", size: "default" })}
      >
        <Download className="size-3.5" />
        Exportar
      </a>
    </div>
  );
}
