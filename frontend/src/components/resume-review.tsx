"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, FileUp, Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ApiError,
  confirmResume,
  getResumeDetail,
  getStudent,
  listStudents,
  uploadResume,
  type ResumeConfirmProfile,
} from "@/lib/api";
import type { ApiResumeDetail, ApiStudent, ApiStudentSummary } from "@/lib/api-types";

type Phase = "upload" | "review" | "done";

const inputClass =
  "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none";

function SourceBadge({ source }: { source: "resume" | "manual" | "missing" }) {
  if (source === "resume")
    return <Badge variant="warning">From resume · review</Badge>;
  if (source === "manual")
    return <Badge variant="info">Entered by counsellor</Badge>;
  return <Badge variant="secondary">Not provided</Badge>;
}

function fieldOf(
  resume: ApiResumeDetail,
  field: string
): { value: string | number | null; scale: number | null; evidence: string[]; alternatives: { value: number; scale: number | null; snippet: string }[] } {
  const found = resume.candidate?.fields.find((f) => f.field === field);
  return {
    value: found?.value ?? null,
    scale: found?.scale ?? null,
    evidence: found?.evidence ?? [],
    alternatives: found?.alternatives ?? [],
  };
}

interface ResumeReviewProps {
  preselectedStudentId: string | null;
}

export function ResumeReview({ preselectedStudentId }: ResumeReviewProps) {
  const [phase, setPhase] = useState<Phase>("upload");
  const [students, setStudents] = useState<ApiStudentSummary[]>([]);
  const [target, setTarget] = useState<string>(preselectedStudentId ?? "new");
  const [file, setFile] = useState<File | null>(null);
  const [resume, setResume] = useState<ApiResumeDetail | null>(null);
  const [existing, setExisting] = useState<ApiStudent | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable review values, seeded from the extraction on upload.
  const [values, setValues] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [gpaAlt, setGpaAlt] = useState<number>(-1);
  const [keepExisting, setKeepExisting] = useState<Record<string, boolean>>({});
  const [newName, setNewName] = useState("");
  const [careerGoal, setCareerGoal] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetCurrency, setBudgetCurrency] = useState("");
  const [countries, setCountries] = useState("");
  const [intake, setIntake] = useState("");
  const [confirmedStudentId, setConfirmedStudentId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listStudents()
      .then(({ students: rows }) => {
        if (!cancelled) setStudents(rows);
      })
      .catch(() => {
        if (!cancelled) setStudents([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function seedFromResume(detail: ApiResumeDetail): void {
    const next: Record<string, string> = {};
    for (const name of ["name", "degree", "field", "ieltsOverall", "toeflOverall", "workExperienceMonths"]) {
      const f = fieldOf(detail, name);
      if (f.value != null) next[name] = String(f.value);
    }
    const gpa = fieldOf(detail, "gpa");
    if (gpa.value != null) {
      next["gpaValue"] = String(gpa.value);
      if (gpa.scale != null) next["gpaScale"] = String(gpa.scale);
    }
    setValues(next);
    setDirty({});
    setGpaAlt(-1);
    setKeepExisting({});
    setNewName(detail.extraction?.personal.name ?? "");
    setCareerGoal("");
    setBudgetAmount("");
    setBudgetCurrency("");
    setCountries("");
    setIntake("");
  }

  async function handleUpload(): Promise<void> {
    setError(null);
    if (file == null) {
      setError("Choose a PDF resume first.");
      return;
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF resumes are accepted.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Resume must be under 5 MB.");
      return;
    }
    setBusy(true);
    try {
      const { resume: detail } = await uploadResume(
        file,
        target === "new" ? undefined : target
      );
      if (detail.status === "failed") {
        setError(detail.errorMessage ?? "Text could not be extracted from this resume.");
        return;
      }
      setResume(detail);
      seedFromResume(detail);
      if (target !== "new") {
        try {
          const { student } = await getStudent(target);
          setExisting(student);
        } catch {
          setExisting(null);
        }
      } else {
        setExisting(null);
      }
      setPhase("review");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  function setValue(name: string, value: string): void {
    setValues((prev) => ({ ...prev, [name]: value }));
    setDirty((prev) => ({ ...prev, [name]: true }));
  }

  function existingValue(name: string): string | null {
    if (existing == null) return null;
    switch (name) {
      case "degree":
        return existing.degree || null;
      case "field":
        return existing.field || null;
      case "gpaValue":
        return existing.gpa.value != null ? String(existing.gpa.value) : null;
      case "ieltsOverall":
        return existing.ielts.overall != null ? String(existing.ielts.overall) : null;
      case "toeflOverall":
        return existing.toeflOverall != null ? String(existing.toeflOverall) : null;
      case "workExperienceMonths":
        return existing.workExperienceMonths != null ? String(existing.workExperienceMonths) : null;
      default:
        return null;
    }
  }

  function hasConflict(name: string): boolean {
    const current = existingValue(name);
    const candidate = values[name];
    return (
      current != null &&
      current !== "" &&
      candidate != null &&
      candidate !== "" &&
      current !== candidate
    );
  }

  function sourceOf(name: string): "resume" | "manual" | "missing" {
    if (values[name] != null && values[name] !== "") {
      return dirty[name] === true ? "manual" : "resume";
    }
    return "missing";
  }

  async function handleConfirm(): Promise<void> {
    if (resume == null) return;
    setError(null);
    if (target === "new" && newName.trim() === "") {
      setError("Enter the student's name to create a profile.");
      return;
    }
    const num = (raw: string | undefined): number | undefined => {
      if (raw == null || raw.trim() === "") return undefined;
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : undefined;
    };
    const profile: ResumeConfirmProfile = {};
    const fieldSources: Record<string, "resume" | "manual"> = {};
    const take = (name: string, key: keyof ResumeConfirmProfile, numeric = false): void => {
      if (keepExisting[name] === true) return;
      const raw = values[name];
      if (raw == null || raw.trim() === "") return;
      (profile as Record<string, unknown>)[key] = numeric ? num(raw) : raw.trim();
      if ((profile as Record<string, unknown>)[key] === undefined) return;
      fieldSources[name] = dirty[name] === true ? "manual" : "resume";
    };
    take("degree", "degree");
    take("field", "field");
    take("gpaValue", "gpaValue", true);
    if (values["gpaValue"] != null && values["gpaValue"] !== "" && values["gpaScale"] != null && values["gpaScale"] !== "") {
      profile.gpaScale = num(values["gpaScale"]);
    }
    take("ieltsOverall", "ieltsOverall", true);
    take("toeflOverall", "toeflOverall", true);
    take("workExperienceMonths", "workExperienceMonths", true);
    if (careerGoal.trim() !== "") {
      profile.careerGoal = careerGoal.trim();
      fieldSources["careerGoal"] = "manual";
    }
    if (budgetAmount.trim() !== "") {
      const amount = num(budgetAmount);
      const currency = budgetCurrency.trim().toUpperCase();
      if (amount != null) {
        profile.budgetAmount = amount;
        // Currency is optional: without it the engine treats the budget
        // as unknown rather than guessing a currency.
        if (/^[A-Z]{3}$/.test(currency)) profile.budgetCurrency = currency;
        fieldSources["budgetAmount"] = "manual";
      }
    }
    if (countries.trim() !== "") {
      profile.preferredCountries = countries.split(",").map((s) => s.trim()).filter(Boolean);
      fieldSources["preferredCountries"] = "manual";
    }
    if (intake.trim() !== "") {
      profile.preferredIntake = intake.trim();
      fieldSources["preferredIntake"] = "manual";
    }
    setBusy(true);
    try {
      const result = await confirmResume(resume.id, {
        ...(target === "new" ? { createStudent: { name: newName.trim() } } : { studentId: target }),
        profile,
        fieldSources,
      });
      const refreshed = await getResumeDetail(resume.id);
      setResume(refreshed.resume);
      setConfirmedStudentId(result.studentId);
      setPhase("done");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Confirmation failed.");
    } finally {
      setBusy(false);
    }
  }

  function gpaAlternatives(): { value: number; scale: number | null; snippet: string }[] {
    if (resume == null) return [];
    return fieldOf(resume, "gpa").alternatives;
  }

  function applyGpaAlternative(index: number): void {
    const alt = gpaAlternatives()[index];
    if (alt == null) return;
    setValues((prev) => ({
      ...prev,
      gpaValue: String(alt.value),
      ...(alt.scale != null ? { gpaScale: String(alt.scale) } : {}),
    }));
    setDirty((prev) => ({ ...prev, gpaValue: true }));
    setGpaAlt(index);
  }

  if (phase === "done" && confirmedStudentId != null) {
    return (
      <Card>
        <CardContent className="space-y-3 pt-6">
          <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            Profile confirmed — recommendations use the existing engine.
          </p>
          <Button size="sm" asChild>
            <Link href={`/workspace?student=${confirmedStudentId}`}>View recommendations</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (phase === "review" && resume != null) {
    const extraction = resume.extraction;
    const skillGroups = extraction?.skills;
    const allSkills = skillGroups == null ? [] : [...skillGroups.languages, ...skillGroups.frameworks, ...skillGroups.databases, ...skillGroups.cloudTools, ...skillGroups.aiMl, ...skillGroups.other];
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900">Review extracted profile</h2>
              <Badge variant="warning">Review required</Badge>
            </div>
            <p className="text-[13px] text-slate-500">
              {resume.fileName} · {resume.pageCount} page{resume.pageCount === 1 ? "" : "s"} ·{" "}
              {target === "new" ? "new student" : "attached to existing student"}
            </p>

            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="rr-name">
                Student name
              </label>
              {target === "new" ? (
                <input id="rr-name" className={inputClass} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Full name" />
              ) : (
                <p className="mt-1 text-sm text-slate-900">{existing?.name ?? "…"}</p>
              )}
            </div>

            {(["degree", "field"] as const).map((name) => (
              <div key={name}>
                <label className="text-sm font-medium capitalize text-slate-700" htmlFor={`rr-${name}`}>
                  {name} {hasConflict(name) && <AlertTriangle className="ml-1 inline h-3.5 w-3.5 text-amber-600" aria-label="conflict" />}
                </label>
                <input
                  id={`rr-${name}`}
                  className={inputClass}
                  value={values[name] ?? ""}
                  onChange={(e) => setValue(name, e.target.value)}
                  placeholder="Not provided"
                />
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <SourceBadge source={sourceOf(name)} />
                  {hasConflict(name) && (
                    <label className="flex items-center gap-1.5 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={keepExisting[name] !== true}
                        onChange={(e) => setKeepExisting((prev) => ({ ...prev, [name]: !e.target.checked }))}
                      />
                      Use resume value ({values[name]}) instead of existing ({existingValue(name)})
                    </label>
                  )}
                </div>
              </div>
            ))}

            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="rr-gpa">
                GPA {hasConflict("gpaValue") && <AlertTriangle className="ml-1 inline h-3.5 w-3.5 text-amber-600" aria-label="conflict" />}
              </label>
              <div className="flex gap-2">
                <input id="rr-gpa" className={inputClass} value={values["gpaValue"] ?? ""} onChange={(e) => setValue("gpaValue", e.target.value)} placeholder="Not provided" inputMode="decimal" />
                <input aria-label="GPA scale" className={inputClass} value={values["gpaScale"] ?? ""} onChange={(e) => setValue("gpaScale", e.target.value)} placeholder="Scale" inputMode="numeric" />
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <SourceBadge source={sourceOf("gpaValue")} />
                {values["gpaValue"] != null && values["gpaValue"] !== "" && (values["gpaScale"] == null || values["gpaScale"] === "") && (
                  <span className="text-xs text-amber-700">Scale unknown — stored as unknown, never assumed.</span>
                )}
              </div>
              {gpaAlternatives().length > 0 && (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-medium text-amber-900">Multiple GPAs found — pick the overall figure:</p>
                  {gpaAlternatives().map((alt, i) => (
                    <label key={i} className="mt-1 flex items-center gap-2 text-xs text-amber-900">
                      <input type="radio" name="gpa-alt" checked={gpaAlt === i} onChange={() => applyGpaAlternative(i)} />
                      {alt.value}{alt.scale != null ? ` / ${alt.scale}` : " (scale unknown)"} — {alt.snippet}
                    </label>
                  ))}
                </div>
              )}
              {hasConflict("gpaValue") && (
                <label className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={keepExisting["gpaValue"] !== true}
                    onChange={(e) => setKeepExisting((prev) => ({ ...prev, gpaValue: !e.target.checked }))}
                  />
                  Use resume value ({values["gpaValue"]}) instead of existing ({existingValue("gpaValue")})
                </label>
              )}
            </div>

            {(["ieltsOverall", "toeflOverall", "workExperienceMonths"] as const).map((name) => (
              <div key={name}>
                <label className="text-sm font-medium text-slate-700" htmlFor={`rr-${name}`}>
                  {name === "ieltsOverall" ? "IELTS overall" : name === "toeflOverall" ? "TOEFL overall" : "Work experience (months)"}
                </label>
                <input id={`rr-${name}`} className={inputClass} value={values[name] ?? ""} onChange={(e) => setValue(name, e.target.value)} placeholder="Not provided" inputMode="decimal" />
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <SourceBadge source={sourceOf(name)} />
                  {hasConflict(name) && (
                    <label className="flex items-center gap-1.5 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={keepExisting[name] !== true}
                        onChange={(e) => setKeepExisting((prev) => ({ ...prev, [name]: !e.target.checked }))}
                      />
                      Use resume value ({values[name]}) instead of existing ({existingValue(name)})
                    </label>
                  )}
                </div>
              </div>
            ))}

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Counsellor input — never inferred from resumes</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <input aria-label="Career goal" className={inputClass} value={careerGoal} onChange={(e) => setCareerGoal(e.target.value)} placeholder="Career goal (e.g. AI/ML)" />
                <input aria-label="Preferred intake" className={inputClass} value={intake} onChange={(e) => setIntake(e.target.value)} placeholder="Preferred intake" />
                <input aria-label="Budget amount" className={inputClass} value={budgetAmount} onChange={(e) => setBudgetAmount(e.target.value)} placeholder="Budget amount" inputMode="decimal" />
                <input aria-label="Budget currency" className={inputClass} value={budgetCurrency} onChange={(e) => setBudgetCurrency(e.target.value.toUpperCase().slice(0, 3))} placeholder="Currency code" />
                <input aria-label="Preferred countries" className={`${inputClass} sm:col-span-2`} value={countries} onChange={(e) => setCountries(e.target.value)} placeholder="Preferred countries, comma separated" />
              </div>
            </div>

            {allSkills.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-700">Skills evidence</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {allSkills.map((skill) => (
                    <Badge key={skill} variant="secondary">{skill}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => void handleConfirm()} disabled={busy}>
                <Pencil aria-hidden />
                {busy ? "Confirming…" : "Confirm profile"}
              </Button>
              {error != null && (
                <p role="alert" className="text-[13px] text-red-700">{error}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900">Upload resume</h2>
          <Badge variant="secondary">PDF up to 5 MB</Badge>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700" htmlFor="rr-target">
            Attach to
          </label>
          <select id="rr-target" className={inputClass} value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="new">New student profile</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}{s.degree !== "" ? ` — ${s.degree}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700" htmlFor="rr-file">
            Resume file
          </label>
          <input
            id="rr-file"
            type="file"
            accept="application/pdf,.pdf"
            className="mt-1 block w-full text-sm text-slate-600"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        {error != null && (
          <p role="alert" className="text-[13px] text-red-700">{error}</p>
        )}
        <Button size="sm" onClick={() => void handleUpload()} disabled={busy || file == null}>
          <FileUp aria-hidden />
          {busy ? "Extracting…" : "Extract information"}
        </Button>
        <p className="text-xs text-slate-500">
          Text-based PDFs only — scanned resumes fall back to manual entry. Nothing is saved to the
          student profile until you confirm.
        </p>
      </CardContent>
    </Card>
  );
}
