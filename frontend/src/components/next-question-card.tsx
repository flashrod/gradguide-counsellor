"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Crosshair } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { addSessionNote, ApiError, updateStudent } from "@/lib/api";
import type {
  ApiNextQuestion,
  ApiNextQuestionResponse,
} from "@/lib/api-types";
import { formatQaNote, type AnsweredPair } from "@/lib/qa-notes";

interface NextQuestionCardProps {
  data: ApiNextQuestionResponse;
  studentId: string;
  activeSessionId: string | null;
  answered?: AnsweredPair[];
}

const inputClass =
  "w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-white/10";

function FieldAnswer({
  field,
  onSave,
  busy,
}: {
  field: string;
  onSave: (patch: Record<string, unknown>, display: string) => void;
  busy: boolean;
}) {
  const [text, setText] = useState("");
  const [num1, setNum1] = useState("");
  const [num2, setNum2] = useState("");

  function save(): void {
    if (field === "career" || field === "intake") {
      const value = text.trim();
      return onSave(
        field === "career" ? { careerGoal: value } : { preferredIntake: value },
        value
      );
    }
    if (field === "country") {
      const countries = text
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c !== "");
      return onSave({ preferredCountries: countries }, countries.join(", "));
    }
    if (field === "academic") {
      return onSave(
        { gpaValue: Number(num1), gpaScale: Number(num2) },
        `${num1.trim()}/${num2.trim()}`
      );
    }
    if (field === "english") {
      const parts: string[] = [];
      if (num1.trim() !== "") parts.push(`IELTS ${num1.trim()}`);
      if (num2.trim() !== "") parts.push(`TOEFL ${num2.trim()}`);
      return onSave(
        {
          ...(num1 === "" ? {} : { ieltsOverall: Number(num1) }),
          ...(num2 === "" ? {} : { toeflOverall: Number(num2) }),
        },
        parts.join(" · ")
      );
    }
    if (field === "budget") {
      return onSave(
        {
          budgetAmount: Number(num1),
          budgetCurrency: num2.trim().toUpperCase(),
        },
        `${num1.trim()} ${num2.trim().toUpperCase()}`
      );
    }
    if (field === "work-experience") {
      return onSave(
        { workExperienceMonths: Number(num1) },
        `${num1.trim()} months`
      );
    }
    return onSave({ careerGoal: text.trim() }, text.trim());
  }

  if (field === "academic") {
    return (
      <div className="mt-3 flex gap-2">
        <input aria-label="GPA value" type="number" step="any" min="0" placeholder="GPA, e.g. 8.4" className={inputClass} value={num1} onChange={(e) => setNum1(e.target.value)} disabled={busy} />
        <input aria-label="GPA scale" type="number" step="1" min="1" placeholder="Scale, e.g. 10" className={inputClass} value={num2} onChange={(e) => setNum2(e.target.value)} disabled={busy} />
        <SaveButton busy={busy} onSave={save} />
      </div>
    );
  }
  if (field === "english") {
    return (
      <div className="mt-3 flex gap-2">
        <input aria-label="IELTS overall" type="number" step="0.5" min="0" max="9" placeholder="IELTS overall" className={inputClass} value={num1} onChange={(e) => setNum1(e.target.value)} disabled={busy} />
        <input aria-label="TOEFL overall" type="number" step="1" min="0" max="120" placeholder="or TOEFL overall" className={inputClass} value={num2} onChange={(e) => setNum2(e.target.value)} disabled={busy} />
        <SaveButton busy={busy} onSave={save} />
      </div>
    );
  }
  if (field === "budget") {
    return (
      <div className="mt-3 flex gap-2">
        <input aria-label="Budget amount" type="number" step="any" min="0" placeholder="Max total budget" className={inputClass} value={num1} onChange={(e) => setNum1(e.target.value)} disabled={busy} />
        <input aria-label="Budget currency" type="text" maxLength={3} placeholder="INR" className={`${inputClass} max-w-24 uppercase`} value={num2} onChange={(e) => setNum2(e.target.value)} disabled={busy} />
        <SaveButton busy={busy} onSave={save} />
      </div>
    );
  }
  if (field === "work-experience") {
    return (
      <div className="mt-3 flex gap-2">
        <input aria-label="Work experience in months" type="number" step="1" min="0" placeholder="Months, e.g. 12" className={inputClass} value={num1} onChange={(e) => setNum1(e.target.value)} disabled={busy} />
        <SaveButton busy={busy} onSave={save} />
      </div>
    );
  }
  return (
    <div className="mt-3 flex gap-2">
      <input
        aria-label="Answer"
        type="text"
        placeholder={
          field === "country"
            ? "UK, Canada, … (comma-separated)"
            : "Type the student's answer…"
        }
        className={inputClass}
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={busy}
      />
      <SaveButton busy={busy} onSave={save} />
    </div>
  );
}

function SaveButton({ busy, onSave }: { busy: boolean; onSave: () => void }) {
  return (
    <Button
      type="button"
      size="sm"
      className="shrink-0"
      disabled={busy}
      onClick={onSave}
    >
      {busy ? "Saving…" : "Save answer"}
    </Button>
  );
}

function QuestionBody({
  data,
  studentId,
  activeSessionId,
}: {
  data: ApiNextQuestion;
  studentId: string;
  activeSessionId: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  function fail(text: string): void {
    setMessage(text);
    setIsError(true);
    setBusy(false);
  }

  async function saveAnswer(patch: Record<string, unknown>, display: string): Promise<void> {
    if (display === "") {
      fail("Type an answer first.");
      return;
    }
    if (
      Object.values(patch).some(
        (v) => typeof v === "number" && (!Number.isFinite(v) || Number.isNaN(v))
      )
    ) {
      fail("Numbers only in the numeric fields.");
      return;
    }
    setBusy(true);
    setMessage(null);
    setIsError(false);
    try {
      await updateStudent(
        studentId,
        patch as Parameters<typeof updateStudent>[1]
      );
      // Answers belong to the conversation: attach Q&A to the live
      // session so the exchange survives in history.
      if (activeSessionId != null) {
        try {
          await addSessionNote(activeSessionId, formatQaNote(data.question, display));
        } catch {
          setMessage("Saved, but couldn't attach to the session notes.");
          setIsError(false);
          router.refresh();
          return;
        }
      }
      setMessage(
        activeSessionId != null
          ? "Saved — recommendations updated."
          : "Saved — recommendations updated. Start a session to keep answers in history."
      );
      router.refresh();
    } catch (err) {
      fail(err instanceof ApiError ? err.message : "Could not save the answer.");
    } finally {
      setBusy(false);
    }
  }

  async function addToNotes(): Promise<void> {
    if (activeSessionId == null) {
      fail("Start a session first to attach notes.");
      return;
    }
    setBusy(true);
    setMessage(null);
    setIsError(false);
    try {
      await addSessionNote(
        activeSessionId,
        `Next best question (${data.field}): ${data.question} — ${data.reason}`
      );
      setMessage("Added to the active session's notes.");
    } catch (err) {
      fail(err instanceof ApiError ? err.message : "Could not add the note.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <p className="mt-1.5 text-[15px] font-semibold text-slate-900">
        “{data.question}”
      </p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
        Potential impact: {data.affectedRecommendationCount} of your top{" "}
        {data.consideredRecommendationCount} recommendations
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
        <span className="font-medium text-slate-700">Why: </span>
        {data.reason}
      </p>
      <FieldAnswer key={data.field} field={data.field} onSave={(patch, display) => void saveAnswer(patch, display)} busy={busy} />
      {message != null && (
        <p role={isError ? "alert" : "status"} className={`mt-2 text-[13px] ${isError ? "text-red-700" : "text-emerald-700"}`}>
          {message}
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3 bg-white dark:bg-transparent"
        disabled={busy}
        onClick={() => void addToNotes()}
      >
        {busy ? "Working…" : "Add to session notes"}
      </Button>
    </>
  );
}

export function NextQuestionCard({ data, studentId, activeSessionId, answered = [] }: NextQuestionCardProps) {
  if ("status" in data) {
    return (
      <>
        <Card className="border-emerald-200/70 bg-emerald-50/50">
          <CardContent className="flex items-start gap-4 pt-6">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
              <Crosshair className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-800">
                Next best question
              </p>
              <p className="mt-1.5 text-[15px] font-semibold text-slate-900">
                Profile is sufficiently complete
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
                {data.message}
              </p>
            </div>
          </CardContent>
        </Card>
        <AnsweredHistory answered={answered} />
      </>
    );
  }

  return (
    <>
      <Card className="border-amber-200/70 bg-amber-50/50">
        <CardContent className="flex items-start gap-4 pt-6">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
            <Crosshair className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-800">
                Next best question
              </p>
              <Badge variant="warning">{`${data.priority} IMPACT`}</Badge>
            </div>
            <QuestionBody data={data} studentId={studentId} activeSessionId={activeSessionId} />
          </div>
        </CardContent>
      </Card>
      <AnsweredHistory answered={answered} />
    </>
  );
}

function AnsweredHistory({ answered }: { answered: AnsweredPair[] }) {
  if (answered.length === 0) return null;
  return (
    <Card className="mt-4">
      <CardContent className="pt-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Asked &amp; answered · {answered.length}
        </p>
        <ul className="mt-3 space-y-3">
          {answered.map((pair, index) => (
            <li
              key={`${pair.question}-${index}`}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5"
            >
              <p className="text-[13px] font-medium text-slate-900">
                Q: {pair.question}
              </p>
              <p className="mt-1 text-[13px] text-slate-600">A: {pair.answer}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
