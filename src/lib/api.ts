import type {
  Product,
  ProductListParams,
  ValidationRequest,
  ValidationResponse,
} from "./types";

async function jsonOrError<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    let message = text;
    try {
      const parsed = JSON.parse(text);
      message = parsed.error ?? text;
    } catch {
      /* keep raw text */
    }
    throw new Error(message || `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function validateProduct(
  body: ValidationRequest,
): Promise<ValidationResponse> {
  const res = await fetch("/api/validate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return jsonOrError<ValidationResponse>(res);
}

export interface ProductsResponse {
  products: Product[];
  total?: number;
  configured: boolean;
}

export async function listProducts(
  params: ProductListParams = {},
): Promise<ProductsResponse> {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") {
      search.set(k, String(v));
    }
  }
  const res = await fetch(`/api/products?${search.toString()}`);
  return jsonOrError<ProductsResponse>(res);
}

export async function updateProduct(
  id: string,
  updates: Partial<Product>,
): Promise<{ product: Product }> {
  const res = await fetch(`/api/products/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(updates),
  });
  return jsonOrError<{ product: Product }>(res);
}

export async function deleteProduct(id: string): Promise<void> {
  const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
  await jsonOrError<{ ok: true }>(res);
}

export function exportCsvUrl(): string {
  return "/api/products/export";
}
