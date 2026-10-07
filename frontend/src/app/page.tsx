"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Instrument_Serif } from "next/font/google";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { WavyBackground } from "@/components/ui/wavy-background";

const serif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
});

/**
 * Public landing page. Single job: send counsellors to sign in.
 * The workspace (and everything under it) stays behind auth middleware.
 */
const HIGHLIGHTS = [
  {
    title: "Explainable Match",
    body: "Every recommendation shows its dimension scores, reasons, and source — nothing is a black box.",
  },
  {
    title: "Next Best Question",
    body: "One high-impact question at a time when a profile is incomplete. Never fabricated.",
  },
  {
    title: "What-if Explorer",
    body: "Preview GPA, budget, country, or intake changes without touching the stored profile.",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  // Cinematic exit into sign-in: same wavy backdrop on both pages, so the
  // hero fading up and out reads as one continuous motion into the form
  // fading in (see AuthShell entrance).
  function goToLogin(event: React.MouseEvent): void {
    event.preventDefault();
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(() => router.push("/login"), 480);
  }

  return (
    <>
    <WavyBackground
      backgroundFill="#0a0f1e"
      colors={["#38bdf8", "#6366f1", "#0ea5e9", "#312e81", "#0284c7"]}
      speed="slow"
      waveOpacity={0.6}
      className="mx-auto max-w-4xl px-4 pb-40"
    >
      <motion.div
        initial={{ opacity: 0.0, y: 40 }}
        animate={leaving ? { opacity: 0, y: -32 } : { opacity: 1, y: 0 }}
        transition={
          leaving
            ? { duration: 0.45, ease: "easeIn" }
            : { delay: 0.3, duration: 0.8, ease: "easeInOut" }
        }
        className="flex flex-col items-center gap-5 text-center"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-200">
          GradGuide Copilot
        </p>
        <h1 className="text-4xl leading-[1.05] font-bold tracking-tight text-white md:text-7xl">
          Study abroad,
          <br />
          <span className={`${serif.className} font-normal italic`}>
            recommended right.
          </span>
        </h1>
        <p className="max-w-xl text-base font-light text-slate-300 md:text-lg">
          Deterministic course matches with evidence for every pick — built
          for counsellors, on live counselling calls.
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login"
            onClick={goToLogin}
            className="w-fit rounded-full bg-white px-6 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-sky-100"
          >
            Sign in as counsellor
          </Link>
          <Link
            href="/workspace"
            className="w-fit rounded-full border border-white/25 px-6 py-2.5 text-sm font-medium text-white transition hover:border-white/60"
          >
            Open workspace
          </Link>
        </div>
      </motion.div>
    </WavyBackground>
    <section className="bg-[#0a0f1e] px-4 pt-4 pb-16">
      <div className="mx-auto grid max-w-4xl gap-3 sm:grid-cols-3">
        {HIGHLIGHTS.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
          >
            <h2 className="text-sm font-semibold tracking-tight text-white">
              {item.title}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed font-light text-slate-400">
              {item.body}
            </p>
          </div>
        ))}
      </div>
      <p className="mx-auto mt-8 max-w-xl text-center text-xs font-light text-slate-500">
        Verified programmes across the USA, UK, Canada, and Germany —
        every fact traceable to an official source.{" "}
        <Link href="/login" className="font-medium text-sky-300 hover:text-sky-200">
          Sign in to counsel →
        </Link>
      </p>
    </section>
    </>
  );
}
