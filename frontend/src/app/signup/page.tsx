"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AuthShell, authInputClass } from "@/components/auth-shell";
import { signUp } from "@/lib/auth-client";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const result = await signUp.email(
        { name: name.trim(), email: email.trim(), password },
        {
          onError: (context) => {
            setError(context.error.message ?? "Sign-up failed.");
          },
        }
      );
      if (result.error == null) {
        router.push("/workspace");
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
      title="Create account"
      subtitle="Counsellor access only."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-white underline">
            Sign in
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
          Name
          <input
            aria-label="Name"
            type="text"
            required
            autoComplete="name"
            className={`${authInputClass} mt-1`}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
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
              minLength={6}
              autoComplete="new-password"
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
          {busy ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthShell>
  );
}
