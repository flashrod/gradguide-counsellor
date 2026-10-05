import { ArrowLeftRight, CircleHelp, MapPin } from "lucide-react";

import { MatchScore } from "@/components/match-score";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { CourseRecommendation } from "@/lib/types";

interface RecommendationCardProps {
  recommendation: CourseRecommendation;
}

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  return (
    <Card className="flex flex-col">
      <CardContent className="flex flex-1 flex-col pt-6">
        <div className="flex items-start justify-between gap-3">
          <Badge variant="info">
            <MapPin className="mr-1 h-3 w-3" aria-hidden />
            {recommendation.country}
          </Badge>
          <span className="text-xs font-medium text-slate-400">
            {recommendation.duration}
          </span>
        </div>

        <h3 className="mt-3 text-[15px] font-semibold leading-snug tracking-tight text-slate-900">
          {recommendation.courseName}
        </h3>
        <p className="mt-1 text-sm text-slate-500">{recommendation.university}</p>

        <dl className="mt-4 space-y-1.5 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Tuition</dt>
            <dd className="font-medium tabular-nums text-slate-900">
              {recommendation.tuition}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Intake</dt>
            <dd className="font-medium text-slate-900">{recommendation.intake}</dd>
          </div>
        </dl>

        <Separator className="my-4" />

        <MatchScore score={recommendation.matchScore} />

        <p className="mt-3 line-clamp-3 text-[13px] leading-relaxed text-slate-600">
          {recommendation.explanation}
        </p>
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="outline" size="sm" className="flex-1">
          <CircleHelp aria-hidden />
          Why?
        </Button>
        <Button variant="secondary" size="sm" className="flex-1">
          <ArrowLeftRight aria-hidden />
          Compare
        </Button>
      </CardFooter>
    </Card>
  );
}
