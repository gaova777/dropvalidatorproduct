"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScoreBar } from "@/components/shared/ScoreBar";
import { calculateMargin } from "@/lib/scoring";
import type { MarginResult } from "@/lib/types";

const COP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

interface MarginCalculatorProps {
  onChange?: (margin: MarginResult | null) => void;
}

interface FormState {
  cost_price: string;
  shipping_cost: string;
  selling_price: string;
  return_rate: string;
  return_cost: string;
}

const INITIAL: FormState = {
  cost_price: "",
  shipping_cost: "",
  selling_price: "",
  return_rate: "20",
  return_cost: "20000",
};

export function MarginCalculator({ onChange }: MarginCalculatorProps) {
  const [form, setForm] = useState<FormState>(INITIAL);

  const margin = useMemo<MarginResult | null>(() => {
    const cost = Number(form.cost_price);
    const ship = Number(form.shipping_cost);
    const sell = Number(form.selling_price);
    if (!cost || !sell) return null;
    return calculateMargin({
      cost_price: cost,
      shipping_cost: ship || 0,
      selling_price: sell,
      return_rate: Number(form.return_rate) || 0,
      return_cost: Number(form.return_cost) || 0,
    });
  }, [form]);

  useEffect(() => {
    onChange?.(margin);
  }, [margin, onChange]);

  function update(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3 space-y-0">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Calculator className="size-4" />
        </div>
        <div className="flex-1">
          <CardTitle className="text-sm">Calculadora Financiera</CardTitle>
          <p className="text-xs text-muted-foreground">
            Margen real considerando devoluciones.
          </p>
        </div>
        {margin && (
          <div className="font-mono text-2xl tabular-nums text-primary">
            {margin.financial_score.toFixed(1)}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Costo Dropi (COP)"
            value={form.cost_price}
            onChange={(v) => update("cost_price", v)}
            placeholder="35000"
          />
          <Field
            label="Flete (COP)"
            value={form.shipping_cost}
            onChange={(v) => update("shipping_cost", v)}
            placeholder="12000"
          />
          <Field
            label="Precio venta (COP)"
            value={form.selling_price}
            onChange={(v) => update("selling_price", v)}
            placeholder="89000"
          />
          <Field
            label="Tasa devolución (%)"
            value={form.return_rate}
            onChange={(v) => update("return_rate", v)}
            placeholder="20"
          />
          <Field
            label="Costo por devolución (COP)"
            value={form.return_cost}
            onChange={(v) => update("return_cost", v)}
            placeholder="20000"
          />
        </div>

        {margin && (
          <div className="space-y-3 rounded-lg border border-border bg-background/40 p-3">
            <ScoreBar score={margin.financial_score} showValue />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="Margen" value={`${margin.margin_percent.toFixed(1)}%`} />
              <Stat
                label="Ganancia/unidad"
                value={COP.format(margin.profit_per_unit)}
              />
              <Stat
                label="Ganancia x 100"
                value={COP.format(margin.profit_per_100)}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="font-mono"
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-mono text-sm tabular-nums">{value}</p>
    </div>
  );
}
