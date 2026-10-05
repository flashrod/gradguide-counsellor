"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleDot, Play, Square } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ApiError, createSession, endSession } from "@/lib/api";

interface SessionBarProps {
  studentId: string;
  activeSession: { id: string; startedAt: string } | null;
}

export function SessionBar({ studentId, activeSession }: SessionBarProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await createSession(studentId);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not start the session.");
    } finally {
      setBusy(false);
    }
  }

  async function end(): Promise<void> {
    if (activeSession == null) return;
    setBusy(true);
    setError(null);
    try {
      await endSession(activeSession.id);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not end the session.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div className="flex items-center gap-2.5">
          {activeSession != null ? (
            <>
              <Badge variant="success">
                <CircleDot className="mr-1 h-3 w-3" aria-hidden />
                Session active
              </Badge>
              <p className="text-[13px] text-slate-500">
                Started{" "}
                {new Intl.DateTimeFormat("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                }).format(new Date(activeSession.startedAt))}
              </p>
            </>
          ) : (
            <p className="text-[13px] text-slate-500">
              No active session. Start one to snapshot recommendations as you counsel.
            </p>
          )}
        </div>
        {activeSession != null ? (
          <Button size="sm" variant="outline" onClick={() => void end()} disabled={busy}>
            <Square aria-hidden />
            End session
          </Button>
        ) : (
          <Button size="sm" onClick={() => void start()} disabled={busy}>
            <Play aria-hidden />
            Start counselling session
          </Button>
        )}
      </CardContent>
      {error != null && (
        <p role="alert" className="px-6 pb-4 text-[13px] text-red-700">
          {error}
        </p>
      )}
    </Card>
  );
}
