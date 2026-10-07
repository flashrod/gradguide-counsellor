"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import {
  ApiError,
  setVisaStep,
  type ApiVisaCountry,
} from "@/lib/api";

export function VisaChecklistBoard({
  studentId,
  initial,
}: {
  studentId: string;
  initial: ApiVisaCountry[];
}) {
  const router = useRouter();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(country: string, itemKey: string, done: boolean): Promise<void> {
    setBusyKey(`${country}:${itemKey}`);
    setError(null);
    try {
      await setVisaStep(studentId, country, itemKey, !done);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update the checklist.");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="space-y-4">
      {error != null && (
        <p role="alert" className="text-[13px] text-red-700">
          {error}
        </p>
      )}
      {initial.map((group) => (
        <Card key={group.country}>
          <CardContent className="pt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold tracking-tight text-slate-900">
                {group.country} · {group.doneCount}/{group.totalCount}
              </h2>
              <p className="text-xs text-slate-500">{group.note}</p>
            </div>
            {group.links.length > 0 && (
              <p className="mt-1.5 text-xs text-slate-500">
                Official source:{" "}
                {group.links.map((link, i) => (
                  <span key={link.url}>
                    {i > 0 && " · "}
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-slate-700 underline underline-offset-4 hover:text-slate-900"
                    >
                      {link.label}
                    </a>
                  </span>
                ))}
              </p>
            )}
            <div
              className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-valuenow={group.doneCount}
              aria-valuemin={0}
              aria-valuemax={group.totalCount}
              aria-label={`${group.country} visa progress`}
            >
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{
                  width: `${group.totalCount === 0 ? 0 : (group.doneCount / group.totalCount) * 100}%`,
                }}
              />
            </div>
            <ul className="mt-3 space-y-2">
              {group.steps.map((step) => (
                <li key={step.key}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 px-3 py-2.5 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={step.done}
                      disabled={busyKey === `${group.country}:${step.key}`}
                      onChange={() => void toggle(group.country, step.key, step.done)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-slate-900"
                      aria-label={step.title}
                    />
                    <span className="min-w-0">
                      <span
                        className={`block text-sm font-medium ${step.done ? "text-slate-400 line-through" : "text-slate-900"}`}
                      >
                        {step.title}
                      </span>
                      <span className="mt-0.5 block text-[13px] leading-relaxed text-slate-500">
                        {step.detail}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
      <p className="text-xs leading-relaxed text-slate-400">
        General guidance for counselling conversations — not legal advice.
        Country list follows the student&apos;s preferred destinations.
      </p>
    </div>
  );
}
