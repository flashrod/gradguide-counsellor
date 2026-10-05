"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth-client";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout(): Promise<void> {
    setBusy(true);
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto justify-start p-0 text-xs text-slate-400 hover:text-slate-700"
      onClick={() => void logout()}
      disabled={busy}
    >
      <LogOut aria-hidden />
      Logout
    </Button>
  );
}
