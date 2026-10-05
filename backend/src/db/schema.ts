import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { authUser } from "./auth-schema.js";

/**
 * GradGuide Copilot — relational schema (Milestone 2).
 *
 * Design notes:
 * - UUID primary keys everywhere; timestamptz created/updated on every table.
 * - Money uses numeric(12,2); GPA numeric(3,2); IELTS numeric(2,1).
 * - Free-form lists that are only ever filtered/matched as sets
 *   (career tags, intakes, countries, academic backgrounds) are text[].
 *   Nothing relational is hidden in JSON.
 * - The only enums are session_recommendations.action, whose values are
 *   fixed by the product spec, and cost_period (annual | total | semester |
 *   monthly), which disambiguates what each money amount represents.
 *   Degree types / currencies stay as text because their value sets are
 *   open-ended (MSc, MA, MBA, … / ISO codes).
 * - Every course carries provenance (sourceUrl, sourceName, lastVerifiedAt).
 */

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
};

/**
 * What a tuition / living-cost amount represents.
 * Required alongside every amount so the recommendation engine never has to
 * guess whether e.g. 28500 means per year or for the whole programme.
 */
export const costPeriodEnum = pgEnum("cost_period", [
  "annual",
  "total",
  "semester",
  "monthly",
]);

// ---------------------------------------------------------------------------
// universities
// ---------------------------------------------------------------------------

export const universities = pgTable(
  "universities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    country: text("country").notNull(),
    city: text("city").notNull(),
    websiteUrl: text("website_url").notNull(),
    logoUrl: text("logo_url"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("universities_name_unique").on(table.name),
    index("universities_country_idx").on(table.country),
  ]
);

// ---------------------------------------------------------------------------
// courses
// ---------------------------------------------------------------------------

export const courses = pgTable(
  "courses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    universityId: uuid("university_id")
      .notNull()
      .references(() => universities.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    degreeType: text("degree_type").notNull(),
    field: text("field").notNull(),
    durationMonths: integer("duration_months"),
    // Tuition is nullable: an unpublished tuition must stay unknown (which
    // the scoring engine treats as neutral) rather than masquerading as 0.
    tuitionAmount: numeric("tuition_amount", { precision: 12, scale: 2, mode: "number" }),
    tuitionCurrency: varchar("tuition_currency", { length: 3 }),
    tuitionPeriod: costPeriodEnum("tuition_period"),
    livingCostAmount: numeric("living_cost_amount", { precision: 12, scale: 2, mode: "number" }),
    livingCostCurrency: varchar("living_cost_currency", { length: 3 }),
    livingCostPeriod: costPeriodEnum("living_cost_period"),
    intakes: text("intakes")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    minGpa: numeric("min_gpa", { precision: 3, scale: 2, mode: "number" }),
    /** Scale the minimum GPA is expressed on (e.g. 4 for 3.0/4.0). */
    minGpaScale: integer("min_gpa_scale"),
    minIeltsOverall: numeric("min_ielts_overall", { precision: 2, scale: 1, mode: "number" }),
    minIeltsWriting: numeric("min_ielts_writing", { precision: 2, scale: 1, mode: "number" }),
    minIeltsReading: numeric("min_ielts_reading", { precision: 2, scale: 1, mode: "number" }),
    minIeltsListening: numeric("min_ielts_listening", { precision: 2, scale: 1, mode: "number" }),
    minIeltsSpeaking: numeric("min_ielts_speaking", { precision: 2, scale: 1, mode: "number" }),
    // US programmes commonly publish TOEFL instead of IELTS. Stored for
    // provenance/completeness; the Milestone 3 engine does not score it yet.
    minToeflOverall: integer("min_toefl_overall"),
    workExperienceRequired: boolean("work_experience_required")
      .notNull()
      .default(false),
    workExperienceMonthsRequired: integer(
      "work_experience_months_required"
    ),
    careerTags: text("career_tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    academicBackgrounds: text("academic_backgrounds")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    eligibilityNotes: text("eligibility_notes").notNull().default(""),
    // Provenance — required for every course, no exceptions.
    sourceUrl: text("source_url").notNull(),
    sourceName: text("source_name").notNull(),
    lastVerifiedAt: timestamp("last_verified_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("courses_university_name_unique").on(
      table.universityId,
      table.name
    ),
    index("courses_university_id_idx").on(table.universityId),
    index("courses_field_idx").on(table.field),
    check(
      "courses_work_experience_months_non_negative",
      sql`${table.workExperienceMonthsRequired} >= 0`
    ),
    check(
      "courses_living_cost_amount_period_consistency",
      sql`(${table.livingCostAmount} IS NULL) = (${table.livingCostPeriod} IS NULL)`
    ),
    check(
      "courses_min_gpa_scale_positive",
      sql`${table.minGpaScale} IS NULL OR ${table.minGpaScale} > 0`
    ),
    check(
      "courses_min_toefl_overall_range",
      sql`${table.minToeflOverall} IS NULL OR (${table.minToeflOverall} >= 0 AND ${table.minToeflOverall} <= 120)`
    ),
  ]
);

// ---------------------------------------------------------------------------
// students
// ---------------------------------------------------------------------------

export const students = pgTable(
  "students",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    degree: text("degree").notNull(),
    field: text("field").notNull(),
    gpa: numeric("gpa", { precision: 3, scale: 2, mode: "number" }).notNull(),
    /** Scale the GPA value is expressed on (e.g. 10 for 8.4/10). */
    gpaScale: integer("gpa_scale"),
    ieltsOverall: numeric("ielts_overall", { precision: 2, scale: 1, mode: "number" }),
    ieltsWriting: numeric("ielts_writing", { precision: 2, scale: 1, mode: "number" }),
    ieltsReading: numeric("ielts_reading", { precision: 2, scale: 1, mode: "number" }),
    ieltsListening: numeric("ielts_listening", { precision: 2, scale: 1, mode: "number" }),
    ieltsSpeaking: numeric("ielts_speaking", { precision: 2, scale: 1, mode: "number" }),
    toeflOverall: integer("toefl_overall"),
    /**
     * BUDGET SEMANTICS: the student's maximum TOTAL budget for the complete
     * study programme, including tuition AND living costs combined.
     * No currency conversion is performed yet — amounts are compared
     * as-stated until a later milestone adds conversion.
     */
    budgetAmount: numeric("budget_amount", { precision: 12, scale: 2, mode: "number" }).notNull(),
    budgetCurrency: varchar("budget_currency", { length: 3 }).notNull(),
    careerGoal: text("career_goal"),
    preferredCountries: text("preferred_countries")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    preferredIntake: text("preferred_intake"),
    workExperienceMonths: integer("work_experience_months"),
    ...timestamps,
  },
  (table) => [
    index("students_name_idx").on(table.name),
    check(
      "students_gpa_scale_positive",
      sql`${table.gpaScale} IS NULL OR ${table.gpaScale} > 0`
    ),
    check(
      "students_toefl_overall_range",
      sql`${table.toeflOverall} IS NULL OR (${table.toeflOverall} >= 0 AND ${table.toeflOverall} <= 120)`
    ),
  ]
);

// ---------------------------------------------------------------------------
// counselling_sessions
// ---------------------------------------------------------------------------

export const counsellingSessions = pgTable(
  "counselling_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    // Authenticated counsellor identity (FK to better-auth user).
    // Deleting a counsellor is blocked while sessions reference them —
    // history is never silently orphaned or reassigned.
    counsellorId: text("counsellor_id")
      .notNull()
      .references(() => authUser.id),
    startedAt: timestamp("started_at", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true, mode: "date" }),
    /**
     * Immutable student profile copy taken at session start. Historical
     * truth — never recomputed, never backfilled.
     */
    studentSnapshot: jsonb("student_snapshot"),
    ...timestamps,
  },
  (table) => [index("counselling_sessions_student_id_idx").on(table.studentId)]
);

// ---------------------------------------------------------------------------
// session_recommendations
// ---------------------------------------------------------------------------

export const recommendationActionEnum = pgEnum("recommendation_action", [
  "recommended",
  "shortlisted",
  "rejected",
  "discussed",
]);

export const sessionRecommendations = pgTable(
  "session_recommendations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => counsellingSessions.id, { onDelete: "cascade" }),
    // Reference only (no cascade): the jsonb snapshot below must survive
    // course catalogue changes and deletions.
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id),
    score: integer("score").notNull(),
    action: recommendationActionEnum("action").notNull().default("recommended"),
    /** 1-based rank at snapshot time. */
    rank: integer("rank"),
    eligibility: text("eligibility"),
    /** Score breakdown ({ academic, career, budget, eligibility, country, intake }). */
    breakdown: jsonb("breakdown"),
    /** { reasons, warnings } evidence arrays. */
    evidence: jsonb("evidence"),
    /** Full course display snapshot (name, university, cost, source, …). */
    courseSnapshot: jsonb("course_snapshot"),
    estimatedCost: jsonb("estimated_cost"),
    ...timestamps,
  },
  (table) => [
    check(
      "session_recommendations_score_range",
      sql`${table.score} >= 0 AND ${table.score} <= 100`
    ),
    index("session_recommendations_session_id_idx").on(table.sessionId),
    index("session_recommendations_course_id_idx").on(table.courseId),
  ]
);

// ---------------------------------------------------------------------------
// session_notes
// ---------------------------------------------------------------------------

export const sessionNotes = pgTable(
  "session_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => counsellingSessions.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    ...timestamps,
  },
  (table) => [index("session_notes_session_id_idx").on(table.sessionId)]
);

// ---------------------------------------------------------------------------
// session_questions — Next Best Question snapshots (immutable)
// ---------------------------------------------------------------------------

export const sessionQuestions = pgTable(
  "session_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => counsellingSessions.id, { onDelete: "cascade" }),
    field: text("field").notNull(),
    priority: text("priority").notNull(),
    impactScore: integer("impact_score").notNull(),
    affectedCount: integer("affected_count").notNull(),
    affectedPercentage: integer("affected_percentage").notNull(),
    question: text("question").notNull(),
    reason: text("reason").notNull(),
    ...timestamps,
  },
  (table) => [index("session_questions_session_id_idx").on(table.sessionId)]
);

// ---------------------------------------------------------------------------
// session_simulations — What-If snapshots (immutable, jsonb payloads)
// ---------------------------------------------------------------------------

export const sessionSimulations = pgTable(
  "session_simulations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => counsellingSessions.id, { onDelete: "cascade" }),
    /** The overrides that produced this scenario. */
    overrides: jsonb("overrides").notNull(),
    /** Full baseline recommendation list at simulation time. */
    baseline: jsonb("baseline").notNull(),
    /** Full simulated recommendation list at simulation time. */
    simulated: jsonb("simulated").notNull(),
    /** Diff changes + summary. */
    result: jsonb("result").notNull(),
    ...timestamps,
  },
  (table) => [index("session_simulations_session_id_idx").on(table.sessionId)]
);

// ---------------------------------------------------------------------------
// session_comparisons — comparison snapshots (immutable, jsonb payloads)
// ---------------------------------------------------------------------------

export const sessionComparisons = pgTable(
  "session_comparisons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => counsellingSessions.id, { onDelete: "cascade" }),
    /** Course display snapshots (no live recomputation on read). */
    courses: jsonb("courses").notNull(),
    ...timestamps,
  },
  (table) => [index("session_comparisons_session_id_idx").on(table.sessionId)]
);

// ---------------------------------------------------------------------------
// relations
// ---------------------------------------------------------------------------

export const universitiesRelations = relations(universities, ({ many }) => ({
  courses: many(courses),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  university: one(universities, {
    fields: [courses.universityId],
    references: [universities.id],
  }),
  sessionRecommendations: many(sessionRecommendations),
}));

export const studentsRelations = relations(students, ({ many }) => ({
  sessions: many(counsellingSessions),
}));

export const counsellingSessionsRelations = relations(
  counsellingSessions,
  ({ one, many }) => ({
    student: one(students, {
      fields: [counsellingSessions.studentId],
      references: [students.id],
    }),
    recommendations: many(sessionRecommendations),
    notes: many(sessionNotes),
    questions: many(sessionQuestions),
    simulations: many(sessionSimulations),
    comparisons: many(sessionComparisons),
  })
);

export const sessionRecommendationsRelations = relations(
  sessionRecommendations,
  ({ one }) => ({
    session: one(counsellingSessions, {
      fields: [sessionRecommendations.sessionId],
      references: [counsellingSessions.id],
    }),
    course: one(courses, {
      fields: [sessionRecommendations.courseId],
      references: [courses.id],
    }),
  })
);

export const sessionNotesRelations = relations(sessionNotes, ({ one }) => ({
  session: one(counsellingSessions, {
    fields: [sessionNotes.sessionId],
    references: [counsellingSessions.id],
  }),
}));

// ---------------------------------------------------------------------------
// inferred types
// ---------------------------------------------------------------------------

export type University = typeof universities.$inferSelect;
export type NewUniversity = typeof universities.$inferInsert;
export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
export type CounsellingSession = typeof counsellingSessions.$inferSelect;
export type NewCounsellingSession = typeof counsellingSessions.$inferInsert;
export type SessionRecommendation =
  typeof sessionRecommendations.$inferSelect;
export type NewSessionRecommendation =
  typeof sessionRecommendations.$inferInsert;
export type SessionNote = typeof sessionNotes.$inferSelect;
export type NewSessionNote = typeof sessionNotes.$inferInsert;
export type SessionQuestion = typeof sessionQuestions.$inferSelect;
export type NewSessionQuestion = typeof sessionQuestions.$inferInsert;
export type SessionSimulation = typeof sessionSimulations.$inferSelect;
export type NewSessionSimulation = typeof sessionSimulations.$inferInsert;
export type SessionComparison = typeof sessionComparisons.$inferSelect;
export type NewSessionComparison = typeof sessionComparisons.$inferInsert;

// ---------------------------------------------------------------------------
// better-auth tables (owned by the auth library; included here so they flow
// through the versioned migrations — see db/auth-schema.ts)
// ---------------------------------------------------------------------------

export {
  authAccount,
  authSession,
  authVerification,
  type AuthUser,
} from "./auth-schema.js";

/** Re-exported for seed/tests that reference the counsellor table. */
export { authUser };
