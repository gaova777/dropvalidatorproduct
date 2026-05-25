export type Verdict = "GANADOR" | "POTENCIAL" | "RIESGO" | "NO_RECOMENDADO";
export type ProductStatus = "validated" | "testing" | "selling" | "dropped";
export type PhaseKey = "demand" | "competition" | "virality" | "supplier";

export type PhaseStatus = "ok" | "no_data" | "pending" | "error";

export interface PhaseMetric {
  label: string;
  value: string;
  raw?: number;
}

export interface PhaseResult {
  score: number;
  analysis: string;
  status: PhaseStatus;
  metrics?: PhaseMetric[];
  error?: string;
}

export interface ValidationPhases {
  demand: PhaseResult;
  competition: PhaseResult;
  virality: PhaseResult;
  supplier: PhaseResult;
}

export interface ValidationRequest {
  product: string;
  niche: string;
  country: string;
}

export interface MarginData {
  cost_price: number;
  shipping_cost: number;
  selling_price: number;
  return_rate: number;
  return_cost: number;
}

export interface MarginResult extends MarginData {
  margin_percent: number;
  profit_per_unit: number;
  profit_per_100: number;
  financial_score: number;
}

export interface ProductImage {
  url: string;
  source: string;
  source_domain: string;
  title: string;
  width?: number;
  height?: number;
}

export interface ValidationResponse {
  id?: string;
  product: string;
  niche: string;
  country: string;
  phases: ValidationPhases;
  images?: ProductImage[];
  total_score: number;
  verdict: Verdict;
  source: "data-driven" | "agents";
  created_at?: string;
}

export interface Product {
  id: string;
  name: string;
  niche: string | null;
  country: string;

  demand_score: number | null;
  competition_score: number | null;
  virality_score: number | null;
  supplier_score: number | null;
  financial_score: number | null;

  total_score: number | null;
  verdict: Verdict | null;

  demand_analysis: string | null;
  competition_analysis: string | null;
  virality_analysis: string | null;
  supplier_analysis: string | null;

  cost_price: number | null;
  shipping_cost: number | null;
  selling_price: number | null;
  margin_percent: number | null;
  return_rate: number | null;
  return_cost: number | null;
  profit_per_100: number | null;

  status: ProductStatus;
  actual_sales: number;
  actual_returns: number;
  marketplace_url: string | null;
  dropi_product_url: string | null;
  notes: string | null;

  created_at: string;
  updated_at: string;
}

export interface ProductListParams {
  niche?: string;
  min_score?: number;
  verdict?: Verdict;
  status?: ProductStatus;
  sort?: keyof Product;
  order?: "asc" | "desc";
  limit?: number;
  offset?: number;
}
