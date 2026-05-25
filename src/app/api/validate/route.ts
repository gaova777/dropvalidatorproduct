import { NextResponse } from "next/server";
import { searchAggregate, MercadoLibreError } from "@/lib/sources/mercadolibre";
import {
  calculatePhasesScore,
  getVerdict,
  scoreCompetition,
  scoreDemand,
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

  // 1. Consultar Mercado Libre del país (una sola llamada).
  let demand: PhaseResult;
  let competition: PhaseResult;
  let supplier: PhaseResult;

  try {
    const agg = await searchAggregate(product, country, { limit: 50 });
    demand = scoreDemand(agg);
    competition = scoreCompetition(agg);
    supplier = scoreSupplier(agg);
  } catch (err) {
    const message =
      err instanceof MercadoLibreError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Error desconocido consultando Mercado Libre";

    const errorPhase: PhaseResult = {
      score: 5,
      status: "error",
      analysis: `No se pudo obtener datos: ${message}`,
      error: message,
    };
    demand = errorPhase;
    competition = errorPhase;
    supplier = errorPhase;
  }

  // 2. Virality: pendiente hasta integración TikTok.
  const virality = scoreVirality();

  const phases: ValidationPhases = { demand, competition, virality, supplier };

  const totalScore = calculatePhasesScore(phases);
  const verdict = getVerdict(totalScore);

  const response: ValidationResponse = {
    product,
    niche,
    country,
    phases,
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
