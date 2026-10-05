import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * GradGuide Copilot — relational schema (Milestone 2).
 *
 * Design notes:
 * - UUID primary keys everywhere; timestamptz created/updated on every table.
 * - Money uses numeric(12,2); GPA numeric(3,2); IELTS numeric(2,1).
 * - Free-form lists that are only ever filtered/matched as sets
 *   (career tags, intakes, countries, academic backgrounds) are text[].
 *   Nothing relational is hidden in JSON.
 * - The only enum is session_recommendations.action, whose values are
 *   fixed by the product spec. Degree types / currencies stay as text
 *   because their value sets are open-ended (MSc, MA, MBA, … / ISO codes).
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
    durationMonths: integer("duration_months").notNull(),
    tuitionAmount: numeric("tuition_amount", { precision: 12, scale: 2, mode: "number" }).notNull(),
    tuitionCurrency: varchar("tuition_currency", { length: 3 }).notNull(),
    livingCostAmount: numeric("living_cost_amount", { precision: 12, scale: 2, mode: "number" }),
    livingCostCurrency: varchar("living_cost_currency", { length: 3 }),
    intakes: text("intakes")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    minGpa: numeric("min_gpa", { precision: 3, scale: 2, mode: "number" }),
    minIeltsOverall: numeric("min_ielts_overall", { precision: 2, scale: 1, mode: "number" }),
    minIeltsWriting: numeric("min_ielts_writing", { precision: 2, scale: 1, mode: "number" }),
    minIeltsReading: numeric("min_ielts_reading", { precision: 2, scale: 1, mode: "number" }),
    minIeltsListening: numeric("min_ielts_listening", { precision: 2, scale: 1, mode: "number" }),
    minIeltsSpeaking: numeric("min_ielts_speaking", { precision: 2, scale: 1, mode: "number" }),
    workExperienceRequired: boolean("work_experience_required")
      .notNull()
      .default(false),
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
    ieltsOverall: numeric("ielts_overall", { precision: 2, scale: 1, mode: "number" }),
    ieltsWriting: numeric("ielts_writing", { precision: 2, scale: 1, mode: "number" }),
    ieltsReading: numeric("ielts_reading", { precision: 2, scale: 1, mode: "number" }),
    ieltsListening: numeric("ielts_listening", { precision: 2, scale: 1, mode: "number" }),
    ieltsSpeaking: numeric("ielts_speaking", { precision: 2, scale: 1, mode: "number" }),
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
  (table) => [index("students_name_idx").on(table.name)]
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
    // Plain string until authentication lands (later milestone).
    counsellorId: text("counsellor_id").notNull(),
    startedAt: timestamp("started_at", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true, mode: "date" }),
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
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    action: recommendationActionEnum("action").notNull().default("recommended"),
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
