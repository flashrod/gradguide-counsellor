import { Crosshair } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { NextQuestion } from "@/lib/types";

interface NextQuestionCardProps {
  question: NextQuestion;
}

export function NextQuestionCard({ question }: NextQuestionCardProps) {
  return (
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
            <Badge variant="warning">{question.category}</Badge>
          </div>
          <p className="mt-1.5 text-[15px] font-semibold text-slate-900">
            {question.question}
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
            {question.reason}
          </p>
          <Button variant="outline" size="sm" className="mt-3 bg-white">
            Add to session notes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
