import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

const ALLOWED_SORT = new Set([
  "total_score",
  "demand_score",
  "competition_score",
  "virality_score",
  "supplier_score",
  "financial_score",
  "margin_percent",
  "profit_per_100",
  "created_at",
  "updated_at",
  "name",
  "niche",
  "verdict",
  "status",
]);

export async function GET(request: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ products: [], configured: false });
  }

  const { searchParams } = new URL(request.url);
  const niche = searchParams.get("niche");
  const minScore = searchParams.get("min_score");
  const verdict = searchParams.get("verdict");
  const status = searchParams.get("status");
  const sortRaw = searchParams.get("sort") ?? "total_score";
  const orderRaw = searchParams.get("order") ?? "desc";
  const limit = Math.min(Number(searchParams.get("limit") ?? 100), 500);
  const offset = Math.max(Number(searchParams.get("offset") ?? 0), 0);

  const sort = ALLOWED_SORT.has(sortRaw) ? sortRaw : "total_score";
  const ascending = orderRaw === "asc";

  let query = supabase.from("products").select("*", { count: "exact" });

  if (niche) query = query.ilike("niche", `%${niche}%`);
  if (minScore) query = query.gte("total_score", Number(minScore));
  if (verdict) query = query.eq("verdict", verdict);
  if (status) query = query.eq("status", status);

  query = query.order(sort, { ascending }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    products: data ?? [],
    total: count ?? data?.length ?? 0,
    configured: true,
  });
}
