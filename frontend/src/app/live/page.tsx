import Link from "next/link";
import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";

import { NextQuestionCard } from "@/components/next-question-card";
import { LiveSessionButton } from "@/components/live-session-button";
import { NoteForm } from "@/components/note-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ApiError,
  getNextQuestion,
  getRecommendations,
  getSessionDetail,
  getStudent,
  listSessions,
  listStudents,
} from "@/lib/api";
import { parseAnsweredNotes } from "@/lib/qa-notes";

/**
 * Live counsel mode — the meeting side panel. A compact single column
 * designed for a narrow window next to Google Meet: who the student is,
 * the top 3 picks with one-line whys, the next question with its answer
 * box, and a note box wired to the live session. No sidebar, no
 * catalogue browsing — everything here fits the conversation.
 */
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-slate-100">
      <header className="sticky top-0 z-10 border-b bg-white/95 backdrop-blur dark:bg-slate-50/95">
        <div className="mx-auto flex max-w-xl items-center gap-2 px-4 py-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-sky-600 text-white">
            <GraduationCap className="h-4 w-4" aria-hidden />
          </span>
          <span className="text-sm font-semibold tracking-tight text-slate-900">
            GradGuide Live
          </span>
          <Link
            href="/workspace"
            className="ml-auto text-xs font-medium text-slate-500 underline underline-offset-4"
          >
            Full workspace
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-xl space-y-4 px-4 py-4">{children}</main>
    </div>
  );
}

export default async function LivePage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>;
}) {
  const { cookies } = await import("next/headers");
  const cookie = (await cookies()).toString();
  const { student: requested } = await searchParams;

  if (requested == null || !UUID_RE.test(requested)) {
    const { students } = await listStudents({ cookie });
    return (
      <Shell>
        <Card>
          <CardContent className="pt-6">
            <h1 className="text-base font-semibold tracking-tight text-slate-900">
              Who are you counselling?
            </h1>
            {students.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">
                No student profiles yet.{" "}
                <Link href="/students" className="font-medium text-slate-900 underline underline-offset-4">
                  Add one first
                </Link>
                .
              </p>
            ) : (
              <ul className="mt-3 divide-y rounded-lg border">
                {students.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/live?student=${s.id}`}
                      className="flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-900 hover:bg-slate-50"
                    >
                      <span>
                        {s.name}
                        {s.field !== "" && (
                          <span className="ml-2 font-normal text-slate-500">{s.field}</span>
                        )}
                      </span>
                      <span aria-hidden>→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </Shell>
    );
  }

  const studentId = requested;
  const [{ student }, data, nextQuestion, { sessions }] = await Promise.all([
    getStudent(studentId),
    getRecommendations(studentId),
    getNextQuestion(studentId),
    listSessions(studentId, { cookie }),
  ]).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) redirect("/students");
    throw error;
  });
    const activeSession =
      sessions.find((session) => session.status === "ACTIVE") ?? null;
    const answered =
      activeSession != null
        ? parseAnsweredNotes(
            (await getSessionDetail(activeSession.id, { cookie })).notes
          )
        : [];
    const topPicks = data.recommendations.slice(0, 3);

  return (
    <Shell>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-medium uppercase tracking-widest text-slate-400">
              Now counselling
            </p>
            <h1 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
              {student.name}
            </h1>
            <p className="mt-0.5 text-[13px] text-slate-500">
              {data.count} ranked recommendation{data.count === 1 ? "" : "s"}
            </p>
          </CardContent>
        </Card>

        <section aria-label="Top picks">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
            Top picks
          </h2>
          {topPicks.length === 0 ? (
            <Card>
              <CardContent className="pt-5 text-sm text-slate-500">
                No recommendations yet for this profile.
              </CardContent>
            </Card>
          ) : (
            <ol className="space-y-2">
              {topPicks.map((rec, i) => (
                <li key={rec.courseId}>
                  <Card>
                    <CardContent className="flex items-start gap-3 pt-4">
                      <Badge variant={i === 0 ? "default" : "secondary"}>
                        #{i + 1} · {rec.overallScore}
                      </Badge>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">
                          {rec.courseName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {rec.universityName} · {rec.universityCountry}
                        </p>
                        {rec.reasons[0] != null && (
                          <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
                            {rec.reasons[0].message}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section aria-label="Next question">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
            Ask next
          </h2>
          <NextQuestionCard
            data={nextQuestion}
            studentId={studentId}
            activeSessionId={activeSession?.id ?? null}
            answered={answered}
          />
        </section>

        <section aria-label="Session notes">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
            Notes
          </h2>
          <Card>
            <CardContent className="pt-5">
              {activeSession != null ? (
                <NoteForm sessionId={activeSession.id} />
              ) : (
                <LiveSessionButton studentId={studentId} />
              )}
            </CardContent>
          </Card>
        </section>
    </Shell>
  );
}
