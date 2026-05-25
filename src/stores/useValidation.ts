"use client";

import { create } from "zustand";
import { calculatePhasesScore, combineWithFinancial, getVerdict } from "@/lib/scoring";
import type {
  MarginResult,
  ValidationPhases,
  ValidationResponse,
  Verdict,
} from "@/lib/types";

interface ValidationState {
  product: string;
  niche: string;
  country: string;

  isRunning: boolean;
  error: string | null;

  result: ValidationResponse | null;
  margin: MarginResult | null;

  setForm: (next: Partial<Pick<ValidationState, "product" | "niche" | "country">>) => void;
  reset: () => void;
  start: () => void;
  setResult: (response: ValidationResponse) => void;
  setError: (err: string) => void;
  setMargin: (margin: MarginResult | null) => void;

  combinedScore: () => number;
  combinedVerdict: () => Verdict;
  phasesScore: () => number;
  phases: () => ValidationPhases | null;
}

export const useValidation = create<ValidationState>((set, get) => ({
  product: "",
  niche: "",
  country: "Colombia",

  isRunning: false,
  error: null,

  result: null,
  margin: null,

  setForm: (next) => set((s) => ({ ...s, ...next })),

  reset: () =>
    set({
      isRunning: false,
      error: null,
      result: null,
      margin: null,
    }),

  start: () => set({ isRunning: true, error: null, result: null, margin: null }),

  setResult: (response) => set({ isRunning: false, error: null, result: response }),

  setError: (err) => set({ isRunning: false, error: err }),

  setMargin: (margin) => set({ margin }),

  phasesScore: () => {
    const result = get().result;
    if (!result) return 0;
    return calculatePhasesScore(result.phases);
  },

  combinedScore: () => {
    const result = get().result;
    if (!result) return 0;
    const base = calculatePhasesScore(result.phases);
    const margin = get().margin;
    if (!margin) return base;
    return combineWithFinancial(base, margin.financial_score);
  },

  combinedVerdict: () => {
    const score = get().combinedScore();
    return getVerdict(score);
  },

  phases: () => get().result?.phases ?? null,
}));
