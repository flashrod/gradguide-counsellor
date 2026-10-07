import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Workspace preferences for the counselling team."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">Workspace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="font-medium text-slate-900">Organisation</p>
              <p className="mt-0.5 text-slate-500">GradGuide Counselling · Mumbai</p>
            </div>
            <Separator />
            <div>
              <p className="font-medium text-slate-900">Default intake</p>
              <p className="mt-0.5 text-slate-500">September 2027</p>
            </div>
            <Separator />
            <div>
              <p className="font-medium text-slate-900">Currency display</p>
              <p className="mt-0.5 text-slate-500">INR (₹) with source currency</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-slate-900">Session reminders</p>
                <p className="mt-0.5 text-slate-500">Email 30 min before a session</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                On
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-slate-900">Weekly digest</p>
                <p className="mt-0.5 text-slate-500">Student progress summary</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                Off
              </span>
            </div>
            <Separator />
            <Button size="sm" disabled>
              Save changes
            </Button>
            <p className="text-xs text-slate-400">
              Shared workspace defaults — per-counsellor preferences are out of scope for this build.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
