import { parseIelts, parseToefl, parseWorkExperienceMonths } from "../ingestion/normalize/requirements.js";
import type { EducationEntry, ResumeExtraction } from "./schema.js";
import { resumeExtractionSchema } from "./schema.js";

/**
 * Deterministic resume extractor (Milestone 13).
 *
 * Section-based parsing with regexes only — no LLM, no ranking. Anything
 * not explicitly stated stays null/empty; the counsellor resolves
 * ambiguity at review time. Structured so a future LLM extractor can
 * implement `ResumeExtractor` without touching callers.
 */

export interface ResumeExtractor {
  extract(pages: string[]): ResumeExtraction;
}

const SECTION_HEADERS: { key: string; pattern: RegExp }[] = [
  { key: "education", pattern: /^\s*(education|academic background|academics)\s*$/i },
  { key: "experience", pattern: /^\s*(experience|work experience|employment|employment history|internships?)\s*$/i },
  { key: "projects", pattern: /^\s*(projects|academic projects|personal projects|selected projects)\s*$/i },
  { key: "skills", pattern: /^\s*(skills|technical skills|technologies|tech stack)\s*$/i },
  { key: "certifications", pattern: /^\s*(certifications?|licenses?|certificates?)\s*$/i },
  { key: "achievements", pattern: /^\s*(achievements?|awards?|honors?|honours?)\s*$/i },
  { key: "interests", pattern: /^\s*(interests|hobbies|extracurriculars?)\s*$/i },
];

const DEGREE_PATTERN =
  /\b(B\.?E\.?|B\.?Tech|B\.?Sc|B\.?S\.?|BCA|MCA|M\.?Tech|M\.?Sc|M\.?S\.?|MS|MSc|MBA|Ph\.?D\.?|Bachelor(?:'s|s)?(?: of [A-Za-z]+)?|Master(?:'s|s)?(?: of [A-Za-z]+)?)(?![A-Za-z])/i;

const FIELD_VOCABULARY = [
  "Computer Engineering",
  "Computer Science",
  "Data Science",
  "Artificial Intelligence",
  "Machine Learning",
  "Software Engineering",
  "Information Technology",
  "Information Systems",
  "Electronics",
  "Electrical Engineering",
  "Mathematics",
  "Statistics",
];

const SKILL_VOCABULARY: { category: keyof ResumeExtraction["skills"]; terms: string[] }[] = [
  { category: "languages", terms: ["Python", "Java", "C++", "C", "JavaScript", "TypeScript", "Go", "Rust", "SQL", "R", "MATLAB", "Kotlin", "Swift", "C#", "PHP", "Ruby", "Scala"] },
  { category: "frameworks", terms: ["React", "Next.js", "FastAPI", "Django", "Flask", "Node.js", "Express", "Angular", "Vue", "Spring", "TensorFlow", "PyTorch", "Keras", "scikit-learn", "LangChain"] },
  { category: "databases", terms: ["PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite", "Cassandra", "DynamoDB"] },
  { category: "cloudTools", terms: ["AWS", "GCP", "Azure", "Docker", "Kubernetes", "Terraform", "Jenkins", "Git", "Linux"] },
  { category: "aiMl", terms: ["Machine Learning", "Deep Learning", "NLP", "Computer Vision", "LLMs", "LLM", "Transformers", "Hugging Face", "OpenAI"] },
];

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE_RE = /(\+\d{1,3}[-.\s]?)?\(?\d{2,5}\)?[-.\s]?\d{3,5}([-.\s]?\d{3,6})?/;

function extractPhone(headerText: string): string | null {
  const match = PHONE_RE.exec(headerText);
  if (match == null) return null;
  // Year ranges ("2019 - 2023") also match the shape — require a real
  // phone's digit count.
  const digits = (match[0].match(/\d/g) ?? []).length;
  return digits >= 10 ? match[0].trim() : null;
}
const YEAR_RE = /\b((?:19|20)\d{2})\b/g;
const GPA_RE = /\b(CGPA|GPA|SGPA|CPI)\s*:?\s*(\d+(?:\.\d{1,2})?)\s*(?:\/\s*(\d+(?:\.\d+)?))?/gi;

function escapeRegExp(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchSkills(text: string): string[] {
  const found: string[] = [];
  const all = SKILL_VOCABULARY.flatMap((group) => group.terms);
  // Longer terms first so "C++" wins before bare "C".
  for (const term of [...all].sort((a, b) => b.length - a.length)) {
    const pattern = new RegExp(`(?<![A-Za-z0-9+#])${escapeRegExp(term)}(?![A-Za-z0-9+#])`, "i");
    if (pattern.test(text) && !found.some((f) => f.toLowerCase() === term.toLowerCase())) {
      found.push(term);
    }
  }
  return found;
}

function splitSections(lines: string[]): { header: string[]; sections: Record<string, string[]> } {
  const header: string[] = [];
  const sections: Record<string, string[]> = {};
  let current: string | null = null;
  for (const line of lines) {
    const hit = SECTION_HEADERS.find((h) => h.pattern.test(line));
    if (hit != null) {
      current = hit.key;
      sections[current] = [];
      continue;
    }
    if (current == null) header.push(line);
    else sections[current]?.push(line);
  }
  return { header, sections };
}

function parseScale(raw: string | undefined): number | null {
  if (raw == null) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return null;
  // "4.0" → 4; genuinely fractional scales (4.33) are not representable.
  if (!Number.isInteger(value)) {
    return Number.isInteger(Math.round(value)) && Math.abs(value - Math.round(value)) < 1e-9
      ? Math.round(value)
      : null;
  }
  return value;
}

type GpaMention = NonNullable<ResumeExtraction["education"][number]["gpa"]>;

function findGpaMentions(text: string): GpaMention[] {
  const out: GpaMention[] = [];
  let match: RegExpExecArray | null;
  GPA_RE.lastIndex = 0;
  while ((match = GPA_RE.exec(text)) !== null) {
    const kind = match[1] ?? "";
    const value = Number(match[2]);
    if (!Number.isFinite(value)) continue;
    // Semester attribution uses the keyword and preceding context only —
    // a following "Semester ... SGPA" belongs to the next mention, not this one.
    const before = text.slice(Math.max(0, match.index - 30), match.index).toLowerCase();
    const isSemester = /sgpa/i.test(kind) || /semester/.test(before);
    out.push({
      value,
      scale: parseScale(match[3]),
      kind: isSemester ? "semester" : "overall",
      snippet: match[0].trim(),
    });
  }
  return out;
}

function parseEducation(lines: string[]): EducationEntry[] {
  if (lines.length === 0) return [];
  // Split into entries on degree lines or institution lines following content.
  const entries: EducationEntry[] = [];
  let current: string[] = [];
  const flush = (): void => {
    if (current.length === 0) return;
    const block = current.join(" ");
    const degreeMatch = DEGREE_PATTERN.exec(block);
    const fieldMatch = FIELD_VOCABULARY.find((f) => new RegExp(`\\b${escapeRegExp(f)}\\b`, "i").test(block)) ?? null;
    // Institution: first comma/pipe segment naming one, in line order —
    // the block's primary institution. Exchange/visit lines stay visible
    // in the snippet evidence.
    const institution =
      current
        .flatMap((l) => l.split(/[,|]/))
        .map((s) => s.trim())
        .find((s) => /university|institute|college|school/i.test(s)) ?? null;
    const years = [...block.matchAll(YEAR_RE)].map((m) => Number(m[1]));
    const gpas = findGpaMentions(block);
    // Primary = first overall mention (a leading semester figure must not
    // become the headline GPA); the rest are preserved as-is.
    const primary = gpas.find((g) => g.kind === "overall") ?? gpas[0] ?? null;
    const others = gpas.filter((g) => g !== primary);
    const courseworkLine = current.find((l) => /coursework\s*:/i.test(l));
    entries.push({
      institution: institution && institution.length > 0 ? institution : null,
      degree: degreeMatch?.[1]?.trim() ?? null,
      field: fieldMatch,
      startYear: years[0] ?? null,
      endYear: years.length > 1 ? years[years.length - 1] ?? null : (years[0] ?? null),
      gpa: primary,
      otherGpas: others,
      coursework: courseworkLine != null ? courseworkLine.split(/:/)[1]?.split(/[,;]/).map((s) => s.trim()).filter(Boolean) ?? [] : [],
      snippet: current.join(" ").slice(0, 300),
    });
    current = [];
  };
  for (const line of lines) {
    if (DEGREE_PATTERN.test(line) && current.length > 0 && current.some((l) => DEGREE_PATTERN.test(l))) {
      flush();
    }
    current.push(line);
  }
  flush();
  return entries;
}

function sentenceWith(text: string, keyword: RegExp): string | null {
  const sentences = text.split(/(?<=[.!?])\s+/);
  return sentences.find((s) => keyword.test(s))?.trim() ?? null;
}

export class DeterministicResumeExtractor implements ResumeExtractor {
  extract(pages: string[]): ResumeExtraction {
    const lines = pages
      .flatMap((page) => page.split(/\r?\n/))
      .map((l) => l.replace(/\s+/g, " ").trim())
      .filter((l) => l.length > 0);
    const { header, sections } = splitSections(lines);
    const fullText = lines.join("\n");

    const headerText = header.join(" ");
    const email = EMAIL_RE.exec(fullText)?.[0] ?? null;
    const phone = extractPhone(headerText);
    const name = header.length > 0 && email != null && !EMAIL_RE.test(header[0] ?? "")
      ? (header[0] ?? null)
      : (header.find((l) => !EMAIL_RE.test(l) && !PHONE_RE.test(l)) ?? null);
    const location = header.find((l) => /^[A-Za-z .'\-]+,\s*[A-Za-z .'\-]+$/.test(l)) ?? null;

    const education = parseEducation(sections["education"] ?? []);

    const experienceLines = sections["experience"] ?? [];
    const experience: ResumeExtraction["experience"] = [];
    if (experienceLines.length > 0) {
      // Split entries on lines carrying a date range; fall back to one block.
      const blocks: string[][] = [];
      let block: string[] = [];
      for (const line of experienceLines) {
        const hasRange = /\b(?:19|20)\d{2}\b.*(?:–|-|to)\s*(?:(?:19|20)\d{2}|present|current)/i.test(line);
        if (hasRange && block.length > 0) {
          blocks.push(block);
          block = [];
        }
        block.push(line);
      }
      if (block.length > 0) blocks.push(block);
      for (const b of blocks) {
        const first = b[0] ?? "";
        const atMatch = /(.*?)\s*[@|–|-]\s*(.+)/.exec(first);
        const joined = b.join(" ");
        experience.push({
          company: atMatch?.[2]?.trim() || null,
          role: atMatch?.[1]?.trim() || first || null,
          startLabel: joined.match(/\b((?:19|20)\d{2}|[A-Z][a-z]+ (?:19|20)\d{2})\b/)?.[1] ?? null,
          endLabel: /present|current/i.test(joined) ? "Present" : (joined.match(/(?:–|-|to)\s*((?:19|20)\d{2}|[A-Z][a-z]+ (?:19|20)\d{2}|present|current)/i)?.[1] ?? null),
          description: b.slice(1).join(" ").slice(0, 500),
          technologies: matchSkills(joined),
          snippet: joined.slice(0, 300),
        });
      }
    }

    const projects = (sections["projects"] ?? []).length > 0 ? splitProjectLines(sections["projects"] ?? []) : [];
    const skills = extractSkills(sections["skills"] ?? []);

    const certifications = (sections["certifications"] ?? [])
      .map((l) => l.replace(/^[-•\u2022]\s*/, "").trim())
      .filter(Boolean)
      .map((l) => {
        const issuer = /(?:by|from)\s+([A-Z][A-Za-z .&]+)/.exec(l)?.[1]?.trim() ?? null;
        return { name: l, issuer, dateLabel: l.match(/\b((?:19|20)\d{2})\b/)?.[1] ?? null };
      });

    const bullets = (lines: string[]): string[] =>
      lines.map((l) => l.replace(/^[-•\u2022]\s*/, "").trim()).filter(Boolean);

    const ielts = parseIelts(fullText);
    const toefl = parseToefl(fullText);
    const workMonths = parseWorkExperienceMonths(fullText);

    const candidate = {
      personal: { name, email, phone, location },
      education,
      experience,
      projects,
      skills,
      certifications,
      achievements: bullets(sections["achievements"] ?? []),
      interests: bullets(sections["interests"] ?? []),
      workExperienceMonths: workMonths,
      workExperienceEvidence: workMonths != null ? sentenceWith(fullText, /experience/i) : null,
      englishIeltsOverall: ielts,
      englishToeflOverall: toefl,
      englishEvidence:
        ielts != null ? sentenceWith(fullText, /ielts/i) : toefl != null ? sentenceWith(fullText, /toefl/i) : null,
    };
    return resumeExtractionSchema.parse(candidate);
  }
}

function splitProjectLines(lines: string[]): ResumeExtraction["projects"] {
  const projects: ResumeExtraction["projects"] = [];
  let current: string[] = [];
  const flush = (): void => {
    if (current.length === 0) return;
    const joined = current.join(" ");
    const techLine = current.find((l) => /technolog(?:y|ies)\s*:/i.test(l));
    const techs = techLine != null
      ? matchSkills(techLine)
      : matchSkills(joined);
    projects.push({
      name: (current[0] ?? "").replace(/^[-•\u2022]\s*/, "").slice(0, 120),
      description: current.slice(1).join(" ").slice(0, 500),
      technologies: techs,
      snippet: joined.slice(0, 300),
    });
    current = [];
  };
  for (const line of lines) {
    const isBullet = /^[-•\u2022]/.test(line);
    if (isBullet && current.length > 0 && !/technolog/i.test(line)) flush();
    current.push(line);
  }
  flush();
  return projects;
}

function extractSkills(skillLines: string[]): ResumeExtraction["skills"] {
  const empty: ResumeExtraction["skills"] = {
    languages: [],
    frameworks: [],
    databases: [],
    cloudTools: [],
    aiMl: [],
    other: [],
  };
  // No SKILLS section → no skills. Whole-resume matching would turn
  // "Interested in AI" into AI experience, so it is never attempted.
  if (skillLines.length === 0) return empty;
  const sectionText = skillLines.join("\n");
  const pick = (label: RegExp): string[] => {
    const line = skillLines.find((l) => label.test(l));
    if (line == null) return [];
    return matchSkills(line);
  };
  const fromSection = matchSkills(sectionText);
  const byCategory = (index: number): string[] =>
    fromSection.filter((s) => SKILL_VOCABULARY[index]?.terms.includes(s) ?? false);
  const languages = pick(/languages?\s*:/i);
  const frameworks = pick(/frameworks?\s*:|libraries\s*:/i);
  const databases = pick(/databases?\s*:|dbms\s*:/i);
  const cloudTools = pick(/cloud|tools\s*:|devops|platforms?\s*:/i);
  const aiMl = pick(/ai|machine learning|ml\s*:/i);
  const assigned = new Set(
    [...languages, ...frameworks, ...databases, ...cloudTools, ...aiMl].map((s) => s.toLowerCase())
  );
  return {
    languages: languages.length > 0 ? languages : byCategory(0),
    frameworks: frameworks.length > 0 ? frameworks : byCategory(1),
    databases: databases.length > 0 ? databases : byCategory(2),
    cloudTools: cloudTools.length > 0 ? cloudTools : byCategory(3),
    aiMl: aiMl.length > 0 ? aiMl : byCategory(4),
    other: fromSection.filter((s) => !assigned.has(s.toLowerCase())),
  };
}
