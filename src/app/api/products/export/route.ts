import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

const COLUMNS: string[] = [
  "id",
  "name",
  "niche",
  "country",
  "total_score",
  "verdict",
  "demand_score",
  "competition_score",
  "virality_score",
  "supplier_score",
  "financial_score",
  "margin_percent",
  "profit_per_100",
  "status",
  "actual_sales",
  "actual_returns",
  "created_at",
];

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return new Response("Supabase no configurado.", { status: 503 });
  }

  const { data, error } = await supabase
    .from("products")
    .select(COLUMNS.join(","))
    .order("total_score", { ascending: false });

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
  const header = COLUMNS.join(",");
  const body = rows
    .map((row) => COLUMNS.map((c) => escapeCsv(row[c])).join(","))
    .join("\n");

  const csv = `${header}\n${body}`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="dropvalidator-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
    },
  });
}
