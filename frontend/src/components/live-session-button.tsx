"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Radio } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ApiError, createSession } from "@/lib/api";

/** Minimal "go live" control for the meeting side panel. */
export function LiveSessionButton({ studentId }: { studentId: string }) {
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

  return (
    <div>
      <Button onClick={() => void start()} disabled={busy} className="w-full">
        <Radio className="mr-2 h-4 w-4" aria-hidden />
        {busy ? "Starting…" : "Start live session"}
      </Button>
      {error != null && (
        <p role="alert" className="mt-2 text-[13px] text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
