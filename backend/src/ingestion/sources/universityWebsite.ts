import { fetchHtml } from "../utils/fetch.js";
import type {
  CoursePageCandidate,
  UniversityCourseSource,
} from "../types.js";

/**
 * University website source abstraction. Per-university adapters live in
 * `universities/` (one file each); the demo implements exactly one.
 * Discovery is intentionally curated for Milestone 4 — bulk crawling comes
 * later. Fetching always goes through the polite shared fetcher.
 */

export interface UniversityAdapterConfig {
  id: string;
  universityName: string;
  universityCountry: string;
  universityCity: string | null;
  universityWebsite: string | null;
  sourceName: string;
  programPages: {
    url: string;
    title: string;
    programName?: string;
    degreeType?: string;
    field?: string;
    /**
     * Fields the extractor must leave unknown even when numbers are found
     * (e.g. a page that explicitly disclaims a hard cutoff, or durations
     * that mix full-time and part-time arms inseparably).
     */
    suppressFields?: ("gpa" | "ielts" | "toefl" | "duration" | "tuition")[];
  }[];
}

export class CuratedUniversitySource implements UniversityCourseSource {
  readonly id: string;
  private readonly config: UniversityAdapterConfig;

  constructor(config: UniversityAdapterConfig) {
    this.id = config.id;
    this.config = config;
  }

  get universityName(): string {
    return this.config.universityName;
  }

  get universityCountry(): string {
    return this.config.universityCountry;
  }

  get universityCity(): string | null {
    return this.config.universityCity;
  }

  get universityWebsite(): string | null {
    return this.config.universityWebsite;
  }

  get sourceName(): string {
    return this.config.sourceName;
  }

  async discoverCourses(): Promise<CoursePageCandidate[]> {
    return this.config.programPages.map((page) => ({ ...page }));
  }

  async fetchCoursePage(url: string): Promise<string> {
    const known = this.config.programPages.some((page) => page.url === url);
    if (!known) {
      throw new Error(`URL is not a known program page for ${this.id}: ${url}`);
    }
    return fetchHtml(url);
  }
}
