"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ApiError,
  createDeadline,
  deleteDeadline,
  setDeadlineDone,
  type ApiDeadline,
} from "@/lib/api";
import type { ApiStudentSummary } from "@/lib/api-types";

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function daysUntil(dueDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate}T00:00:00`);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

function DueLabel({ dueDate }: { dueDate: string }) {
  const days = daysUntil(dueDate);
  if (days < 0)
    return (
      <Badge variant="destructive">
        Overdue by {-days} day{-days === 1 ? "" : "s"}
      </Badge>
    );
  if (days === 0) return <Badge variant="warning">Due today</Badge>;
  if (days === 1) return <Badge variant="warning">Due tomorrow</Badge>;
  return <Badge variant="secondary">Due in {days} days</Badge>;
}

export function DeadlineBoard({
  initial,
  students,
}: {
  initial: ApiDeadline[];
  students: ApiStudentSummary[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [studentId, setStudentId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(): Promise<void> {
    if (title.trim() === "" || dueDate === "") {
      setError("Give the reminder a title and a due date.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createDeadline({
        title: title.trim(),
        dueDate,
        studentId: studentId === "" ? null : studentId,
      });
      setTitle("");
      setDueDate("");
      setStudentId("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the reminder.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(deadline: ApiDeadline): Promise<void> {
    try {
      await setDeadlineDone(deadline.id, !deadline.done);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update the reminder.");
    }
  }

  async function remove(deadlineId: string): Promise<void> {
    try {
      await deleteDeadline(deadlineId);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete the reminder.");
    }
  }

  const open = initial.filter((d) => !d.done);
  const done = initial.filter((d) => d.done);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-sm font-semibold tracking-tight text-slate-900">
            New reminder
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-slate-600 sm:col-span-2">
              Title
              <input
                aria-label="Reminder title"
                type="text"
                maxLength={200}
                placeholder="Dalhousie MACS application due"
                className={`${inputClass} mt-1`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Due date
              <input
                aria-label="Due date"
                type="date"
                required
                className={`${inputClass} mt-1`}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Student (optional)
              <select
                aria-label="Linked student"
                className={`${inputClass} mt-1`}
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              >
                <option value="">No student</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {error != null && (
            <p role="alert" className="mt-2 text-[13px] text-red-700">
              {error}
            </p>
          )}
          <Button size="sm" className="mt-3" disabled={busy} onClick={() => void add()}>
            {busy ? "Saving…" : "Add reminder"}
          </Button>
        </CardContent>
      </Card>

      <section aria-label="Upcoming reminders">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Upcoming · {open.length}
        </h2>
        {open.length === 0 ? (
          <Card>
            <CardContent className="pt-5 text-sm text-slate-500">
              Nothing on the horizon. Add the first reminder above.
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-2">
            {open.map((d) => (
              <li key={d.id}>
                <Card>
                  <CardContent className="flex flex-wrap items-center gap-3 pt-4">
                    <input
                      type="checkbox"
                      aria-label={`Mark done: ${d.title}`}
                      checked={false}
                      onChange={() => void toggle(d)}
                      className="h-4 w-4 accent-slate-900"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">{d.title}</p>
                      <p className="text-xs text-slate-500">
                        {d.dueDate}
                        {d.studentName != null && ` · ${d.studentName}`}
                      </p>
                    </div>
                    <DueLabel dueDate={d.dueDate} />
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Delete: ${d.title}`}
                      onClick={() => void remove(d.id)}
                    >
                      Delete
                    </Button>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {done.length > 0 && (
        <section aria-label="Done reminders">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
            Done · {done.length}
          </h2>
          <ul className="space-y-2">
            {done.map((d) => (
              <li key={d.id}>
                <Card className="opacity-70">
                  <CardContent className="flex flex-wrap items-center gap-3 pt-4">
                    <input
                      type="checkbox"
                      aria-label={`Reopen: ${d.title}`}
                      checked
                      onChange={() => void toggle(d)}
                      className="h-4 w-4 accent-slate-900"
                    />
                    <p className="min-w-0 flex-1 text-sm text-slate-600 line-through">
                      {d.title}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Delete: ${d.title}`}
                      onClick={() => void remove(d.id)}
                    >
                      Delete
                    </Button>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
