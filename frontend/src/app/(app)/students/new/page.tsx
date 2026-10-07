"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { ApiError, createStudent } from "@/lib/api";

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs font-medium text-slate-600">
      {label}
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

/**
 * Manual student creation — for profiles that arrive as a conversation,
 * not a resume. Every field is optional except the name; unknowns stay
 * null and the engine treats them as unknowns (never zeros).
 */
export default function NewStudentPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [degree, setDegree] = useState("");
  const [field, setField] = useState("");
  const [gpaValue, setGpaValue] = useState("");
  const [gpaScale, setGpaScale] = useState("");
  const [ielts, setIelts] = useState("");
  const [careerGoal, setCareerGoal] = useState("");
  const [countries, setCountries] = useState("");
  const [intake, setIntake] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetCurrency, setBudgetCurrency] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function num(value: string): number | undefined {
    if (value.trim() === "") return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  async function submit(): Promise<void> {
    if (name.trim() === "") {
      setError("Give the student a name.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const gpa = num(gpaValue);
      const scale = num(gpaScale);
      const ieltsOverall = num(ielts);
      const budget = num(budgetAmount);
      const { student } = await createStudent({
        name: name.trim(),
        ...(degree.trim() !== "" ? { degree: degree.trim() } : {}),
        ...(field.trim() !== "" ? { field: field.trim() } : {}),
        ...(gpa !== undefined ? { gpaValue: gpa } : {}),
        ...(scale !== undefined ? { gpaScale: Math.round(scale) } : {}),
        ...(ieltsOverall !== undefined ? { ieltsOverall } : {}),
        ...(careerGoal.trim() !== "" ? { careerGoal: careerGoal.trim() } : {}),
        ...(countries.trim() !== ""
          ? {
              preferredCountries: countries
                .split(",")
                .map((c) => c.trim())
                .filter((c) => c !== ""),
            }
          : {}),
        ...(intake.trim() !== "" ? { preferredIntake: intake.trim() } : {}),
        ...(budget !== undefined ? { budgetAmount: budget } : {}),
        ...(budgetCurrency.trim() !== ""
          ? { budgetCurrency: budgetCurrency.trim().toUpperCase() }
          : {}),
      });
      router.push(`/workspace?student=${student.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create the student.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add student"
        subtitle="Manual profile — anything left blank stays unknown, never zero."
      />
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name (required)">
              <input aria-label="Name" type="text" required maxLength={200} className={inputClass} value={name} onChange={(e) => setName(e.target.value)} disabled={busy} />
            </Field>
            <Field label="Degree">
              <input aria-label="Degree" type="text" maxLength={200} placeholder="B.Tech Computer Science" className={inputClass} value={degree} onChange={(e) => setDegree(e.target.value)} disabled={busy} />
            </Field>
            <Field label="Field">
              <input aria-label="Field" type="text" maxLength={200} placeholder="Computer Science" className={inputClass} value={field} onChange={(e) => setField(e.target.value)} disabled={busy} />
            </Field>
            <Field label="Career goal">
              <input aria-label="Career goal" type="text" maxLength={500} placeholder="ML engineer" className={inputClass} value={careerGoal} onChange={(e) => setCareerGoal(e.target.value)} disabled={busy} />
            </Field>
            <Field label="GPA">
              <input aria-label="GPA value" type="number" step="any" min="0" placeholder="8.4" className={inputClass} value={gpaValue} onChange={(e) => setGpaValue(e.target.value)} disabled={busy} />
            </Field>
            <Field label="GPA scale">
              <input aria-label="GPA scale" type="number" step="1" min="1" placeholder="10" className={inputClass} value={gpaScale} onChange={(e) => setGpaScale(e.target.value)} disabled={busy} />
            </Field>
            <Field label="IELTS overall">
              <input aria-label="IELTS overall" type="number" step="0.5" min="0" max="9" placeholder="7.5" className={inputClass} value={ielts} onChange={(e) => setIelts(e.target.value)} disabled={busy} />
            </Field>
            <Field label="Preferred intake">
              <input aria-label="Preferred intake" type="text" maxLength={100} placeholder="September 2027" className={inputClass} value={intake} onChange={(e) => setIntake(e.target.value)} disabled={busy} />
            </Field>
            <Field label="Countries (comma-separated)">
              <input aria-label="Preferred countries" type="text" placeholder="UK, Canada" className={inputClass} value={countries} onChange={(e) => setCountries(e.target.value)} disabled={busy} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Budget amount">
                <input aria-label="Budget amount" type="number" step="any" min="0" placeholder="3500000" className={inputClass} value={budgetAmount} onChange={(e) => setBudgetAmount(e.target.value)} disabled={busy} />
              </Field>
              <Field label="Currency">
                <input aria-label="Budget currency" type="text" maxLength={3} placeholder="INR" className={`${inputClass} uppercase`} value={budgetCurrency} onChange={(e) => setBudgetCurrency(e.target.value)} disabled={busy} />
              </Field>
            </div>
          </div>
          {error != null && (
            <p role="alert" className="mt-3 text-[13px] text-red-700">
              {error}
            </p>
          )}
          <div className="mt-4 flex items-center gap-3">
            <Button disabled={busy} onClick={() => void submit()}>
              {busy ? "Creating…" : "Create and open workspace"}
            </Button>
            <Link href="/students" className="text-[13px] font-medium text-slate-500 underline underline-offset-4">
              Cancel
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
