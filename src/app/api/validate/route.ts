import { NextResponse } from "next/server";
import { searchAggregate, MercadoLibreError } from "@/lib/sources/mercadolibre";
import {
  getInterestOverTime,
  GoogleTrendsError,
} from "@/lib/sources/google-trends";
import { searchImages } from "@/lib/sources/images";
import {
  calculatePhasesScore,
  enrichDemandWithTrends,
  getVerdict,
  scoreCompetition,
  scoreDemand,
  scoreDemandFromTrends,
  scoreSupplier,
  scoreVirality,
} from "@/lib/scoring";
import { getSupabaseAdmin } from "@/lib/supabase";
import type {
  PhaseResult,
  ValidationPhases,
  ValidationResponse,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

interface ValidateBody {
  product?: string;
  niche?: string;
  country?: string;
}

export async function POST(request: Request) {
  let body: ValidateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido." }, { status: 400 });
  }

  const product = body.product?.trim();
  const niche = body.niche?.trim() || "general";
  const country = body.country?.trim() || "Colombia";

  if (!product) {
    return NextResponse.json(
      { error: "El campo 'product' es obligatorio." },
      { status: 400 },
    );
  }

  // 1. Disparar ML, Trends e Images en paralelo. Cada uno puede fallar independiente.
  const [mlSettled, trendsSettled, imagesSettled] = await Promise.allSettled([
    searchAggregate(product, country, { limit: 50 }),
    getInterestOverTime(product, country),
    searchImages(product, 6),
  ]);

  const images = imagesSettled.status === "fulfilled" ? imagesSettled.value : [];

  const mlAgg = mlSettled.status === "fulfilled" ? mlSettled.value : null;
  const mlError =
    mlSettled.status === "rejected"
      ? errorMessage(mlSettled.reason, MercadoLibreError)
      : null;

  const trends = trendsSettled.status === "fulfilled" ? trendsSettled.value : null;
  const trendsError =
    trendsSettled.status === "rejected"
      ? errorMessage(trendsSettled.reason, GoogleTrendsError)
      : null;

  // 2. Construir cada fase con fallback inteligente.
  let demand: PhaseResult;
  if (mlAgg) {
    demand = enrichDemandWithTrends(scoreDemand(mlAgg), trends);
  } else {
    const trendsOnly = scoreDemandFromTrends(trends);
    if (trendsOnly) {
      demand = trendsOnly;
    } else {
      demand = {
        score: 5,
        status: "error",
        analysis: `Ni Mercado Libre ni Google Trends devolvieron datos. ${mlError ?? ""} ${trendsError ?? ""}`.trim(),
        error: mlError ?? trendsError ?? "sin_datos",
      };
    }
  }

  const competition: PhaseResult = mlAgg
    ? scoreCompetition(mlAgg)
    : {
        score: 5,
        status: "error",
        analysis: `Sin datos de Mercado Libre no se puede medir competencia. ${mlError ?? ""}`.trim(),
        error: mlError ?? "sin_ml",
      };

  const supplier: PhaseResult = mlAgg
    ? scoreSupplier(mlAgg)
    : {
        score: 5,
        status: "error",
        analysis: `Sin datos de Mercado Libre no se puede inferir disponibilidad de proveedor. ${mlError ?? ""}`.trim(),
        error: mlError ?? "sin_ml",
      };

  const virality = scoreVirality();

  const phases: ValidationPhases = { demand, competition, virality, supplier };
  const totalScore = calculatePhasesScore(phases);
  const verdict = getVerdict(totalScore);

  const response: ValidationResponse = {
    product,
    niche,
    country,
    phases,
    images,
    total_score: totalScore,
    verdict,
    source: "data-driven",
  };

  // 3. Persistir en Supabase si está configurado.
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from("products")
      .insert({
        name: product,
        niche,
        country,
        demand_score: demand.score,
        competition_score: competition.score,
        virality_score: virality.score,
        supplier_score: supplier.score,
        demand_analysis: demand.analysis,
        competition_analysis: competition.analysis,
        virality_analysis: virality.analysis,
        supplier_analysis: supplier.analysis,
        total_score: totalScore,
        verdict,
      })
      .select("id, created_at")
      .single();

    if (!error && data) {
      response.id = data.id;
      response.created_at = data.created_at;
    } else if (error) {
      console.error("[supabase insert]", error.message);
    }
  }

  return NextResponse.json(response);
}

function errorMessage<T extends Error>(
  reason: unknown,
  ExpectedClass: new (...args: never[]) => T,
): string {
  if (reason instanceof ExpectedClass) return reason.message;
  if (reason instanceof Error) return reason.message;
  return String(reason);
}
