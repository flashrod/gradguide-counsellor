import Link from "next/link";
import { MapPin, Search } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { getCatalogueMeta, listCatalogue } from "@/lib/api";

/**
 * Live course catalogue explorer (Milestone 12). Server-side search,
 * filters, and sorting over GET /api/courses. Unknowns render as such.
 */
export const dynamic = "force-dynamic";

type SearchParams = {
  search?: string;
  country?: string;
  field?: string;
  degree?: string;
  sort?: string;
};

function selectClass(): string {
  return "rounded-md border border-input bg-background px-2 py-1.5 text-sm";
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const [catalogue, meta] = await Promise.all([
    listCatalogue({
      search: params.search,
      country: params.country,
      field: params.field,
      degree: params.degree,
    }),
    getCatalogueMeta(),
  ]);

  const sort = params.sort ?? "university";
  const courses = [...catalogue.courses].sort((a, b) => {
    if (sort === "course") return a.courseName.localeCompare(b.courseName);
    if (sort === "country")
      return (
        a.country.localeCompare(b.country) ||
        a.universityName.localeCompare(b.universityName)
      );
    return (
      a.universityName.localeCompare(b.universityName) ||
      a.courseName.localeCompare(b.courseName)
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Courses"
        subtitle={`${catalogue.total} programmes in the catalogue.`}
      />

      <Card>
        <CardContent className="pt-6">
          <form method="GET" className="flex flex-wrap items-end gap-2">
            <label className="block text-xs font-medium text-slate-600">
              Search
              <span className="mt-1 flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5">
                <Search className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                <input
                  name="search"
                  defaultValue={params.search ?? ""}
                  placeholder="Course or university…"
                  className="w-44 bg-transparent text-sm outline-none"
                />
              </span>
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Country
              <select name="country" defaultValue={params.country ?? ""} className={`${selectClass()} mt-1 block`}>
                <option value="">All</option>
                {meta.countries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Field
              <select name="field" defaultValue={params.field ?? ""} className={`${selectClass()} mt-1 block`}>
                <option value="">All</option>
                {meta.fields.map((field) => (
                  <option key={field} value={field}>
                    {field}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Degree
              <select name="degree" defaultValue={params.degree ?? ""} className={`${selectClass()} mt-1 block`}>
                <option value="">All</option>
                {meta.degrees.map((degree) => (
                  <option key={degree} value={degree}>
                    {degree}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Sort
              <select name="sort" defaultValue={sort} className={`${selectClass()} mt-1 block`}>
                <option value="university">University</option>
                <option value="course">Course</option>
                <option value="country">Country</option>
              </select>
            </label>
            <Button type="submit" size="sm">
              Apply
            </Button>
          </form>
        </CardContent>
      </Card>

      {courses.length === 0 ? (
        <Card>
          <CardContent className="px-6 py-12 text-center">
            <p className="text-base font-semibold text-slate-900">No courses match</p>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
              Try widening the search or clearing a filter.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <Card key={course.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col pt-6">
                <Badge variant="info" className="self-start">
                  <MapPin className="mr-1 h-3 w-3" aria-hidden />
                  {course.country}
                </Badge>
                <h3 className="mt-3 text-[15px] font-semibold tracking-tight text-slate-900">
                  {course.courseName}
                </h3>
                <p className="mt-1 text-sm text-slate-500">{course.universityName}</p>
                <dl className="mt-3 space-y-1 text-[13px]">
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Degree</dt>
                    <dd className="font-medium text-slate-900">{course.degreeType}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Tuition</dt>
                    <dd className="font-medium tabular-nums text-slate-900">
                      {course.tuitionAmount != null && course.tuitionCurrency != null
                        ? `${course.tuitionCurrency} ${course.tuitionAmount.toLocaleString("en-US")}`
                        : "Unknown"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">English</dt>
                    <dd className="font-medium tabular-nums text-slate-900">
                      {course.minIeltsOverall != null
                        ? `IELTS ${course.minIeltsOverall}`
                        : course.minToeflOverall != null
                          ? `TOEFL ${course.minToeflOverall}`
                          : "Unknown"}
                    </dd>
                  </div>
                </dl>
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href={`/courses/${course.id}`}>View details</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
