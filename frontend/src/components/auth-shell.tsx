import { GraduationCap } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { WavyBackground } from "@/components/ui/wavy-background";

/**
 * Shared sign-in / sign-up shell. Same wavy backdrop as the landing
 * page; the card stays transparent so the waves show through.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <WavyBackground
      backgroundFill="#0a0f1e"
      colors={["#38bdf8", "#6366f1", "#0ea5e9", "#312e81", "#0284c7"]}
      speed="slow"
      waveOpacity={0.6}
      className="flex min-h-dvh items-center justify-center px-4 py-12"
    >
      <Card className="w-full max-w-sm border-white/10 bg-white/[0.04] shadow-2xl backdrop-blur-md">
        <CardContent className="pt-8">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-600 text-white">
              <GraduationCap className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-white">
              GradGuide
            </span>
          </div>
          <h1 className="mt-6 text-xl font-semibold tracking-tight text-white">
            {title}
          </h1>
          <p className="mt-1 text-sm text-slate-300">{subtitle}</p>
          {children}
          <div className="mt-4 text-center text-[13px] text-slate-300">{footer}</div>
        </CardContent>
      </Card>
    </WavyBackground>
  );
}

export const authInputClass =
  "w-full rounded-md border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400";
