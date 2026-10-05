import { Sidebar } from "@/components/layout/sidebar";
import { getCurrentCounsellor } from "@/lib/current-counsellor";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const counsellor = await getCurrentCounsellor();
  return (
    <div className="flex h-dvh overflow-hidden bg-slate-50">
      <Sidebar
        user={
          counsellor != null
            ? { name: counsellor.name, email: counsellor.email }
            : null
        }
      />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-10">
          {children}
        </div>
      </main>
    </div>
  );
}
