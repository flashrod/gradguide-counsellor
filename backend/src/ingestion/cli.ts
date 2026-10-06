import "dotenv/config";

import { closePool } from "../db/index.js";
import { ingestSource } from "./pipeline/ingestCountry.js";
import type { CuratedUniversitySource } from "./sources/universityWebsite.js";
import { buffaloSource } from "./sources/universities/buffalo.js";
import { depaulSource } from "./sources/universities/depaul.js";
import { drexelSource } from "./sources/universities/drexel.js";
import { fsuSource } from "./sources/universities/fsu.js";
import { glasgowSource } from "./sources/universities/glasgow.js";
import { bristolSource } from "./sources/universities/bristol.js";
import { exeterSource } from "./sources/universities/exeter.js";
import { gmuSource } from "./sources/universities/gmu.js";
import { greenwichSource } from "./sources/universities/greenwich.js";
import { keeleSource } from "./sources/universities/keele.js";
import { liverpoolSource } from "./sources/universities/liverpool.js";
import { loughboroughSource } from "./sources/universities/loughborough.js";
import { manchesterSource } from "./sources/universities/manchester.js";
import { mmuSource } from "./sources/universities/mmu.js";
import { njitSource } from "./sources/universities/njit.js";
import { northeasternSource } from "./sources/universities/northeastern.js";
import { portsmouthSource } from "./sources/universities/portsmouth.js";
import { ritSource } from "./sources/universities/rit.js";
import { sheffieldSource } from "./sources/universities/sheffield.js";
import { southamptonSource } from "./sources/universities/southampton.js";
import { leedsSource } from "./sources/universities/leeds.js";
import { uicSource } from "./sources/universities/uic.js";
import { umlSource } from "./sources/universities/uml.js";
import { uiucSource } from "./sources/universities/uiuc.js";
import { unoSource } from "./sources/universities/uno.js";
import { yorkSource } from "./sources/universities/york.js";
import { mstSource } from "./sources/universities/mst.js";
import { utaSource } from "./sources/universities/uta.js";
import { utdSource } from "./sources/universities/utd.js";
import { utsaSource } from "./sources/universities/utsa.js";

/**
 * Multi-country ingestion CLI (Milestone 12):
 *
 *   npm run ingest -- --country=US [--limit=10] [--dry-run]
 *   npm run ingest -- --all [--dry-run]
 *
 * Country runs are bounded by their curated adapter lists — `--all` does
 * not crawl the web. One failed page never aborts a run. `--dry-run`
 * performs discovery/fetch/extract/validate but never writes.
 */

export type CountryCode = "US" | "UK" | "CA" | "DE" | "AU" | "IE";

const REGISTRY: Record<CountryCode, CuratedUniversitySource[]> = {
  US: [ritSource, utsaSource, unoSource, fsuSource, northeasternSource, utdSource, buffaloSource, drexelSource, njitSource, uicSource, depaulSource, utaSource, mstSource, umlSource, uiucSource, gmuSource],
  UK: [southamptonSource, portsmouthSource, liverpoolSource, leedsSource, glasgowSource, bristolSource, sheffieldSource, manchesterSource, exeterSource, mmuSource, yorkSource, greenwichSource, keeleSource, loughboroughSource],
  // Wave 1 scope is US + UK only. CA/DE/AU/IE adapters land in a later wave.
  CA: [],
  DE: [],
  AU: [],
  IE: [],
};

function parseArgs(argv: string[]): {
  countries: CountryCode[];
  limit: number | undefined;
  dryRun: boolean;
} {
  const codes: CountryCode[] = [];
  let limit: number | undefined;
  let dryRun = false;
  let all = false;
  for (const arg of argv) {
    if (arg === "--all") {
      all = true;
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg.startsWith("--country=")) {
      const code = arg.slice("--country=".length).toUpperCase();
      if (!(["US", "UK", "CA", "DE", "AU", "IE"] as string[]).includes(code)) {
        throw new Error(`Unknown country code: ${code} (expected US|UK|CA|DE|AU|IE)`);
      }
      codes.push(code as CountryCode);
    } else if (arg.startsWith("--limit=")) {
      const parsed = Number(arg.slice("--limit=".length));
      if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error(`Invalid --limit value: ${arg}`);
      }
      limit = parsed;
    } else {
      throw new Error(`Unknown argument: ${arg} (see --help in README)`);
    }
  }
  const countries = all
    ? (Object.keys(REGISTRY) as CountryCode[])
    : [...new Set(codes)];
  if (countries.length === 0) {
    throw new Error("Pass --country=US (or UK|CA|DE|AU|IE) or --all");
  }
  return { countries, limit, dryRun };
}

function printReport(
  country: CountryCode,
  sources: number,
  result: Awaited<ReturnType<typeof ingestSource>>,
  durationMs: number,
  dryRun: boolean
): void {
  console.log("----------------------------------------");
  console.log(`GradGuide Course Ingestion${dryRun ? " (dry run)" : ""}`);
  console.log(`Country: ${country}`);
  console.log("----------------------------------------\n");
  console.log(`Universities discovered: ${sources}`);
  console.log(`Universities processed: ${sources}\n`);
  console.log(`Courses discovered: ${result.coursesDiscovered}`);
  console.log(`Courses accepted: ${result.coursesAccepted}`);
  console.log(`Courses rejected: ${result.coursesRejected}\n`);
  console.log("Warnings:");
  const warningKeys = Object.keys(result.warnings);
  if (warningKeys.length === 0) {
    console.log("- none");
  } else {
    for (const key of warningKeys.sort()) {
      console.log(`- ${key}: ${result.warnings[key]}`);
    }
  }
  console.log("\nFailures:");
  if (result.failures.length === 0) {
    console.log("- none");
  } else {
    for (const failure of result.failures) {
      console.log(`- ${failure.url}: ${failure.reason}`);
    }
  }
  console.log(`\nInserted: ${result.inserted}`);
  console.log(`Updated: ${result.updated}`);
  console.log(`\nDuration: ${Math.round(durationMs / 1000)}s`);
  console.log("----------------------------------------");
}

async function main(): Promise<void> {
  const started = Date.now();
  const { countries, limit, dryRun } = parseArgs(process.argv.slice(2));
  for (const country of countries) {
    const sources = REGISTRY[country] ?? [];
    if (sources.length === 0) {
      console.log(`Country ${country}: no adapters registered yet — skipping.`);
      continue;
    }
    const aggregate = {
      coursesDiscovered: 0,
      coursesAccepted: 0,
      coursesRejected: 0,
      inserted: 0,
      updated: 0,
      warnings: {} as Record<string, number>,
      failures: [] as { url: string; reason: string }[],
      outcomes: [] as Awaited<ReturnType<typeof ingestSource>>["outcomes"],
    };
    for (const source of sources) {
      const result = await ingestSource(source, { limit, dryRun });
      aggregate.coursesDiscovered += result.coursesDiscovered;
      aggregate.coursesAccepted += result.coursesAccepted;
      aggregate.coursesRejected += result.coursesRejected;
      aggregate.inserted += result.inserted;
      aggregate.updated += result.updated;
      for (const [key, count] of Object.entries(result.warnings)) {
        aggregate.warnings[key] = (aggregate.warnings[key] ?? 0) + count;
      }
      aggregate.failures.push(...result.failures);
      aggregate.outcomes.push(...result.outcomes);
    }
    printReport(country, sources.length, aggregate, Date.now() - started, dryRun);
  }
}

main()
  .catch((error: unknown) => {
    // eslint-disable-next-line no-console
    console.error("Ingestion failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
