/**
 * Cost-of-attendance math (frontend mirror of the engine's
 * calculateEstimatedTotalCost semantics — same rules, presentation only):
 * annual × ceil(months/12), semester × ceil(months/6), monthly × months,
 * total as-is. Unknown duration yields no estimate, never a fabricated
 * total. No currency conversion anywhere.
 */

export type CostPeriod = "annual" | "semester" | "monthly" | "total";

export function normalizeTotal(
  amount: number | null,
  period: string | null,
  durationMonths: number | null
): number | null {
  if (amount == null || period == null || durationMonths == null) return null;
  if (!Number.isFinite(amount) || amount < 0) return null;
  if (!Number.isInteger(durationMonths) || durationMonths <= 0) return null;
  switch (period) {
    case "annual":
      return amount * Math.ceil(durationMonths / 12);
    case "semester":
      return amount * Math.ceil(durationMonths / 6);
    case "monthly":
      return amount * durationMonths;
    case "total":
      return amount;
    default:
      return null;
  }
}

export interface CostSplit {
  tuition: number | null;
  tuitionCurrency: string | null;
  living: number | null;
  livingCurrency: string | null;
  /** Single-currency total, or null when currencies mix / data missing. */
  total: number | null;
  totalCurrency: string | null;
}

export function splitCosts(input: {
  tuitionAmount: number | null;
  tuitionCurrency: string | null;
  tuitionPeriod: string | null;
  livingCostAmount: number | null;
  livingCostCurrency: string | null;
  livingCostPeriod: string | null;
  durationMonths: number | null;
}): CostSplit {
  const tuition = normalizeTotal(
    input.tuitionAmount,
    input.tuitionPeriod,
    input.durationMonths
  );
  const living = normalizeTotal(
    input.livingCostAmount,
    input.livingCostPeriod,
    input.durationMonths
  );
  const tuitionCurrency =
    tuition != null ? (input.tuitionCurrency ?? null) : null;
  const livingCurrency = living != null ? (input.livingCostCurrency ?? null) : null;
  const total =
    tuition != null &&
    living != null &&
    tuitionCurrency != null &&
    tuitionCurrency === livingCurrency
      ? tuition + living
      : null;
  return {
    tuition,
    tuitionCurrency,
    living,
    livingCurrency,
    total,
    totalCurrency: total != null ? tuitionCurrency : null,
  };
}

export function formatMoney(amount: number, currency: string): string {
  return `${currency} ${Math.round(amount).toLocaleString("en-US")}`;
}
