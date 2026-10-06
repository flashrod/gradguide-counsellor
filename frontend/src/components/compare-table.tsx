import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { ApiCourseDetails, ApiRecommendation } from "@/lib/api-types";
import { formatVerifiedDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface CompareEntry {
  recommendation: ApiRecommendation;
  details: ApiCourseDetails;
}

interface CompareTableProps {
  entries: CompareEntry[];
}

function strongest(values: number[]): number | null {
  if (values.length === 0) return null;
  const max = Math.max(...values);
  if (values.every((v) => v === max)) return null;
  return max;
}

function StrongestMark() {
  return (
    <span className="ml-1.5 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
      Strongest
    </span>
  );
}

const DIMENSION_ROWS = [
  { key: "academic", label: "Academic fit" },
  { key: "career", label: "Career fit" },
  { key: "budget", label: "Budget fit" },
  { key: "eligibility", label: "Eligibility" },
  { key: "country", label: "Country fit" },
  { key: "intake", label: "Intake fit" },
] as const;

function formatMoney(
  amount: number | null,
  currency: string | null,
  period: string | null
): string {
  if (amount == null || currency == null) return "Unknown";
  const periodSuffix = period != null ? ` ${period}` : "";
  return `${currency} ${amount.toLocaleString("en-US")}${periodSuffix}`;
}

function eligibilityBadge(status: string): { label: string; variant: "success" | "warning" } {
  if (status === "eligible") return { label: "Eligible", variant: "success" };
  if (status === "ineligible") return { label: "Not eligible", variant: "warning" };
  return { label: "Unknown", variant: "warning" };
}

export function CompareTable({ entries }: CompareTableProps) {
  const bestOverall = strongest(entries.map((e) => e.recommendation.overallScore));
  const bestByDimension = new Map<string, number | null>(
    DIMENSION_ROWS.map((row) => [
      row.key,
      strongest(entries.map((e) => e.recommendation.scoreBreakdown[row.key])),
    ])
  );

  const labelCell = "sticky left-0 z-10 bg-white px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400 align-top";
  const valueCell = "min-w-56 px-4 py-2.5 align-top text-sm text-slate-900";

  return (
    <div className="overflow-x-auto rounded-xl border bg-white">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b">
            <th className={labelCell} scope="col">
              <span className="sr-only">Attribute</span>
            </th>
            {entries.map((entry) => (
              <th key={entry.recommendation.courseId} scope="col" className={cn(valueCell, "min-w-64")}>
                <p className="text-[15px] font-semibold tracking-tight">
                  {entry.recommendation.courseName}
                </p>
                <p className="mt-0.5 text-[13px] font-normal text-slate-500">
                  {entry.recommendation.universityName}
                </p>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_tr]:border-b [&_tr:last-child]:border-0">
          <tr>
            <th scope="row" className={labelCell}>Match score</th>
            {entries.map((entry) => (
              <td key={entry.recommendation.courseId} className={valueCell}>
                <span className="text-xl font-semibold tabular-nums">
                  {entry.recommendation.overallScore}
                </span>
                {bestOverall != null &&
                  entry.recommendation.overallScore === bestOverall && (
                    <>
                      <StrongestMark />
                      <span className="sr-only">Highest current match score</span>
                    </>
                  )}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row" className={labelCell}>Eligibility</th>
            {entries.map((entry) => {
              const badge = eligibilityBadge(entry.recommendation.eligibilityStatus);
              const reason =
                entry.recommendation.eligibilityStatus !== "eligible"
                  ? entry.recommendation.warnings[0]?.message
                  : null;
              return (
                <td key={entry.recommendation.courseId} className={valueCell}>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                  {reason != null && (
                    <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">{reason}</p>
                  )}
                </td>
              );
            })}
          </tr>
          {DIMENSION_ROWS.map((row) => (
            <tr key={row.key}>
              <th scope="row" className={labelCell}>{row.label}</th>
              {entries.map((entry) => {
                const value = entry.recommendation.scoreBreakdown[row.key];
                const best = bestByDimension.get(row.key);
                return (
                  <td key={entry.recommendation.courseId} className={valueCell}>
                    <span className="tabular-nums">{value} / 100</span>
                    {best != null && value === best && <StrongestMark />}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr>
            <th scope="row" className={labelCell}>Tuition</th>
            {entries.map((entry) => (
              <td key={entry.recommendation.courseId} className={cn(valueCell, "tabular-nums")}>
                {formatMoney(entry.details.tuitionAmount, entry.details.tuitionCurrency, entry.details.tuitionPeriod)}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row" className={labelCell}>Est. total cost</th>
            {entries.map((entry) => (
              <td key={entry.recommendation.courseId} className={cn(valueCell, "tabular-nums")}>
                {entry.recommendation.estimatedTotalCost != null
                  ? `${entry.recommendation.estimatedTotalCost.currency} ${entry.recommendation.estimatedTotalCost.amount.toLocaleString("en-US")}`
                  : "Unknown"}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row" className={labelCell}>Duration</th>
            {entries.map((entry) => (
              <td key={entry.recommendation.courseId} className={valueCell}>
                {entry.details.durationMonths != null
                  ? `${entry.details.durationMonths} months`
                  : "Unknown"}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row" className={labelCell}>GPA requirement</th>
            {entries.map((entry) => (
              <td key={entry.recommendation.courseId} className={cn(valueCell, "tabular-nums")}>
                {entry.details.minGpa.value != null && entry.details.minGpa.scale != null
                  ? `${entry.details.minGpa.value} / ${entry.details.minGpa.scale}`
                  : "Unknown"}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row" className={labelCell}>IELTS</th>
            {entries.map((entry) => (
              <td key={entry.recommendation.courseId} className={cn(valueCell, "tabular-nums")}>
                {entry.details.minIeltsOverall != null
                  ? entry.details.minIeltsOverall
                  : "Unknown"}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row" className={labelCell}>TOEFL</th>
            {entries.map((entry) => (
              <td key={entry.recommendation.courseId} className={cn(valueCell, "tabular-nums")}>
                {entry.details.minToeflOverall != null
                  ? entry.details.minToeflOverall
                  : "Not provided"}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row" className={labelCell}>Intakes</th>
            {entries.map((entry) => (
              <td key={entry.recommendation.courseId} className={valueCell}>
                {entry.details.intakes.length > 0 ? entry.details.intakes.join(", ") : "Unknown"}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row" className={labelCell}>Academic background</th>
            {entries.map((entry) => (
              <td key={entry.recommendation.courseId} className={valueCell}>
                {entry.details.academicBackgrounds.length > 0
                  ? entry.details.academicBackgrounds.join(", ")
                  : "Unknown"}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row" className={labelCell}>Source</th>
            {entries.map((entry) => (
              <td key={entry.recommendation.courseId} className={valueCell}>
                <a
                  href={entry.details.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-500"
                >
                  {entry.details.sourceName}
                </a>
                <p className="mt-1 text-xs text-slate-500">
                  Verified {formatVerifiedDate(entry.details.lastVerifiedAt)}
                </p>
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      <div className="space-y-6 border-t bg-slate-50/60 px-4 py-6">
        {entries.map((entry) => (
          <div key={entry.recommendation.courseId}>
            <p className="text-sm font-semibold text-slate-900">
              Why {entry.recommendation.courseName} scores {entry.recommendation.overallScore}
            </p>
            <ul className="mt-2 space-y-1.5">
              {entry.recommendation.reasons.slice(0, 4).map((reason, index) => (
                <li
                  key={`${reason.category}-${index}`}
                  className="flex items-start gap-2 text-[13px] leading-relaxed text-slate-600"
                >
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                  {reason.message}
                </li>
              ))}
              {entry.recommendation.warnings.slice(0, 3).map((warning, index) => (
                <li
                  key={`${warning.category}-${index}`}
                  className="flex items-start gap-2 text-[13px] leading-relaxed text-slate-600"
                >
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
                  {warning.message}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
