import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  extractBackgrounds,
  extractCourseCandidate,
  extractNotes,
  extractTuitionSentence,
} from "./courseExtractor.js";
const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), "__fixtures__");

function loadRitFixture(): string {
  return readFileSync(join(fixtureDir, "rit-computer-science-ms.html"), "utf8");
}

const input = {
  universityName: "Rochester Institute of Technology",
  universityCountry: "USA",
  universityCity: "Rochester",
  universityWebsite: "https://www.rit.edu",
  sourceUrl: "https://www.rit.edu/study/computer-science-ms",
  sourceName: "RIT Graduate Study — Computer Science MS",
};

describe("extractCourseCandidate (RIT fixture, no network)", () => {
  it("extracts identity from the page title", () => {
    const candidate = extractCourseCandidate({ html: loadRitFixture(), ...input });
    expect(candidate.courseName).toBe("Computer Science MS");
    expect(candidate.degreeType).toBe("MS");
    expect(candidate.field).toBe("Computer Science");
  });

  it("extracts GPA, IELTS, and TOEFL minima", () => {
    const candidate = extractCourseCandidate({ html: loadRitFixture(), ...input });
    expect(candidate.minimumGpa).toBe(3.0);
    expect(candidate.minimumIelts).toBe(6.5);
    expect(candidate.minimumToefl).toBe(88);
  });

  it("extracts Fall and Spring intakes without deadline-month pollution", () => {
    const candidate = extractCourseCandidate({ html: loadRitFixture(), ...input });
    expect(candidate.intakes).toEqual(["Fall", "Spring"]);
  });

  it("leaves tuition unknown when the page publishes no figures", () => {
    const candidate = extractCourseCandidate({ html: loadRitFixture(), ...input });
    expect(candidate.tuitionAmount).toBeNull();
    expect(candidate.tuitionPeriod).toBeNull();
  });

  it("leaves duration unknown for credit-hour-only pages", () => {
    const candidate = extractCourseCandidate({ html: loadRitFixture(), ...input });
    expect(candidate.durationMonths).toBeNull();
  });

  it("records provenance from the input", () => {
    const candidate = extractCourseCandidate({ html: loadRitFixture(), ...input });
    expect(candidate.sourceUrl).toBe("https://www.rit.edu/study/computer-science-ms");
    expect(candidate.sourceName).toBe("RIT Graduate Study — Computer Science MS");
    expect(candidate.lastVerifiedAt).toBeInstanceOf(Date);
  });
});

describe("extractBackgrounds", () => {
  it("picks explicitly named disciplines from background sentences", () => {
    const backgrounds = extractBackgrounds(
      "Applicants should have an undergraduate degree or minor in computer science, or a strong background in engineering or science."
    );
    expect(backgrounds).toEqual(["Computer Science", "Engineering", "Science"]);
  });

  it("returns empty when nothing is named", () => {
    expect(extractBackgrounds("A strong academic background is expected.")).toEqual([]);
  });

  it("ignores prerequisite subjects", () => {
    expect(
      extractBackgrounds(
        "Applicants must satisfy prerequisites in differential calculus, probability and statistics, and discrete mathematics."
      )
    ).toEqual([]);
  });
});

describe("extractNotes", () => {
  it("keeps genuine grade/ECTS/language sentences", () => {
    const notes = extractNotes(
      "Applicants need 30 ECTS in Computer Science. A minimum grade of 2.5 is required."
    );
    expect(notes.length).toBeGreaterThan(0);
  });

  it("ignores 'postgraduate'/'undergraduate' background sentences", () => {
    const notes = extractNotes(
      "Our postgraduate research community welcomes undergraduate students from all backgrounds."
    );
    expect(notes).toEqual([]);
  });
});

describe("extractTuitionSentence", () => {
  it("ignores scholarship mentions without cost figures", () => {
    expect(
      extractTuitionSentence("Students receive a 30% tuition scholarship.")
    ).toBeNull();
  });

  it("accepts cost sentences with figures", () => {
    expect(
      extractTuitionSentence("Graduate tuition is $50,000 per year.")
    ).toContain("$50,000");
  });

  it("ignores salary figures", () => {
    expect(
      extractTuitionSentence(
        "Graduate salaries were £10,500 more than non-graduates in 2023."
      )
    ).toBeNull();
  });

  it("ignores non-refundable application fees (Wave 2.5: Buffalo)", () => {
    expect(
      extractTuitionSentence(
        "A non-refundable fee of $100 is required to apply for Spring 2025 or later terms."
      )
    ).toBeNull();
  });
});

describe("extractCourseCandidate (synthetic pages, no network)", () => {
  const base = {
    universityName: "Test University",
    universityCountry: "Canada",
    universityCity: null,
    universityWebsite: null,
    sourceUrl: "https://example.com/ms",
    sourceName: "Test source",
  };

  function page(body: string): string {
    return `<html><body><main><h1>Computer Science MS</h1><p>${body}</p></main></body></html>`;
  }

  it("drops negated intakes", () => {
    const candidate = extractCourseCandidate({
      html: page(
        "Admit term: Fall. Winter and Summer starts are not offered. Apply for September entry."
      ),
      ...base,
    });
    expect(candidate.intakes).toContain("Fall");
    expect(candidate.intakes).not.toContain("Summer");
    expect(candidate.intakes).not.toContain("Winter");
  });

  it("drops 'do not accept starts' intakes (Wave 2: MScAC Fall-only)", () => {
    const candidate = extractCourseCandidate({
      html: page(
        "This program has one intake (Fall) only, we do not accept applications for a Winter or Summer start."
      ),
      ...base,
    });
    expect(candidate.intakes).toContain("Fall");
    expect(candidate.intakes).not.toContain("Summer");
    expect(candidate.intakes).not.toContain("Winter");
  });

  it("reads an explicitly stated GPA scale", () => {
    const candidate = extractCourseCandidate({
      html: page("A cumulative GPA of at least 3.2 out of 4 is required."),
      ...base,
    });
    expect(candidate.minimumGpa).toBe(3.2);
    expect(candidate.minimumGpaScale).toBe(4);
  });
});
