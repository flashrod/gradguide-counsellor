"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { AuthShell, authInputClass } from "@/components/auth-shell";
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
    try {
      const result = await signIn.email(
        { email: email.trim(), password },
        {
          onError: (context) => {
            setError(context.error.message ?? "Sign-in failed.");
          },
        }
      );
      if (result.error == null) {
        router.push(searchParams.get("next") ?? "/workspace");
        router.refresh();
      }
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Sign in"
      subtitle="Counsellor access only."
      footer={
        <>
          No account yet?{" "}
          <Link href="/signup" className="font-medium text-white underline">
            Create one
          </Link>
        </>
      }
    >
      <form
        className="mt-5 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <label className="block text-xs font-medium text-slate-200">
          Email
          <input
            aria-label="Email"
            type="email"
            required
            autoComplete="email"
            className={`${authInputClass} mt-1`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block text-xs font-medium text-slate-200">
          Password
          <input
            aria-label="Password"
            type="password"
            required
            autoComplete="current-password"
            className={`${authInputClass} mt-1`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error != null && (
          <p role="alert" className="text-[13px] text-red-300">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
