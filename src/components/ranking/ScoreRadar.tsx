"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import type { Product } from "@/lib/types";

interface ScoreRadarProps {
  product: Product;
}

export function ScoreRadar({ product }: ScoreRadarProps) {
  const data = [
    { axis: "Demanda", value: product.demand_score ?? 0 },
    { axis: "Competencia", value: product.competition_score ?? 0 },
    { axis: "Viralidad", value: product.virality_score ?? 0 },
    { axis: "Proveedor", value: product.supplier_score ?? 0 },
    { axis: "Financiero", value: product.financial_score ?? 0 },
  ];

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="75%">
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          />
          <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
          <Radar
            dataKey="value"
            stroke="var(--primary)"
            fill="var(--primary)"
            fillOpacity={0.35}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
