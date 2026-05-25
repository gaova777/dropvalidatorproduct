/**
 * Cliente para DuckDuckGo Images.
 *
 * DDG no expone una API oficial, pero el endpoint `i.js` devuelve JSON con
 * resultados de imágenes. Necesita un token "vqd" que sacamos primero del
 * HTML de búsqueda. Es scraping pero a diferencia de Google/ML, DDG no
 * bloquea IPs cloud agresivamente — funciona bien desde Vercel.
 *
 * Si falla, devolvemos array vacío (es feature opcional, no crítica).
 */

const HTML_URL = "https://duckduckgo.com/";
const JSON_URL = "https://duckduckgo.com/i.js";
const DEFAULT_TIMEOUT_MS = 6000;

const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export interface ImageResult {
  /** URL absoluta de la imagen. */
  url: string;
  /** URL de la página donde aparece la imagen (para el link "ver fuente"). */
  source: string;
  /** Dominio limpio para mostrar (amazon.com, aliexpress.com, etc.). */
  source_domain: string;
  /** Título o alt text. */
  title: string;
  /** Ancho × alto si está disponible. */
  width?: number;
  height?: number;
}

export class ImagesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImagesError";
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new ImagesError(`Timeout >${ms}ms`)), ms);
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

async function fetchVqd(query: string): Promise<string> {
  const url = `${HTML_URL}?q=${encodeURIComponent(query)}&iax=images&ia=images`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      "Accept-Language": "es-CO,es;q=0.9,en;q=0.8",
    },
  });

  if (!res.ok) {
    throw new ImagesError(`DDG HTML respondió ${res.status}`);
  }

  const html = await res.text();
  // El vqd aparece en JS inline: vqd="1-12345..." o vqd='1-12345...'
  const match =
    html.match(/vqd="([^"]+)"/) ||
    html.match(/vqd='([^']+)'/) ||
    html.match(/vqd=([\d-]+)&/);
  if (!match) {
    throw new ImagesError("vqd token no encontrado en HTML de DDG");
  }
  return match[1];
}

interface DDGImageRaw {
  image: string;
  thumbnail: string;
  url: string;
  title: string;
  source: string;
  width: number;
  height: number;
}

interface DDGResponse {
  results: DDGImageRaw[];
}

export async function searchImages(
  query: string,
  limit = 6,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<ImageResult[]> {
  if (!query.trim()) return [];

  try {
    const vqd = await withTimeout(fetchVqd(query), timeoutMs);

    const params = new URLSearchParams({
      l: "us-en",
      o: "json",
      q: query,
      vqd,
      f: ",,,,,",
      p: "1",
      v7exp: "a",
    });

    const res = await withTimeout(
      fetch(`${JSON_URL}?${params.toString()}`, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
          Referer: `${HTML_URL}?q=${encodeURIComponent(query)}&iax=images&ia=images`,
          "Accept-Language": "es-CO,es;q=0.9,en;q=0.8",
        },
      }),
      timeoutMs,
    );

    if (!res.ok) {
      throw new ImagesError(`DDG i.js respondió ${res.status}`);
    }

    const data = (await res.json()) as DDGResponse;
    const results = data.results ?? [];

    return results.slice(0, limit).map((r) => ({
      url: r.image,
      source: r.url,
      source_domain: cleanDomain(r.source || r.url),
      title: r.title || query,
      width: r.width,
      height: r.height,
    }));
  } catch (err) {
    // Feature opcional — no rompemos la validación si falla.
    console.warn(
      "[images] fallo búsqueda:",
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}

function cleanDomain(input: string): string {
  try {
    const url = new URL(input.startsWith("http") ? input : `https://${input}`);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return input;
  }
}
