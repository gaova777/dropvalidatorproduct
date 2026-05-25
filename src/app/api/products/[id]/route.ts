import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  calculateMargin,
  combineWithFinancial,
  getVerdict,
  phasesScoreFromNumbers,
} from "@/lib/scoring";
import type { MarginData } from "@/lib/types";

export const runtime = "nodejs";

const EDITABLE_FIELDS = new Set([
  "name",
  "niche",
  "country",
  "cost_price",
  "shipping_cost",
  "selling_price",
  "return_rate",
  "return_cost",
  "status",
  "actual_sales",
  "actual_returns",
  "marketplace_url",
  "dropi_product_url",
  "notes",
]);

const MARGIN_FIELDS: (keyof MarginData)[] = [
  "cost_price",
  "shipping_cost",
  "selling_price",
  "return_rate",
  "return_cost",
];

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase no configurado." }, { status: 503 });
  }

  const { id } = await context.params;
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json({ product: data });
}

export async function PATCH(request: Request, context: RouteContext) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase no configurado." }, { status: 503 });
  }

  const { id } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (EDITABLE_FIELDS.has(key)) updates[key] = value;
  }

  const touchesMargin = MARGIN_FIELDS.some((f) => f in updates);
  if (touchesMargin) {
    const { data: current, error: fetchErr } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    if (!current) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const margin = calculateMargin({
      cost_price: Number(updates.cost_price ?? current.cost_price ?? 0),
      shipping_cost: Number(updates.shipping_cost ?? current.shipping_cost ?? 0),
      selling_price: Number(updates.selling_price ?? current.selling_price ?? 0),
      return_rate: Number(updates.return_rate ?? current.return_rate ?? 20),
      return_cost: Number(updates.return_cost ?? current.return_cost ?? 20000),
    });

    updates.margin_percent = margin.margin_percent;
    updates.profit_per_100 = margin.profit_per_100;
    updates.financial_score = margin.financial_score;

    const phasesScore = phasesScoreFromNumbers({
      demand: current.demand_score ?? 5,
      competition: current.competition_score ?? 5,
      virality: current.virality_score ?? 5,
      supplier: current.supplier_score ?? 5,
    });

    const total = combineWithFinancial(phasesScore, margin.financial_score);
    updates.total_score = total;
    updates.verdict = getVerdict(total);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Sin campos válidos para actualizar." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("products")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ product: data });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase no configurado." }, { status: 503 });
  }

  const { id } = await context.params;
  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
