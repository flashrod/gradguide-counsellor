"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AuthShell, authInputClass } from "@/components/auth-shell";
import { signIn } from "@/lib/auth-client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("demo@gradguide.local");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
        <label className="block text-xs font-medium text-white">
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
        <label className="block text-xs font-medium text-white">
          Password
          <span className="relative mt-1 block">
            <input
              aria-label="Password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              className={`${authInputClass} pr-10`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1 text-slate-300 hover:text-white"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden />
              ) : (
                <Eye className="h-4 w-4" aria-hidden />
              )}
            </button>
          </span>
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
