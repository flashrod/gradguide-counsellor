import type { CostPeriod } from "../types.js";

/**
 * Deterministic tuition parsing (no LLM).
 *
 * "$50,000 per year" → { amount: 50000, currency: "USD", period: "annual" }
 * Never invents values: unparseable input yields null.
 */

export interface ParsedTuition {
  amount: number;
  currency: string;
  period: CostPeriod | "per-credit";
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  $: "USD",
  "US$": "USD",
  "£": "GBP",
  "€": "EUR",
  "₹": "INR",
  "C$": "CAD",
  "CA$": "CAD",
};

const PERIOD_PATTERNS: { pattern: RegExp; period: CostPeriod | "per-credit" }[] = [
  { pattern: /per\s+academic\s+year|\/\s*academic\s+year/, period: "annual" },
  { pattern: /per\s+year|\/\s*year|annual(ly)?|a\s+year|each\s+year/, period: "annual" },
  { pattern: /per\s+semester|\/\s*semester|each\s+semester/, period: "semester" },
  { pattern: /per\s+month|\/\s*month|monthly|each\s+month/, period: "monthly" },
  { pattern: /per\s+credit(\s+hour)?s?|each\s+credit/, period: "per-credit" },
  { pattern: /total|entire\s+program|whole\s+program|full\s+program/, period: "total" },
];

export function parseTuition(text: string): ParsedTuition | null {
  const amountMatch = /(US\$|CA\$|C\$|[$£€₹])\s*([\d,]+(?:\.\d{1,2})?)/.exec(text);
  if (amountMatch == null) return null;
  const amount = Number(amountMatch[2]?.replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount < 0) return null;

  const symbol = amountMatch[1] ?? "$";
  const currency = CURRENCY_SYMBOLS[symbol] ?? "USD";

  const lowered = text.toLowerCase();
  for (const { pattern, period } of PERIOD_PATTERNS) {
    if (pattern.test(lowered)) return { amount, currency, period };
  }
  return { amount, currency, period: "total" };
}
