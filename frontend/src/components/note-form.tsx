"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ApiError, addSessionNote } from "@/lib/api";

export function NoteForm({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(): Promise<void> {
    if (content.trim() === "") return;
    setBusy(true);
    setError(null);
    try {
      await addSessionNote(sessionId, content.trim());
      setContent("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the note.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label
        htmlFor="session-note"
        className="text-xs font-medium uppercase tracking-wide text-slate-400"
      >
        Add a note
      </label>
      <textarea
        id="session-note"
        rows={3}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Student prefers North America, Fall intake…"
        className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="mt-2 flex items-center gap-2">
        <Button size="sm" onClick={() => void submit()} disabled={busy || content.trim() === ""}>
          Save note
        </Button>
        {error != null && (
          <p role="alert" className="text-[13px] text-red-700">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
