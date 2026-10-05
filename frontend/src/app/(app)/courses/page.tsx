import { MapPin, SlidersHorizontal } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

const MOCK_COURSES = [
  {
    name: "MSc Artificial Intelligence",
    university: "University of Manchester",
    country: "UK",
    tuition: "£28,500 / yr",
  },
  {
    name: "MSc Machine Learning",
    university: "University College London",
    country: "UK",
    tuition: "£32,100 / yr",
  },
  {
    name: "MACS — Applied Computer Science",
    university: "Dalhousie University",
    country: "Canada",
    tuition: "CA$24,300 / yr",
  },
] as const;

export default function CoursesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Courses"
        subtitle="Browse the course and university catalogue."
        actions={
          <Button variant="outline" size="sm">
            <SlidersHorizontal aria-hidden />
            Filters
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Universities", value: "148" },
          { label: "Courses indexed", value: "1,204" },
          { label: "Countries", value: "6" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {stat.label}
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {MOCK_COURSES.map((course) => (
          <Card key={course.name}>
            <CardContent className="pt-6">
              <Badge variant="info">
                <MapPin className="mr-1 h-3 w-3" aria-hidden />
                {course.country}
              </Badge>
              <h3 className="mt-3 text-[15px] font-semibold tracking-tight text-slate-900">
                {course.name}
              </h3>
              <p className="mt-1 text-sm text-slate-500">{course.university}</p>
              <p className="mt-3 text-sm font-medium tabular-nums text-slate-900">
                {course.tuition}
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" className="w-full">
                View details
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <p className="text-[13px] text-slate-500">
        Course search, filters, and the university database arrive in a later
        milestone.
      </p>
    </div>
  );
}
