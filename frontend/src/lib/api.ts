import type {
  ApiCatalogueMeta,
  ApiCatalogueResponse,
  ApiCourseDetailsResponse,
  ApiNextQuestionResponse,
  ApiRecommendationsResponse,
  ApiResumeDetail,
  ApiSessionDetail,
  ApiSessionSummary,
  ApiSimulationOverrides,
  ApiSimulationResponse,
  ApiStudentResponse,
  ApiStudentSummary,
} from "./api-types";

/**
 * Backend API client (Milestone 6). Thin typed fetch wrappers only —
 * the frontend never computes scores, eligibility, or rankings.
 */

const SERVER_BACKEND_URL =
  process.env["BACKEND_API_URL"] ?? "http://localhost:4000";

/** Server uses BACKEND_API_URL; the browser rides the same-origin /api proxy. */
export function backendBaseUrl(): string {
  if (typeof window !== "undefined") {
    // Same-origin proxy (see next.config.ts rewrites): no CORS,
    // first-party auth cookies.
    return "";
  }
  return SERVER_BACKEND_URL;
}

/** Seeded demo student used by the workspace until student selection lands. */
export const DEMO_STUDENT_ID =
  process.env["WORKSPACE_STUDENT_ID"] ??
  "66666666-6666-4366-8366-666666666666";

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * Server Components render without browser cookies, so pages that need
 * counsellor-scoped data forward them explicitly via `options.cookie`
 * (read with `next/headers`). Browser calls authenticate with
 * `credentials: "include"` instead.
 */
export interface ApiRequestOptions {
  cookie?: string;
}

async function getJson<T>(path: string, options?: ApiRequestOptions): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${backendBaseUrl()}${path}`, {
      cache: "no-store",
      credentials: "include",
      ...(options?.cookie != null ? { headers: { cookie: options.cookie } } : {}),
    });
  } catch {
    throw new ApiError(0, "Recommendation service is unreachable.");
  }
  if (!response.ok) {
    if (response.status === 404) {
      throw new ApiError(404, "Student not found.");
    }
    throw new ApiError(response.status, "Recommendation service returned an error.");
  }
  const data: unknown = await response.json();
  if (data == null || typeof data !== "object") {
    throw new ApiError(502, "Recommendation service returned a malformed response.");
  }
  return data as T;
}

function assertRecommendations(
  data: ApiRecommendationsResponse
): asserts data is ApiRecommendationsResponse {
  if (!Array.isArray(data.recommendations)) {
    throw new ApiError(502, "Recommendation service returned a malformed response.");
  }
}

export async function getStudent(studentId: string): Promise<ApiStudentResponse> {
  const data = await getJson<ApiStudentResponse>(`/api/students/${studentId}`);
  if (data.student == null || typeof data.student !== "object") {
    throw new ApiError(502, "Recommendation service returned a malformed response.");
  }
  return data;
}

export async function getRecommendations(
  studentId: string
): Promise<ApiRecommendationsResponse> {
  const data = await getJson<ApiRecommendationsResponse>(
    `/api/students/${studentId}/recommendations`
  );
  assertRecommendations(data);
  return data;
}

export async function getNextQuestion(
  studentId: string
): Promise<ApiNextQuestionResponse> {
  const data = await getJson<ApiNextQuestionResponse>(
    `/api/students/${studentId}/next-question`
  );
  if ("status" in data && data.status === "complete") return data;
  if (
    "field" in data &&
    typeof data.field === "string" &&
    typeof data.question === "string" &&
    typeof data.reason === "string"
  ) {
    return data;
  }
  throw new ApiError(502, "Recommendation service returned a malformed response.");
}

export async function simulateRecommendations(  studentId: string,
  overrides: ApiSimulationOverrides
): Promise<ApiSimulationResponse> {
  let response: Response;
  try {
    response = await fetch(
      `${backendBaseUrl()}/api/students/${studentId}/recommendations/simulate`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrides }),
      }
    );
  } catch {
    throw new ApiError(0, "Recommendation service is unreachable.");
  }
  if (response.status === 404) {
    throw new ApiError(404, "Student not found.");
  }
  if (response.status === 400) {
    throw new ApiError(400, "Some scenario values are invalid. Check them and try again.");
  }
  if (!response.ok) {
    throw new ApiError(response.status, "Scenario simulation failed.");
  }
  const data: unknown = await response.json();
  if (data == null || typeof data !== "object" || !("changes" in data)) {
    throw new ApiError(502, "Recommendation service returned a malformed response.");
  }
  return data as ApiSimulationResponse;
}

export async function getCourseDetails(
  courseId: string
): Promise<ApiCourseDetailsResponse> {
  const data = await getJson<ApiCourseDetailsResponse>(
    `/api/courses/${courseId}`
  );
  if (data.course == null || typeof data.course !== "object") {
    throw new ApiError(502, "Recommendation service returned a malformed response.");
  }
  return data;
}

export interface CatalogueQuery {
  search?: string;
  country?: string;
  field?: string;
  degree?: string;
  intake?: string;
  currency?: string;
}

export async function listCatalogue(
  query: CatalogueQuery = {}
): Promise<ApiCatalogueResponse> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value != null && value !== "") params.set(key, value);
  }
  params.set("limit", "200");
  const data = await getJson<ApiCatalogueResponse>(
    `/api/courses?${params.toString()}`
  );
  if (!Array.isArray(data.courses)) {
    throw new ApiError(502, "Recommendation service returned a malformed response.");
  }
  return data;
}

export async function getCatalogueMeta(): Promise<ApiCatalogueMeta> {
  return getJson<ApiCatalogueMeta>("/api/courses/meta");
}

async function postJson<T>(path: string, body: unknown, options?: ApiRequestOptions): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${backendBaseUrl()}${path}`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options?.cookie != null ? { cookie: options.cookie } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "Recommendation service is unreachable.");
  }
  if (response.status === 404) {
    throw new ApiError(404, "Not found.");
  }
  if (response.status === 400) {
    const data = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new ApiError(400, data?.error ?? "Invalid request.");
  }
  if (!response.ok) {
    throw new ApiError(response.status, "Recommendation service returned an error.");
  }
  return (await response.json()) as T;
}

export async function createSession(
  studentId: string
): Promise<{ session: ApiSessionSummary }> {
  return postJson(`/api/students/${studentId}/sessions`, {});
}

/** Partial profile update — the "answer the next-best-question" write path. */
export interface UpdateStudentPatch {
  gpaValue?: number;
  gpaScale?: number;
  ieltsOverall?: number | null;
  toeflOverall?: number | null;
  budgetAmount?: number | null;
  budgetCurrency?: string | null;
  careerGoal?: string | null;
  preferredCountries?: string[];
  preferredIntake?: string | null;
  workExperienceMonths?: number | null;
}

export async function updateStudent(
  studentId: string,
  patch: UpdateStudentPatch
): Promise<ApiStudentResponse> {
  let response: Response;
  try {
    response = await fetch(`${backendBaseUrl()}/api/students/${studentId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  } catch {
    throw new ApiError(0, "Recommendation service is unreachable.");
  }
  if (response.status === 404) {
    throw new ApiError(404, "Student not found.");
  }
  if (response.status === 400 || response.status === 401) {
    const data = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new ApiError(
      response.status,
      data?.error ?? "Could not save the answer."
    );
  }
  if (!response.ok) {
    throw new ApiError(response.status, "Could not save the answer.");
  }
  return (await response.json()) as ApiStudentResponse;
}export async function listSessions(
  studentId: string,
  options?: ApiRequestOptions
): Promise<{ sessions: ApiSessionSummary[] }> {
  return getJson(`/api/students/${studentId}/sessions`, options);
}

export async function getSessionDetail(
  sessionId: string,
  options?: ApiRequestOptions
): Promise<ApiSessionDetail> {
  return getJson(`/api/sessions/${sessionId}`, options);
}

export async function endSession(
  sessionId: string
): Promise<{ session: ApiSessionSummary }> {
  return postJson(`/api/sessions/${sessionId}/end`, {});
}

export async function addSessionNote(
  sessionId: string,
  content: string
): Promise<{ note: { id: string; content: string } }> {
  return postJson(`/api/sessions/${sessionId}/notes`, { content });
}

export async function saveSessionSimulation(
  sessionId: string,
  overrides: ApiSimulationOverrides
): Promise<unknown> {
  return postJson(`/api/sessions/${sessionId}/simulations`, { overrides });
}

export async function saveSessionComparison(
  sessionId: string,
  courseIds: string[]
): Promise<unknown> {
  return postJson(`/api/sessions/${sessionId}/comparisons`, { courseIds });
}

export interface ResumeConfirmProfile {
  degree?: string;
  field?: string;
  gpaValue?: number;
  gpaScale?: number;
  ieltsOverall?: number;
  toeflOverall?: number;
  workExperienceMonths?: number;
  careerGoal?: string | null;
  budgetAmount?: number | null;
  budgetCurrency?: string | null;
  preferredCountries?: string[];
  preferredIntake?: string | null;
}

export interface ResumeConfirmBody {
  studentId?: string;
  createStudent?: { name: string };
  profile: ResumeConfirmProfile;
  fieldSources: Record<string, "resume" | "manual">;
}

/**
 * Resume + student management (Milestone 13). Unlike the public catalogue
 * calls above, these are counsellor-scoped, so cookies ride along.
 */
async function authedFetch(path: string, init: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`${backendBaseUrl()}${path}`, {
      ...init,
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "Recommendation service is unreachable.");
  }
  return response;
}

function errorMessage(status: number, fallback: string): never {
  throw new ApiError(status, fallback);
}

export async function uploadResume(
  file: File,
  studentId?: string
): Promise<{ resume: ApiResumeDetail }> {
  const form = new FormData();
  form.append("resume", file, file.name);
  if (studentId != null) form.append("studentId", studentId);
  const response = await authedFetch("/api/resumes/upload", {
    method: "POST",
    body: form,
  });
  if (response.status === 400 || response.status === 422) {
    const data = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new ApiError(response.status, data?.error ?? "Could not process the resume.");
  }
  if (response.status === 404) throw new ApiError(404, "Student not found.");
  if (!response.ok) errorMessage(response.status, "Recommendation service returned an error.");
  return (await response.json()) as { resume: ApiResumeDetail };
}

export async function getResumeDetail(
  id: string
): Promise<{ resume: ApiResumeDetail }> {
  const response = await authedFetch(`/api/resumes/${id}`, { method: "GET" });
  if (response.status === 404) throw new ApiError(404, "Resume not found.");
  if (!response.ok) errorMessage(response.status, "Recommendation service returned an error.");
  return (await response.json()) as { resume: ApiResumeDetail };
}

export async function confirmResume(
  id: string,
  body: ResumeConfirmBody
): Promise<{ studentId: string; student: import("./api-types").ApiStudent }> {
  const response = await authedFetch(`/api/resumes/${id}/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (response.status === 400 || response.status === 404) {
    const data = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new ApiError(response.status, data?.error ?? "Could not confirm the profile.");
  }
  if (!response.ok) errorMessage(response.status, "Recommendation service returned an error.");
  return (await response.json()) as {
    studentId: string;
    student: import("./api-types").ApiStudent;
  };
}

export async function listStudents(
  options?: ApiRequestOptions
): Promise<{ students: ApiStudentSummary[] }> {  const response = await authedFetch("/api/students", {
    method: "GET",
    ...(options?.cookie != null ? { headers: { cookie: options.cookie } } : {}),
  });
  if (response.status === 401) throw new ApiError(401, "Authentication required.");
  if (!response.ok) errorMessage(response.status, "Recommendation service returned an error.");
  return (await response.json()) as { students: ApiStudentSummary[] };
}

/** Deadline reminders (counsellor-owned, dates are counsellor-entered). */
export interface ApiDeadline {
  id: string;
  studentId: string | null;
  studentName: string | null;
  title: string;
  dueDate: string;
  note: string | null;
  done: boolean;
}

export interface CreateDeadlineBody {
  title: string;
  dueDate: string;
  studentId?: string | null;
  note?: string | null;
}

async function deadlineRequest<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${backendBaseUrl()}${path}`, {
      ...init,
      credentials: "include",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(0, "Recommendation service is unreachable.");
  }
  if (response.status === 401) throw new ApiError(401, "Authentication required.");
  if (response.status === 404) throw new ApiError(404, "Not found.");
  if (response.status === 400) {
    const data = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new ApiError(400, data?.error ?? "Invalid request.");
  }
  if (!response.ok) {
    throw new ApiError(response.status, "Recommendation service returned an error.");
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function listDeadlines(
  options?: ApiRequestOptions
): Promise<{ deadlines: ApiDeadline[] }> {
  return deadlineRequest("/api/deadlines", {
    method: "GET",
    ...(options?.cookie != null ? { headers: { cookie: options.cookie } } : {}),
  });
}

export async function createDeadline(
  body: CreateDeadlineBody
): Promise<{ deadline: ApiDeadline }> {
  return deadlineRequest("/api/deadlines", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function setDeadlineDone(
  deadlineId: string,
  done: boolean
): Promise<{ deadline: ApiDeadline }> {
  return deadlineRequest(`/api/deadlines/${deadlineId}`, {
    method: "PATCH",
    body: JSON.stringify({ done }),
  });
}

export async function deleteDeadline(deadlineId: string): Promise<void> {
  await deadlineRequest<void>(`/api/deadlines/${deadlineId}`, {
    method: "DELETE",
  });
}
