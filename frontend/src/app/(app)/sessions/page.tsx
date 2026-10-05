import { Plus } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const MOCK_SESSIONS = [
  {
    id: "#GG-1042",
    student: "Aarav Sharma",
    date: "Today · 12 min ago",
    status: "Live",
    notes: "Reviewing shortlisted AI programmes for Sep 2027.",
  },
  {
    id: "#GG-1041",
    student: "Diya Patel",
    date: "Yesterday · 45 min",
    status: "Completed",
    notes: "Compared finance programmes; budget discussion pending.",
  },
  {
    id: "#GG-1039",
    student: "Rohan Iyer",
    date: "2 Oct · 30 min",
    status: "Completed",
    notes: "Initial profile capture; IELTS score still missing.",
  },
] as const;

export default function SessionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Sessions"
        subtitle="Review counselling history and continue where you left off."
        actions={
          <Button size="sm">
            <Plus aria-hidden />
            New session
          </Button>
        }
      />

      <Card>
        <CardContent className="divide-y pt-2">
          {MOCK_SESSIONS.map((session) => (
            <div key={session.id} className="flex items-start justify-between gap-4 py-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {session.id} · {session.student}
                  </p>
                  <Badge
                    variant={session.status === "Live" ? "success" : "secondary"}
                  >
                    {session.status}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-slate-400">{session.date}</p>
                <p className="mt-1.5 text-sm text-slate-600">{session.notes}</p>
              </div>
              <Button variant="outline" size="sm" className="shrink-0">
                Open
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-[13px] text-slate-500">
        Session persistence, transcripts, and what-if exploration arrive in a
        later milestone.
      </p>
    </div>
  );
}
