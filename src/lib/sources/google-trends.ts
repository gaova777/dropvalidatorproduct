/**
 * Cliente para Google Trends vía la lib unofficial `google-trends-api`.
 *
 * No requiere auth ni env vars. Trabaja por scraping de Google Trends, así
 * que puede romperse si Google cambia el HTML/JSON. Tratá los errores como
 * "señal opcional" — si falla, el scoring sigue solo con Mercado Libre.
 *
 * Geo codes ISO-3166 alpha-2 (≠ ML site IDs).
 */
import googleTrends from "google-trends-api";

const DEFAULT_TIMEOUT_MS = 8000;

export const COUNTRY_TO_GEO: Record<string, string> = {
  Colombia: "CO",
  Argentina: "AR",
  México: "MX",
  Mexico: "MX",
  Chile: "CL",
  Perú: "PE",
  Peru: "PE",
  "Estados Unidos": "US",
  LATAM: "", // global / sin filtro
};

export function geoForCountry(country: string): string {
  return COUNTRY_TO_GEO[country] ?? "CO";
}

interface TimelinePoint {
  time: string;
  formattedTime: string;
  value: number[];
}

interface InterestOverTimeRaw {
  default?: {
    timelineData?: TimelinePoint[];
    averages?: number[];
  };
}

export interface TrendsTimeline {
  query: string;
  geo: string;
  points: { date: string; value: number }[];
  recent_3m_avg: number;
  prior_9m_avg: number;
  /** > 1 = creciente; < 1 = decreciendo. */
  growth_ratio: number;
  /** Pico histórico en la ventana (0-100, escala Google Trends). */
  peak_value: number;
  /** ¿Cuándo fue el pico? Útil para detectar estacionalidad. */
  peak_month: string | null;
  /** Promedio de los últimos 12m. */
  overall_avg: number;
  /** Cuántos puntos de datos volvieron. */
  sample_size: number;
  fetched_at: string;
}

export class GoogleTrendsError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "GoogleTrendsError";
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new GoogleTrendsError(`Timeout >${ms}ms`));
    }, ms);
    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Trae interés mensual de los últimos 12 meses para el keyword en el país.
 * Devuelve métricas agregadas listas para scoring.
 */
export async function getInterestOverTime(
  query: string,
  country: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<TrendsTimeline> {
  const geo = geoForCountry(country);
  const endTime = new Date();
  const startTime = new Date();
  startTime.setMonth(startTime.getMonth() - 12);

  let raw: string;
  try {
    raw = await withTimeout(
      googleTrends.interestOverTime({
        keyword: query,
        geo,
        startTime,
        endTime,
      }),
      timeoutMs,
    );
  } catch (err) {
    throw new GoogleTrendsError(
      err instanceof Error ? err.message : "Error desconocido en Trends",
      err,
    );
  }

  let parsed: InterestOverTimeRaw;
  try {
    parsed = JSON.parse(raw) as InterestOverTimeRaw;
  } catch {
    // Google a veces devuelve HTML cuando bloquea. Eso ya es señal de rate limit.
    throw new GoogleTrendsError(
      "Google Trends devolvió respuesta no-JSON (probablemente rate-limited o bloqueado)",
    );
  }

  const timeline = parsed.default?.timelineData ?? [];
  const points = timeline
    .map((p) => ({
      date: p.formattedTime,
      value: Array.isArray(p.value) && p.value.length > 0 ? p.value[0] : 0,
    }))
    .filter((p) => Number.isFinite(p.value));

  if (points.length === 0) {
    return {
      query,
      geo,
      points: [],
      recent_3m_avg: 0,
      prior_9m_avg: 0,
      growth_ratio: 0,
      peak_value: 0,
      peak_month: null,
      overall_avg: 0,
      sample_size: 0,
      fetched_at: new Date().toISOString(),
    };
  }

  // Particionamos en últimos 3m vs los 9m previos para tendencia.
  const recentPoints = points.slice(-12); // semanal o mensual depende, normalizamos
  const splitAt = Math.max(0, recentPoints.length - 3);
  const recent3m = recentPoints.slice(splitAt);
  const prior9m = recentPoints.slice(0, splitAt);

  const recent3mAvg = mean(recent3m.map((p) => p.value));
  const prior9mAvg = prior9m.length > 0 ? mean(prior9m.map((p) => p.value)) : recent3mAvg;
  const growthRatio = prior9mAvg > 0 ? recent3mAvg / prior9mAvg : recent3mAvg > 0 ? 2 : 0;

  const peakPoint = points.reduce(
    (best, p) => (p.value > best.value ? p : best),
    points[0],
  );

  return {
    query,
    geo,
    points,
    recent_3m_avg: round(recent3mAvg),
    prior_9m_avg: round(prior9mAvg),
    growth_ratio: round(growthRatio, 2),
    peak_value: peakPoint.value,
    peak_month: peakPoint.date,
    overall_avg: round(mean(points.map((p) => p.value))),
    sample_size: points.length,
    fetched_at: new Date().toISOString(),
  };
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function round(value: number, decimals = 1): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
