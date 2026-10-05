"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Workspace failed to load:", error);
  }, [error]);

  return (
    <Card>
      <CardContent className="flex flex-col items-center px-6 py-12 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600">
          <TriangleAlert className="h-5 w-5" aria-hidden />
        </span>
        <h2 className="mt-4 text-base font-semibold tracking-tight text-slate-900">
          Unable to load recommendations
        </h2>
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-slate-500">
          {error.message ||
            "The recommendation service could not be reached. Check that the backend is running, then try again."}
        </p>
        <Button size="sm" className="mt-5" onClick={() => reset()}>
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}
