import type { MLSearchAggregate } from "./sources/mercadolibre";
import type {
  MarginData,
  MarginResult,
  PhaseKey,
  PhaseResult,
  ValidationPhases,
  Verdict,
} from "./types";

/**
 * Pesos de cada fase en el score final. Suman 1.0.
 */
export const PHASE_WEIGHTS: Record<PhaseKey | "financial", number> = {
  demand: 0.3,
  competition: 0.25,
  virality: 0.15,
  supplier: 0.15,
  financial: 0.15,
};

const PHASE_KEYS: PhaseKey[] = ["demand", "competition", "virality", "supplier"];

const COP = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 0,
});

// ─────────────────────────────────────────────────────────────────────────────
// Score combinado y veredicto
// ─────────────────────────────────────────────────────────────────────────────

export function calculatePhasesScore(phases: ValidationPhases): number {
  let total = 0;
  let weight = 0;
  for (const key of PHASE_KEYS) {
    const phase = phases[key];
    if (phase.status === "no_data" || phase.status === "pending") continue;
    total += phase.score * PHASE_WEIGHTS[key];
    weight += PHASE_WEIGHTS[key];
  }
  return weight === 0 ? 0 : roundOne(total / weight);
}

export function phasesScoreFromNumbers(scores: {
  demand: number;
  competition: number;
  virality: number;
  supplier: number;
}): number {
  const weightSum =
    PHASE_WEIGHTS.demand +
    PHASE_WEIGHTS.competition +
    PHASE_WEIGHTS.virality +
    PHASE_WEIGHTS.supplier;
  const total =
    scores.demand * PHASE_WEIGHTS.demand +
    scores.competition * PHASE_WEIGHTS.competition +
    scores.virality * PHASE_WEIGHTS.virality +
    scores.supplier * PHASE_WEIGHTS.supplier;
  return roundOne(total / weightSum);
}

export function combineWithFinancial(
  phasesScore: number,
  financialScore: number,
): number {
  const phasesWeight =
    PHASE_WEIGHTS.demand +
    PHASE_WEIGHTS.competition +
    PHASE_WEIGHTS.virality +
    PHASE_WEIGHTS.supplier;
  const totalWeight = phasesWeight + PHASE_WEIGHTS.financial;
  const numerator =
    phasesScore * phasesWeight + financialScore * PHASE_WEIGHTS.financial;
  return roundOne(numerator / totalWeight);
}

export function getVerdict(score: number): Verdict {
  if (score >= 7.5) return "GANADOR";
  if (score >= 6.0) return "POTENCIAL";
  if (score >= 4.0) return "RIESGO";
  return "NO_RECOMENDADO";
}

// ─────────────────────────────────────────────────────────────────────────────
// Scorers data-driven (sin LLM)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Demanda: ¿la gente está COMPRANDO este producto en el país?
 *
 * Señal principal: suma de sold_quantity en el top de Mercado Libre.
 * Si nadie listó el producto, no hay datos → score neutral con warning.
 */
export function scoreDemand(agg: MLSearchAggregate): PhaseResult {
  if (agg.total_listings === 0) {
    return {
      score: 2,
      status: "no_data",
      analysis:
        "Cero listings en Mercado Libre para este término. Puede ser un nicho inexistente o el query es demasiado específico. Probá con sinónimos antes de descartar.",
      metrics: [
        { label: "Listings totales", value: "0", raw: 0 },
        { label: "Sample analizado", value: "0", raw: 0 },
      ],
    };
  }

  const sold = agg.sold_total;
  const score = clamp(1, 10, Math.log10(sold + 1) * 2.5);
  const recentRatio = agg.sample_size > 0 ? agg.sold_median : 0;

  const analysis = buildDemandAnalysis(agg);

  return {
    score: roundOne(score),
    status: "ok",
    analysis,
    metrics: [
      { label: "Listings totales", value: COP.format(agg.total_listings), raw: agg.total_listings },
      { label: "Ventas top 50", value: COP.format(sold), raw: sold },
      { label: "Mediana ventas/ítem", value: COP.format(recentRatio), raw: recentRatio },
      {
        label: "Precio mediano",
        value: `$${COP.format(agg.median_price)}`,
        raw: agg.median_price,
      },
    ],
  };
}

/**
 * Competencia: ¿hay espacio para entrar?
 *
 * Heurística: total de listings + concentración de vendedores.
 * - 3-30 listings: sweet spot (nicho descubierto, no saturado)
 * - 30-200: manejable
 * - 200-1000: competitivo
 * - 1000+: saturado (océano rojo)
 * Bonus si pocos sellers concentran el mercado (oportunidad de disrumpir).
 */
export function scoreCompetition(agg: MLSearchAggregate): PhaseResult {
  if (agg.total_listings === 0) {
    return {
      score: 5,
      status: "no_data",
      analysis:
        "Sin listings, no hay forma de medir competencia. Verificá el query.",
      metrics: [{ label: "Listings totales", value: "0", raw: 0 }],
    };
  }

  const listings = agg.total_listings;
  let baseScore: number;
  if (listings <= 2) baseScore = 4;
  else if (listings <= 30) baseScore = 9;
  else if (listings <= 200) baseScore = 7.5;
  else if (listings <= 1000) baseScore = 5.5;
  else if (listings <= 5000) baseScore = 3.5;
  else baseScore = 2;

  // Concentración de vendedores: si pocos sellers tienen muchos listings,
  // hay oportunidad de entrar con mejor servicio.
  const concentrationBonus = agg.top_seller_share > 0.4 ? 1 : 0;
  // Muchos sellers con poco cada uno = mercado atomizado y feroz.
  const fragmentationPenalty =
    agg.unique_sellers > 30 && agg.top_seller_share < 0.05 ? -1 : 0;

  const score = clamp(1, 10, baseScore + concentrationBonus + fragmentationPenalty);

  return {
    score: roundOne(score),
    status: "ok",
    analysis: buildCompetitionAnalysis(agg),
    metrics: [
      { label: "Listings totales", value: COP.format(listings), raw: listings },
      { label: "Sellers únicos (top 50)", value: String(agg.unique_sellers), raw: agg.unique_sellers },
      {
        label: "Share del top seller",
        value: `${Math.round(agg.top_seller_share * 100)}%`,
        raw: agg.top_seller_share,
      },
      {
        label: "Envío gratis",
        value: `${Math.round(agg.free_shipping_pct * 100)}%`,
        raw: agg.free_shipping_pct,
      },
    ],
  };
}

/**
 * Supplier (proxy sin Dropi API): si el producto ya se vende mucho en
 * Mercado Libre con buena logística (free shipping alto, sellers múltiples,
 * condición "nuevo" predominante) → es sourceable.
 */
export function scoreSupplier(agg: MLSearchAggregate): PhaseResult {
  if (agg.total_listings === 0) {
    return {
      score: 3,
      status: "no_data",
      analysis: "Sin listings no se puede inferir disponibilidad de proveedor.",
      metrics: [],
    };
  }

  const newPct = agg.new_condition_pct;
  const freePct = agg.free_shipping_pct;
  const sellers = agg.unique_sellers;
  const avgPrice = agg.avg_price;

  // 1. Condición "nuevo" → dropshipping-friendly
  const newScore = newPct >= 0.9 ? 3 : newPct >= 0.7 ? 2 : newPct >= 0.5 ? 1 : 0;
  // 2. Envío gratis → logística madura
  const freeScore = freePct >= 0.7 ? 3 : freePct >= 0.4 ? 2 : freePct >= 0.2 ? 1 : 0;
  // 3. Múltiples sellers → fácil de sourcear
  const sellersScore = sellers >= 20 ? 2 : sellers >= 10 ? 1.5 : sellers >= 5 ? 1 : 0.5;
  // 4. Precio razonable para COD en Colombia (30k–250k COP)
  const priceScore =
    avgPrice >= 30000 && avgPrice <= 250000
      ? 2
      : avgPrice >= 15000 && avgPrice <= 400000
        ? 1
        : 0.5;

  const score = clamp(1, 10, newScore + freeScore + sellersScore + priceScore);

  return {
    score: roundOne(score),
    status: "ok",
    analysis: buildSupplierAnalysis(agg),
    metrics: [
      {
        label: "Condición nuevo",
        value: `${Math.round(newPct * 100)}%`,
        raw: newPct,
      },
      {
        label: "Envío gratis",
        value: `${Math.round(freePct * 100)}%`,
        raw: freePct,
      },
      { label: "Sellers únicos", value: String(sellers), raw: sellers },
      {
        label: "Precio promedio",
        value: `$${COP.format(avgPrice)}`,
        raw: avgPrice,
      },
    ],
  };
}

/**
 * Virality: pendiente integración TikTok Creative Center.
 * Score neutro + mensaje claro.
 */
export function scoreVirality(): PhaseResult {
  return {
    score: 5,
    status: "pending",
    analysis:
      "Virality requiere integración con TikTok Creative Center (Fase 3). Por ahora se asume score neutral. Validá manualmente en https://ads.tiktok.com/business/creativecenter/topads cuántos videos del producto existen y sus views.",
    metrics: [
      {
        label: "Estado",
        value: "Pendiente integración TikTok",
      },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Calculadora financiera (sin cambios respecto al MVP)
// ─────────────────────────────────────────────────────────────────────────────

export function calculateMargin(data: MarginData): MarginResult {
  const { cost_price, shipping_cost, selling_price, return_rate, return_cost } = data;

  const safeSelling = Math.max(0, selling_price);
  const grossPerUnit = safeSelling - cost_price - shipping_cost;

  const returnFraction = Math.min(1, Math.max(0, return_rate / 100));
  const lossPerReturn = cost_price + shipping_cost + return_cost;
  const expectedLossPerUnit = returnFraction * lossPerReturn;

  const profitPerUnit = grossPerUnit - expectedLossPerUnit;
  const profitPer100 = profitPerUnit * 100;

  const marginPercent = safeSelling > 0 ? (profitPerUnit / safeSelling) * 100 : 0;

  return {
    cost_price,
    shipping_cost,
    selling_price,
    return_rate,
    return_cost,
    margin_percent: roundOne(marginPercent),
    profit_per_unit: Math.round(profitPerUnit),
    profit_per_100: Math.round(profitPer100),
    financial_score: marginToScore(marginPercent),
  };
}

function marginToScore(marginPercent: number): number {
  if (marginPercent <= 0) return 1;
  if (marginPercent < 15) return 2;
  if (marginPercent < 25) return 4;
  if (marginPercent < 35) return 6;
  if (marginPercent < 50) return 8;
  if (marginPercent < 70) return 9;
  return 10;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

function buildDemandAnalysis(agg: MLSearchAggregate): string {
  const lines: string[] = [];
  lines.push(
    `Mercado Libre ${agg.site_id} encontró ${agg.total_listings.toLocaleString("es-CO")} listings para "${agg.query}". El top 50 acumula ${agg.sold_total.toLocaleString("es-CO")} ventas históricas.`,
  );

  if (agg.sold_total === 0) {
    lines.push(
      "Cero ventas registradas en los listings analizados — señal MUY débil de demanda real.",
    );
  } else if (agg.sold_total < 50) {
    lines.push(
      "Volumen de ventas bajo. Puede ser un nicho emergente o un producto sin tracción todavía.",
    );
  } else if (agg.sold_total < 500) {
    lines.push("Demanda existente pero moderada. Hay compradores activos.");
  } else if (agg.sold_total < 5000) {
    lines.push("Demanda sólida con volumen comprobado.");
  } else {
    lines.push("Demanda alta y consistente — el mercado está activo.");
  }

  if (agg.top_items.length > 0) {
    const top = agg.top_items[0];
    lines.push(
      `Top seller individual: "${top.title}" — ${top.sold_quantity ?? 0} ventas a $${COP.format(top.price)}.`,
    );
  }

  return lines.join(" ");
}

function buildCompetitionAnalysis(agg: MLSearchAggregate): string {
  const lines: string[] = [];
  lines.push(
    `${agg.total_listings.toLocaleString("es-CO")} listings totales, ${agg.unique_sellers} sellers únicos en el top 50.`,
  );

  if (agg.total_listings <= 30) {
    lines.push(
      "Mercado descubierto pero no saturado — buena ventana para entrar primero.",
    );
  } else if (agg.total_listings <= 200) {
    lines.push("Competencia manejable. Con buen contenido se puede destacar.");
  } else if (agg.total_listings <= 1000) {
    lines.push(
      "Mercado competitivo. Vas a necesitar diferenciación clara (precio, ángulo, contenido).",
    );
  } else {
    lines.push(
      "Mercado saturado. Entrar tarde acá significa pelear por márgenes finos.",
    );
  }

  if (agg.top_seller_share > 0.4) {
    lines.push(
      `Un solo seller concentra ${Math.round(agg.top_seller_share * 100)}% del top — hay oportunidad de disrumpir si mejorás el servicio.`,
    );
  }

  return lines.join(" ");
}

function buildSupplierAnalysis(agg: MLSearchAggregate): string {
  const lines: string[] = [];
  lines.push(
    `${agg.unique_sellers} sellers únicos venden este producto, ${Math.round(agg.new_condition_pct * 100)}% como nuevos y ${Math.round(agg.free_shipping_pct * 100)}% con envío gratis.`,
  );

  if (agg.unique_sellers >= 10 && agg.new_condition_pct >= 0.8) {
    lines.push(
      "Hay oferta amplia y producto se vende mayormente nuevo — sourceable vía Dropi o importación directa.",
    );
  } else if (agg.unique_sellers < 5) {
    lines.push(
      "Pocos sellers ofrecen el producto. Puede ser difícil de conseguir localmente.",
    );
  }

  if (agg.free_shipping_pct < 0.3) {
    lines.push(
      "Bajo % de envío gratis — el flete impacta el margen, vas a tener que absorberlo o pasarlo al precio.",
    );
  }

  lines.push(
    `Precio promedio del mercado: $${COP.format(agg.avg_price)} ${agg.median_price !== agg.avg_price ? `(mediana $${COP.format(agg.median_price)})` : ""}.`,
  );

  return lines.join(" ");
}
