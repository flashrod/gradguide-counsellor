"use client";

import { useState } from "react";
import { BookmarkPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ApiError, saveSessionComparison } from "@/lib/api";

interface SaveComparisonButtonProps {
  activeSessionId: string | null;
  courseIds: string[];
}

export function SaveComparisonButton({
  activeSessionId,
  courseIds,
}: SaveComparisonButtonProps) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (activeSessionId == null) {
    return (
      <span className="text-xs text-slate-400">
        Start a session to save this comparison.
      </span>
    );
  }

  async function save(): Promise<void> {
    const sessionId = activeSessionId;
    if (sessionId == null) return;
    setSaving(true);
    setError(null);
    try {
      await saveSessionComparison(sessionId, courseIds);
      setSaved(true);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not save the comparison."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <span className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => void save()}
        disabled={saving || saved}
      >
        <BookmarkPlus aria-hidden />
        {saved ? "Saved to session" : saving ? "Saving…" : "Save comparison to session"}
      </Button>
      {error != null && (
        <span role="alert" className="text-xs text-red-700">
          {error}
        </span>
      )}
    </span>
  );
}
