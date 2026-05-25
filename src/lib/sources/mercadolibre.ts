/**
 * Cliente para api.mercadolibre.com.
 *
 * Mercado Libre bloquea con 403 cualquier request desde IPs cloud (Vercel/AWS)
 * que no traiga OAuth Bearer token. Soportamos dos modos:
 *
 *   1. MERCADOLIBRE_ACCESS_TOKEN (token estático, fácil pero caduca a las 6h)
 *   2. MERCADOLIBRE_CLIENT_ID + MERCADOLIBRE_CLIENT_SECRET (auto-refresh via
 *      grant_type=client_credentials — modo recomendado para producción).
 *
 * Para obtener las credenciales: https://developers.mercadolibre.com.co/ →
 * "Crear aplicación" → copiar App ID y Secret Key a las env vars de Vercel.
 *
 * Site IDs: MCO=Colombia, MLA=Argentina, MLM=México, MLC=Chile, MPE=Perú.
 */

const BASE_URL = "https://api.mercadolibre.com";
const DEFAULT_TIMEOUT_MS = 8000;

const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// Cache del token en memoria del lambda (sobrevive entre invocaciones tibias).
interface CachedToken {
  token: string;
  expiresAt: number; // epoch ms
}
let tokenCache: CachedToken | null = null;
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000; // refrescar 5 min antes

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

async function getAccessToken(): Promise<string | null> {
  const staticToken = process.env.MERCADOLIBRE_ACCESS_TOKEN;
  if (staticToken) return staticToken;

  const clientId = process.env.MERCADOLIBRE_CLIENT_ID;
  const clientSecret = process.env.MERCADOLIBRE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  if (tokenCache && tokenCache.expiresAt - Date.now() > TOKEN_REFRESH_MARGIN_MS) {
    return tokenCache.token;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(`${BASE_URL}/oauth/token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new MercadoLibreError(
      `OAuth token endpoint respondió ${res.status}: ${text.slice(0, 200)}`,
      res.status,
    );
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return tokenCache.token;
}

async function fetchJson<T>(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const token = await getAccessToken();
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
        "Accept-Language": "es-CO,es;q=0.9,en;q=0.8",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) {
      const hint =
        res.status === 403 && !token
          ? " — la API requiere OAuth desde IPs cloud. Configurá MERCADOLIBRE_CLIENT_ID y MERCADOLIBRE_CLIENT_SECRET en Vercel (ver README)."
          : "";
      throw new MercadoLibreError(
        `Mercado Libre respondió ${res.status}${hint}`,
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
