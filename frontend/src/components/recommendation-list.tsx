"use client";

import { useState } from "react";
import Link from "next/link";

import { RecommendationCard } from "@/components/recommendation-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ApiRecommendation } from "@/lib/api-types";

export const MAX_COMPARE_SELECTION = 3;

/** Page size: the question card should be reachable without scrolling far. */
export const RECOMMENDATION_PAGE_SIZE = 6;

interface RecommendationListProps {
  recommendations: ApiRecommendation[];
  studentId: string;
}

export function RecommendationList({ recommendations, studentId }: RecommendationListProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  function toggleSelect(courseId: string): void {
    if (selectedIds.includes(courseId)) {
      setNotice(null);
      setSelectedIds(selectedIds.filter((id) => id !== courseId));
      return;
    }
    if (selectedIds.length >= MAX_COMPARE_SELECTION) {
      setNotice("Compare up to 3 courses at a time.");
      return;
    }
    setNotice(null);
    setSelectedIds([...selectedIds, courseId]);
  }

  function clearSelection(): void {
    setSelectedIds([]);
    setNotice(null);
  }

  const visible = expanded
    ? recommendations
    : recommendations.slice(0, RECOMMENDATION_PAGE_SIZE);
  const hiddenCount = recommendations.length - visible.length;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((recommendation) => (
          <RecommendationCard
            key={recommendation.courseId}
            recommendation={recommendation}
            selected={selectedIds.includes(recommendation.courseId)}
            onToggleSelect={toggleSelect}
          />
        ))}
      </div>

      {hiddenCount > 0 && !expanded && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setExpanded(true)}
        >
          Show {hiddenCount} more recommendation{hiddenCount === 1 ? "" : "s"}
        </Button>
      )}
      {expanded && recommendations.length > RECOMMENDATION_PAGE_SIZE && (
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => setExpanded(false)}
        >
          Show less
        </Button>
      )}
      {notice != null && (
        <p role="alert" className="text-[13px] text-amber-700">
          {notice}
        </p>
      )}

      {selectedIds.length > 0 && (
        <div className="sticky bottom-4 z-10">
          <Card className="shadow-lg">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="flex items-center gap-2.5">
              <Badge variant="secondary">{selectedIds.length} selected</Badge>
              <p className="text-[13px] text-slate-500">
                {selectedIds.length < 2
                  ? "Select at least 2 courses to compare."
                  : "Ready to compare side-by-side."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={clearSelection}>
                Clear
              </Button>
              <Button size="sm" disabled={selectedIds.length < 2} asChild>
                <Link
                  href={`/workspace/compare?student=${studentId}&ids=${selectedIds.join(",")}`}
                  aria-disabled={selectedIds.length < 2}
                >
                  Compare selected
                </Link>
              </Button>
            </div>
          </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
