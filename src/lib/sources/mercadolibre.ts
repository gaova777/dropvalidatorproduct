/**
 * Cliente para api.mercadolibre.com.
 *
 * Endpoints públicos (no requieren OAuth):
 *   GET /sites/{site_id}/search?q=...
 *   GET /trends/{site_id}
 *
 * Site IDs: MCO=Colombia, MLA=Argentina, MLM=México, MLC=Chile, MPE=Perú.
 */

const BASE_URL = "https://api.mercadolibre.com";
const DEFAULT_TIMEOUT_MS = 8000;

export const COUNTRY_TO_SITE: Record<string, string> = {
  Colombia: "MCO",
  Argentina: "MLA",
  México: "MLM",
  Mexico: "MLM",
  Chile: "MLC",
  Perú: "MPE",
  Peru: "MPE",
};

export interface MLSeller {
  id: number;
  nickname?: string;
}

export interface MLShipping {
  free_shipping?: boolean;
  logistic_type?: string;
}

export interface MLItem {
  id: string;
  title: string;
  price: number;
  currency_id: string;
  available_quantity: number | null;
  sold_quantity: number | null;
  condition: "new" | "used" | "not_specified";
  shipping?: MLShipping;
  seller?: MLSeller;
  category_id?: string;
  permalink: string;
  thumbnail?: string;
}

export interface MLSearchResponse {
  site_id: string;
  query: string;
  paging: { total: number; primary_results?: number; limit: number; offset: number };
  results: MLItem[];
}

export interface MLSearchAggregate {
  query: string;
  site_id: string;
  total_listings: number;
  sample_size: number;
  sold_total: number;
  sold_median: number;
  unique_sellers: number;
  top_seller_share: number;
  avg_price: number;
  median_price: number;
  min_price: number;
  max_price: number;
  free_shipping_pct: number;
  new_condition_pct: number;
  top_categories: { id: string; count: number }[];
  top_items: Pick<MLItem, "id" | "title" | "price" | "sold_quantity" | "permalink">[];
  fetched_at: string;
}

export class MercadoLibreError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "MercadoLibreError";
  }
}

async function fetchJson<T>(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      throw new MercadoLibreError(
        `Mercado Libre respondió ${res.status} para ${url}`,
        res.status,
      );
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof MercadoLibreError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new MercadoLibreError(`Timeout (>${timeoutMs}ms) consultando ${url}`);
    }
    throw new MercadoLibreError(
      err instanceof Error ? err.message : "Error desconocido",
      undefined,
      err,
    );
  } finally {
    clearTimeout(timer);
  }
}

export function siteForCountry(country: string): string {
  return COUNTRY_TO_SITE[country] ?? "MCO";
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  condition?: "new" | "used";
  sort?: "relevance" | "price_asc" | "price_desc";
}

export async function search(
  query: string,
  country: string,
  opts: SearchOptions = {},
): Promise<MLSearchResponse> {
  const site = siteForCountry(country);
  const limit = Math.min(opts.limit ?? 50, 50);
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
    offset: String(opts.offset ?? 0),
  });
  if (opts.condition) params.set("condition", opts.condition);
  if (opts.sort && opts.sort !== "relevance") params.set("sort", opts.sort);

  const url = `${BASE_URL}/sites/${site}/search?${params.toString()}`;
  return fetchJson<MLSearchResponse>(url);
}

export function aggregate(
  response: MLSearchResponse,
  query: string,
): MLSearchAggregate {
  const items = response.results ?? [];
  const sample = items.length;

  if (sample === 0) {
    return {
      query,
      site_id: response.site_id,
      total_listings: response.paging?.total ?? 0,
      sample_size: 0,
      sold_total: 0,
      sold_median: 0,
      unique_sellers: 0,
      top_seller_share: 0,
      avg_price: 0,
      median_price: 0,
      min_price: 0,
      max_price: 0,
      free_shipping_pct: 0,
      new_condition_pct: 0,
      top_categories: [],
      top_items: [],
      fetched_at: new Date().toISOString(),
    };
  }

  const prices = items.map((i) => i.price).filter((p) => p > 0);
  const solds = items.map((i) => i.sold_quantity ?? 0);
  const sellerIds = items.map((i) => i.seller?.id).filter((id): id is number => !!id);
  const categoryIds = items.map((i) => i.category_id).filter((id): id is string => !!id);

  const sellerCounts = countBy(sellerIds);
  const topSellerCount = Math.max(...sellerCounts.values(), 0);
  const categoryCounts = countBy(categoryIds);

  const freeShippingCount = items.filter((i) => i.shipping?.free_shipping).length;
  const newConditionCount = items.filter((i) => i.condition === "new").length;

  const topItems = [...items]
    .sort((a, b) => (b.sold_quantity ?? 0) - (a.sold_quantity ?? 0))
    .slice(0, 5)
    .map((i) => ({
      id: i.id,
      title: i.title,
      price: i.price,
      sold_quantity: i.sold_quantity,
      permalink: i.permalink,
    }));

  return {
    query,
    site_id: response.site_id,
    total_listings: response.paging?.total ?? sample,
    sample_size: sample,
    sold_total: sum(solds),
    sold_median: median(solds),
    unique_sellers: sellerCounts.size,
    top_seller_share: sample > 0 ? topSellerCount / sample : 0,
    avg_price: mean(prices),
    median_price: median(prices),
    min_price: prices.length ? Math.min(...prices) : 0,
    max_price: prices.length ? Math.max(...prices) : 0,
    free_shipping_pct: sample > 0 ? freeShippingCount / sample : 0,
    new_condition_pct: sample > 0 ? newConditionCount / sample : 0,
    top_categories: [...categoryCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id, count]) => ({ id, count })),
    top_items: topItems,
    fetched_at: new Date().toISOString(),
  };
}

export async function searchAggregate(
  query: string,
  country: string,
  opts: SearchOptions = {},
): Promise<MLSearchAggregate> {
  const response = await search(query, country, opts);
  return aggregate(response, query);
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return sum(values) / values.length;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function countBy<T>(values: T[]): Map<T, number> {
  const map = new Map<T, number>();
  for (const v of values) {
    map.set(v, (map.get(v) ?? 0) + 1);
  }
  return map;
}
