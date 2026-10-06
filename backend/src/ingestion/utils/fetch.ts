/**
 * Polite HTTP fetching for ingestion (Milestone 4).
 *
 * - Identifiable User-Agent, 15s timeout, 3 attempts with backoff on
 *   transient failures (429 / 5xx / network errors). No retry on 404.
 * - robots.txt is honored per origin (cached per process): if the path is
 *   disallowed for `*` or our crawler token, fetching throws.
 * - 1s minimum gap between requests to the same origin.
 * - No CAPTCHA/auth/stealth handling by design — only public pages.
 */

export const INGESTION_USER_AGENT =
  "GradGuide-Copilot-Ingestion/0.1 (+https://github.com/flashrod/gradguide-counsellor)";

const FETCH_TIMEOUT_MS = 15_000;
const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1_000;
const POLITENESS_GAP_MS = 1_000;

export class FetchError extends Error {
  readonly status: number | null;
  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "FetchError";
    this.status = status;
  }
}

export class RobotsBlockedError extends Error {
  constructor(url: string) {
    super(`Fetch blocked by robots.txt: ${url}`);
    this.name = "RobotsBlockedError";
  }
}

const robotsCache = new Map<string, { disallows: string[]; crawlDelayMs: number }>();
const lastRequestAt = new Map<string, number>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function originOf(url: string): string {
  return new URL(url).origin;
}

function pathOf(url: string): string {
  return new URL(url).pathname;
}

/** Minimal robots.txt parser: returns Disallow paths for `*` + our token. */
export function parseRobotsDisallows(robotsTxt: string): string[] {
  return parseRobots(robotsTxt).disallows;
}

interface RobotsRules {
  disallows: string[];
  crawlDelayMs: number;
}

export function parseRobots(robotsTxt: string): RobotsRules {
  const disallows: string[] = [];
  let crawlDelayMs = 0;
  let applies = false;
  for (const rawLine of robotsTxt.split("\n")) {
    const line = rawLine.split("#")[0]?.trim() ?? "";
    if (line === "") continue;
    const [field, ...rest] = line.split(":");
    const value = rest.join(":").trim();
    if (field?.toLowerCase() === "user-agent") {
      const agent = value.toLowerCase();
      applies =
        agent === "*" ||
        agent === "gradguide-copilot-ingestion" ||
        "gradguide-copilot-ingestion/0.1".startsWith(agent);
    } else if (applies && field?.toLowerCase() === "disallow" && value !== "") {
      disallows.push(value);
    } else if (applies && field?.toLowerCase() === "crawl-delay") {
      const seconds = Number(value);
      if (Number.isFinite(seconds) && seconds > 0) {
        crawlDelayMs = Math.min(seconds * 1000, 30_000);
      }
    }
  }
  return { disallows, crawlDelayMs };
}

export function isPathAllowed(path: string, disallows: string[]): boolean {
  return !disallows.some((rule) => rule !== "" && path.startsWith(rule));
}

async function robotsRulesFor(origin: string): Promise<{ disallows: string[]; crawlDelayMs: number }> {
  const cached = robotsCache.get(origin);
  if (cached != null) return cached;
  const empty = { disallows: [], crawlDelayMs: 0 };
  try {
    const response = await fetch(`${origin}/robots.txt`, {
      headers: { "User-Agent": INGESTION_USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) {
      robotsCache.set(origin, empty);
      return empty;
    }
    const rules = parseRobots(await response.text());
    robotsCache.set(origin, rules);
    return rules;
  } catch {
    // If robots.txt itself is unreachable, proceed (fail-open, still polite).
    robotsCache.set(origin, empty);
    return empty;
  }
}

function isTransient(error: unknown, status: number | null): boolean {
  if (status != null) return status === 429 || status >= 500;
  return error instanceof Error && error.name !== "RobotsBlockedError";
}

export async function fetchHtml(url: string): Promise<string> {
  const origin = originOf(url);
  const rules = await robotsRulesFor(origin);
  if (!isPathAllowed(pathOf(url), rules.disallows)) {
    throw new RobotsBlockedError(url);
  }

  const gap = Math.max(POLITENESS_GAP_MS, rules.crawlDelayMs);
  const sinceLast = Date.now() - (lastRequestAt.get(origin) ?? 0);
  if (sinceLast < gap) await sleep(gap - sinceLast);

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      lastRequestAt.set(origin, Date.now());
      const response = await fetch(url, {
        headers: {
          "User-Agent": INGESTION_USER_AGENT,
          Accept: "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (response.status === 404) {
        throw new FetchError(`Not found: ${url}`, 404);
      }
      if (!response.ok) {
        if (!isTransient(null, response.status)) {
          throw new FetchError(
            `Request failed (${response.status}) for ${url}`,
            response.status
          );
        }
        throw new FetchError(
          `Transient failure (${response.status}) for ${url}`,
          response.status
        );
      }
      return await response.text();
    } catch (error) {
      lastError = error;
      if (error instanceof RobotsBlockedError) throw error;
      const retryable =
        error instanceof FetchError
          ? isTransient(error, error.status)
          : isTransient(error, null);
      if (!retryable || attempt === MAX_ATTEMPTS) throw error;
      await sleep(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new FetchError(`Failed to fetch ${url}`);
}
