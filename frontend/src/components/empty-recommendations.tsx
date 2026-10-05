import { Inbox } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export function EmptyRecommendations({
  title = "No strong matches yet",
  description = "Every course in the catalogue was either ineligible for this student or the profile is missing information the engine needs. Complete the GPA, English scores, and intake details, then check the next best question below.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center px-6 py-12 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <Inbox className="h-5 w-5" aria-hidden />
        </span>
        <h2 className="mt-4 text-base font-semibold tracking-tight text-slate-900">
          {title}
        </h2>
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-slate-500">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
