"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { signIn } from "@/lib/auth-client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("demo@gradguide.local");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(): Promise<void> {
    setBusy(true);
    setError(null);
    const result = await signIn.email(
      { email: email.trim(), password },
      {
        onError: (context) => {
          setError(context.error.message ?? "Sign-in failed.");
        },
      }
    );
    setBusy(false);
    if (result.error == null) {
      router.push(searchParams.get("next") ?? "/workspace");
      router.refresh();
    }
  }

  const inputClass =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-8">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
              <GraduationCap className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-slate-900">
              GradGuide
            </span>
          </div>
          <h1 className="mt-6 text-xl font-semibold tracking-tight text-slate-900">
            Sign in
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Counsellor access only.
          </p>
          <form
            className="mt-5 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <label className="block text-xs font-medium text-slate-600">
              Email
              <input
                aria-label="Email"
                type="email"
                required
                autoComplete="email"
                className={`${inputClass} mt-1`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Password
              <input
                aria-label="Password"
                type="password"
                required
                autoComplete="current-password"
                className={`${inputClass} mt-1`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {error != null && (
              <p role="alert" className="text-[13px] text-red-700">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
